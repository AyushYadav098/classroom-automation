const User = require('../models/User');
const Lecture = require('../models/Lecture');
const Classroom = require('../models/Classroom');
const mqttClient = require('../config/mqtt');

exports.getDashboardStats = async (req, res) => {
  try {
    const stats = await Promise.all([
      User.countDocuments({ role: 'student', status: 'approved' }),
      User.countDocuments({ role: 'teacher', status: 'approved' }),
      User.countDocuments({ status: 'pending' }),
      Lecture.countDocuments({ status: 'active' })
    ]);
    res.json({
      students: stats[0], teachers: stats[1], pending: stats[2], activeLectures: stats[3]
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
};

exports.getPendingUsers = async (req, res) => {
  try {
    const users = await User.find({ status: 'pending' }).select('-password -faceDescriptor').sort({ createdAt: -1 });
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pending users' });
  }
};

exports.approveUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    user.status = 'approved';
    user.approvedBy = req.user._id;
    user.approvedAt = new Date();
    await user.save();
    res.json({ message: 'User approved' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve user' });
  }
};

exports.rejectUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    user.status = 'rejected';
    await user.save();
    res.json({ message: 'User rejected' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject user' });
  }
};
// ========================================
// CLASSROOM MANAGEMENT
// ========================================

exports.getAllClassrooms = async (req, res) => {
  try {
    const classrooms = await Classroom.find().sort({ building: 1, roomNumber: 1 });
    res.json({ classrooms });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch classrooms' });
  }
};

exports.createClassroom = async (req, res) => {
  try {
    const classroom = new Classroom({ ...req.body, isActive: true });
    await classroom.save();
    res.status(201).json({ classroom });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create classroom' });
  }
};

exports.deleteClassroom = async (req, res) => {
  try {
    await Classroom.findByIdAndDelete(req.params.classroomId);
    res.json({ message: 'Classroom deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete classroom' });
  }
};
// ========================================
// EXTENDED USER MANAGEMENT (Students/Teachers)
// ========================================
exports.getApprovedUsers = async (req, res) => {
  try {
    const students = await User.find({ role: 'student', status: 'approved' });
    const teachers = await User.find({ role: 'teacher', status: 'approved' });
    res.json({ students, teachers });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.userId);
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

// ========================================
// CLASSROOM STATUS TOGGLE
// ========================================
exports.toggleClassroomStatus = async (req, res) => {
  try {
    const room = await Classroom.findById(req.params.classroomId);
    room.isActive = !room.isActive; // Flips it from true to false, or false to true
    await room.save();
    res.json({ message: 'Classroom status updated', room });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update classroom' });
  }
};

// ========================================
// LECTURE MANAGEMENT
// ========================================
exports.getAllLectures = async (req, res) => {
  try {
    // Populate pulls the actual teacher name and classroom details instead of just the ID
    const lectures = await Lecture.find()
      .populate('teacher', 'name')
      .populate('classroom', 'name roomNumber mqttTopic isActive')
      .sort({ date: -1 }); 
    res.json({ lectures });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch lectures' });
  }
};

exports.deleteLecture = async (req, res) => {
  try {
    await Lecture.findByIdAndDelete(req.params.lectureId);
    res.json({ message: 'Lecture deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete lecture' });
  }
};
// ========================================
// EMERGENCY LECTURE POWER OVERRIDE
// ========================================
exports.overrideLecturePower = async (req, res) => {
  try {
    const lecture = await Lecture.findById(req.params.lectureId).populate('classroom');
    
    if (!lecture) {
      return res.status(404).json({ error: 'Lecture not found' });
    }

    // 1. Send the exact MQTT command your hardware expects
    const command = {
      action: 'POWER_OFF',
      lectureId: lecture._id.toString(),
      timestamp: new Date().toISOString(),
      adminOverride: true
    };

    mqttClient.publish(
      lecture.classroom.mqttTopic, 
      JSON.stringify(command),
      { qos: 1, retain: false }
    );

    // 2. Update the database so the Teacher Dashboard stays synced
    lecture.status = 'completed';
    lecture.powerDeactivated = true;
    await lecture.save();

    res.json({ message: `Emergency power cut command sent to ${lecture.classroom.name}` });
  } catch (error) {
    console.error('Override power error:', error);
    res.status(500).json({ error: 'Failed to override power' });
  }
};