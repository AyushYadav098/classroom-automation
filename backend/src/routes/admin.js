const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { auth, adminOnly } = require('../middleware/auth');

router.use(auth);
router.use(adminOnly);

router.get('/dashboard/stats', adminController.getDashboardStats);
router.get('/users/pending', adminController.getPendingUsers);
router.post('/users/:userId/approve', adminController.approveUser);
router.post('/users/:userId/reject', adminController.rejectUser);
// Classroom Management Routes
router.get('/classrooms', adminController.getAllClassrooms);
router.post('/classrooms', adminController.createClassroom);
router.delete('/classrooms/:classroomId', adminController.deleteClassroom);
// New User Management Routes
router.get('/users/approved', adminController.getApprovedUsers);
router.delete('/users/:userId', adminController.deleteUser);

// New Classroom Toggle Route
router.put('/classrooms/:classroomId/toggle', adminController.toggleClassroomStatus);

// New Lecture Routes
router.get('/lectures', adminController.getAllLectures);
router.delete('/lectures/:lectureId', adminController.deleteLecture);
// Emergency Lecture Override Route
router.post('/lectures/:lectureId/override-power', adminController.overrideLecturePower);

module.exports = router;