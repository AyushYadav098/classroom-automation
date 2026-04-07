const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  lecture: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lecture',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  markedAt: {
    type: Date,
    default: Date.now
  },
  markedBy: {
    type: String,
    enum: ['face_recognition', 'manual'],
    default: 'face_recognition'
  },
  confidence: {
    type: Number, // Face match confidence (0-1)
    default: 0
  }
});

// Prevent duplicate attendance for same lecture
attendanceSchema.index({ lecture: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);