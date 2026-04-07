const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { auth, teacherOnly } = require('../middleware/auth');

// Start attendance session
router.get('/:lectureId/start', auth, teacherOnly, attendanceController.startAttendance);

// Mark attendance via face recognition
router.post('/:lectureId/mark', auth, attendanceController.markAttendance);

// Get attendance list
router.get('/:lectureId', auth, attendanceController.getAttendance);

// Download PDF report
router.get('/:lectureId/pdf', auth, teacherOnly, attendanceController.downloadAttendancePDF);

module.exports = router;