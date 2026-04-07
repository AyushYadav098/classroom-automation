const mongoose = require('mongoose');

const classroomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  roomNumber: {
    type: String,
    required: true,
    unique: true
  },
  building: String,
  floor: Number,
  capacity: Number,
  esp32Id: {
    type: String,
    required: true,
    unique: true
  },
  mqttTopic: {
    type: String,
    required: true
  },
  wifiSSID: { type: String },
  wifiPassword: { type: String },
  capacity: Number,
  isActive: {
    type: Boolean,
    default: true
  },
  // NEW: WiFi Network Information
  wifiSSID: {
    type: String,
    required: true // WiFi name the classroom is on
  },
  wifiSubnet: {
    type: String, // e.g., "192.168.1"
  },
  lastSeen: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Classroom', classroomSchema);