const Lecture = require('../models/Lecture');
const Classroom = require('../models/Classroom');
const User = require('../models/User');
const mqttClient = require('../config/mqtt');
const { sendNotificationToUsers } = require('./pushController');

// Helper function to generate random password
function generateAttendancePassword() {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous chars
  let password = '';
  for (let i = 0; i < 6; i++) {
    password += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return password;
}

exports.createLecture = async (req, res) => {
  try {
    const { classroomId, subject, description, startTime, duration, studentIds } = req.body;

    // Validate classroom
    const classroom = await Classroom.findById(classroomId);
    if (!classroom) {
      return res.status(404).json({ error: 'Classroom not found' });
    }

    // Calculate end time
    const start = new Date(startTime);
    const end = new Date(start.getTime() + duration * 60000);

    // Check if time is in the future
    if (start <= new Date()) {
      return res.status(400).json({ 
        error: 'Cannot schedule lecture in the past' 
      });
    }

    // IMPROVED CONFLICT CHECK - Check for ANY overlap
    const conflictingLecture = await Lecture.findOne({
      classroom: classroomId,
      status: { $in: ['scheduled', 'active'] },
      $or: [
        // New lecture starts during an existing lecture
        {
          startTime: { $lte: start },
          endTime: { $gt: start }
        },
        // New lecture ends during an existing lecture
        {
          startTime: { $lt: end },
          endTime: { $gte: end }
        },
        // New lecture completely contains an existing lecture
        {
          startTime: { $gte: start },
          endTime: { $lte: end }
        },
        // Existing lecture completely contains new lecture
        {
          startTime: { $lte: start },
          endTime: { $gte: end }
        }
      ]
    }).populate('teacher', 'name');

    if (conflictingLecture) {
      const conflictStart = new Date(conflictingLecture.startTime).toLocaleString();
      const conflictEnd = new Date(conflictingLecture.endTime).toLocaleString();
      
      return res.status(400).json({ 
        error: `This classroom is already booked from ${conflictStart} to ${conflictEnd} by ${conflictingLecture.teacher.name} for ${conflictingLecture.subject}` 
      });
    }
    // Generate unique attendance password
    const attendancePassword = generateAttendancePassword();

    const lecture = new Lecture({
      teacher: req.user._id,
      classroom: classroomId,
      subject,
      description,
      startTime: start,
      duration,
      endTime: end,
      students: studentIds || [],
      attendancePassword

    });

    await lecture.save();

    const populatedLecture = await Lecture.findById(lecture._id)
      .populate('classroom', 'name roomNumber building')
      .populate('teacher', 'name email');
    if (studentIds && studentIds.length > 0) {
      console.log('📤 Sending notifications to enrolled students...');
      
      const notificationPayload = {
        title: '📚 New Lecture Scheduled',
        body: `${subject} in ${populatedLecture.classroom.name}`,
        icon: '/logo.png',
        badge: '/logo.png',
        data: {
          url: `/lecture/${lecture._id}`
        },
        color: '#3b82f6' 
      };

      // Send notifications (don't wait for completion)
      sendNotificationToUsers(studentIds, notificationPayload)
        .then(result => {
          console.log(`✅ Notifications sent to ${result.sent} subscriptions`);
        })
        .catch(error => {
          console.error('Error sending notifications:', error);
        });
    }
    res.status(201).json({
      message: 'Lecture scheduled successfully',
      lecture: populatedLecture
    });
  } catch (error) {
    console.error('Create lecture error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getMyLectures = async (req, res) => {
  try {
    const now = new Date();
    let query;

    if (req.user.role === 'teacher') {
      query = { teacher: req.user._id };
    } else {
      query = { students: req.user._id };
    }

    const lectures = await Lecture.find(query)
      .populate('classroom', 'name roomNumber building floor')
      .populate('teacher', 'name email department')
      .sort({ startTime: 1 });

    const upcomingLectures = lectures.filter(l => 
      new Date(l.startTime) > now && l.status !== 'cancelled'
    );

    const pastLectures = lectures.filter(l => 
      new Date(l.endTime) < now || l.status === 'completed' || l.status === 'cancelled'
    );

    const activeLectures = lectures.filter(l => 
      l.status === 'active'
    );

    res.json({ 
      lectures,
      upcomingLectures,
      pastLectures,
      activeLectures
    });
  } catch (error) {
    console.error('Get lectures error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getLecture = async (req, res) => {
  try {
    const lecture = await Lecture.findById(req.params.id)
      .populate('classroom', 'name roomNumber building floor capacity')
      .populate('teacher', 'name email phone department')
      .populate('students', 'name email');

    if (!lecture) {
      return res.status(404).json({ error: 'Lecture not found' });
    }
    // Create response object
    const lectureData = lecture.toObject();

    // NEW: Hide password from students
    if (req.user.role === 'student') {
      delete lectureData.attendancePassword;
    }

    res.json({ lecture });
  } catch (error) {
    console.error('Get lecture error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.activateLecture = async (req, res) => {
  try {
    const lecture = await Lecture.findById(req.params.id)
      .populate('classroom');

    if (!lecture) {
      return res.status(404).json({ error: 'Lecture not found' });
    }

    if (lecture.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        error: 'Only the assigned teacher can activate this lecture' 
      });
    }

    // Send MQTT command
    const command = {
      action: 'POWER_ON',
      duration: lecture.duration,
      lectureId: lecture._id.toString(),
      timestamp: new Date().toISOString()
    };

    mqttClient.publish(
      lecture.classroom.mqttTopic, 
      JSON.stringify(command),
      { qos: 1, retain: false }
    );

    lecture.status = 'active';
    lecture.powerActivated = true;
    await lecture.save();

    console.log(`✅ Lecture activated: ${lecture._id} in ${lecture.classroom.name}`);

    res.json({
      message: 'Classroom power activated successfully',
      lecture
    });
  } catch (error) {
    console.error('Activate lecture error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.deactivateLecture = async (req, res) => {
  try {
    const lecture = await Lecture.findById(req.params.id)
      .populate('classroom');

    if (!lecture) {
      return res.status(404).json({ error: 'Lecture not found' });
    }

    if (lecture.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        error: 'Only the assigned teacher can deactivate this lecture' 
      });
    }

    // Send MQTT command
    const command = {
      action: 'POWER_OFF',
      lectureId: lecture._id.toString(),
      timestamp: new Date().toISOString()
    };

    mqttClient.publish(
      lecture.classroom.mqttTopic, 
      JSON.stringify(command),
      { qos: 1, retain: false }
    );

    lecture.status = 'completed';
    lecture.powerDeactivated = true;
    await lecture.save();

    console.log(`✅ Lecture deactivated: ${lecture._id}`);

    res.json({
      message: 'Classroom power deactivated successfully',
      lecture
    });
  } catch (error) {
    console.error('Deactivate lecture error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.cancelLecture = async (req, res) => {
  try {
    const lecture = await Lecture.findById(req.params.id);

    if (!lecture) {
      return res.status(404).json({ error: 'Lecture not found' });
    }

    if (lecture.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        error: 'Only the assigned teacher can cancel this lecture' 
      });
    }

    lecture.status = 'cancelled';
    await lecture.save();

    res.json({
      message: 'Lecture cancelled successfully',
      lecture
    });
  } catch (error) {
    console.error('Cancel lecture error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
exports.searchLectures = async (req, res) => {
  try {
    const { query, date, classroom, status } = req.query;

    // Build search filter
    let filter = {};

    // Role-based filtering
    if (req.user.role === 'teacher') {
      filter.teacher = req.user._id;
    } else if (req.user.role === 'student') {
      filter.students = req.user._id;
    }

    // Text search (subject, description)
    if (query && query.trim() !== '') {
      filter.$or = [
        { subject: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ];
    }

    // Date filter
    if (date) {
      const searchDate = new Date(date);
      const nextDay = new Date(searchDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      filter.startTime = {
        $gte: searchDate,
        $lt: nextDay
      };
    }

    // Classroom filter
    if (classroom) {
      filter.classroom = classroom;
    }

    // Status filter
    if (status) {
      filter.status = status;
    }

    const lectures = await Lecture.find(filter)
      .populate('classroom', 'name roomNumber building floor')
      .populate('teacher', 'name email department')
      .sort({ startTime: 1 });

    res.json({ 
      lectures,
      count: lectures.length 
    });
  } catch (error) {
    console.error('Search lectures error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};