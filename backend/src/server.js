require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const mqttClient = require('./config/mqtt');
const cron = require('node-cron');
const Lecture = require('./models/Lecture');

const app = express();

// ============================================
// CORS Configuration (Production Ready)
// ============================================
const allowedOrigins = [
  'http://localhost:3000',
  process.env.FRONTEND_URL // Will be set in Render dashboard
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like Postman or mobile apps) or if it's in our allowed list
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
connectDB();

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/classrooms', require('./routes/classrooms'));
app.use('/api/lectures', require('./routes/lectures'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/push', require('./routes/push'));
app.use('/api/admin', require('./routes/admin'));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    mongodb: 'Connected',
    mqtt: mqttClient.connected ? 'Connected' : 'Disconnected'
  });
});

// ============================================
// AUTO-ACTIVATION: Runs every minute
// ============================================
cron.schedule('* * * * *', async () => {
  try {
    const now = new Date();
    
    // Log cron execution (for debugging)
    console.log(`🔄 Cron running at: ${now.toISOString()}`);

    // Find lectures that should start now (within the last minute)
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    
    const lecturesToActivate = await Lecture.find({
      status: 'scheduled',
      startTime: { 
        $gte: oneMinuteAgo,
        $lte: now
      },
      powerActivated: false
    }).populate('classroom');

    if (lecturesToActivate.length > 0) {
      console.log(`\n📚 Found ${lecturesToActivate.length} lecture(s) to activate:`);
    }

    for (const lecture of lecturesToActivate) {
      try {
        const command = {
          action: 'POWER_ON',
          duration: lecture.duration,
          lectureId: lecture._id.toString(),
          timestamp: new Date().toISOString()
        };

        console.log(`\n🔌 Auto-activating lecture:`);
        console.log(`   Subject: ${lecture.subject}`);
        console.log(`   Classroom: ${lecture.classroom.name}`);
        console.log(`   Topic: ${lecture.classroom.mqttTopic}`);
        console.log(`   Duration: ${lecture.duration} minutes`);

        // Send MQTT command
        mqttClient.publish(
          lecture.classroom.mqttTopic,
          JSON.stringify(command),
          { qos: 1, retain: false }
        );

        // Update lecture status
        lecture.status = 'active';
        lecture.powerActivated = true;
        await lecture.save();

        console.log(`   ✅ Power activated successfully!`);

      } catch (error) {
        console.error(`   ❌ Failed to activate lecture ${lecture._id}:`, error.message);
      }
    }
  } catch (error) {
    console.error('❌ Cron job error:', error.message);
  }
});

// ============================================
// AUTO-DEACTIVATION: Runs every minute
// ============================================
cron.schedule('* * * * *', async () => {
  try {
    const now = new Date();

    const lecturesToDeactivate = await Lecture.find({
      status: 'active',
      endTime: { $lte: now },
      powerDeactivated: false
    }).populate('classroom');

    if (lecturesToDeactivate.length > 0) {
      console.log(`\n🔴 Found ${lecturesToDeactivate.length} lecture(s) to deactivate:`);
    }

    for (const lecture of lecturesToDeactivate) {
      try {
        const command = {
          action: 'POWER_OFF',
          lectureId: lecture._id.toString(),
          timestamp: new Date().toISOString()
        };

        console.log(`\n🔌 Auto-deactivating lecture:`);
        console.log(`   Subject: ${lecture.subject}`);
        console.log(`   Classroom: ${lecture.classroom.name}`);
        console.log(`   Topic: ${lecture.classroom.mqttTopic}`);

        // Send MQTT command
        mqttClient.publish(
          lecture.classroom.mqttTopic,
          JSON.stringify(command),
          { qos: 1, retain: false }
        );

        // Update lecture status
        lecture.status = 'completed';
        lecture.powerDeactivated = true;
        await lecture.save();

        console.log(`   ✅ Power deactivated successfully!`);

      } catch (error) {
        console.error(`   ❌ Failed to deactivate lecture ${lecture._id}:`, error.message);
      }
    }
  } catch (error) {
    console.error('❌ Auto-deactivate error:', error.message);
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ Auto-activation cron job is running`);
});