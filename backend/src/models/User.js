const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['teacher', 'student', 'admin'],
    required: true
  },
  phone: {
    type: String,
    trim: true
  },
  department: {
    type: String,
    trim: true,
    required: function() {
      return this.role === 'student';
    }
  },
  year: {
    type: Number,
    min: 1,
    max: 6,
    required: function() {
      return this.role === 'student';
    }
  },
  // NEW: Roll number for students
  rollNumber: {
    type: String,
    trim: true,
    required: function() {
      return this.role === 'student';
    }
  },
  // NEW: Face descriptor for face recognition
  faceDescriptor: {
    type: [Number], // Array of numbers (128 dimensions)
    required: function() {
      return this.role === 'student';
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  // Add these fields inside your userSchema definition:
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'suspended'],
    default: 'pending'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  rejectedReason: String,
});

module.exports = mongoose.model('User', userSchema);
userSchema.index({ status: 1, role: 1 });