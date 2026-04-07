const express = require('express');
const router = express.Router();
const classroomController = require('../controllers/classroomController');
const { auth, teacherOnly } = require('../middleware/auth');

router.post('/', auth, teacherOnly, classroomController.createClassroom);
router.get('/', auth, classroomController.getAllClassrooms);
router.get('/:id', auth, classroomController.getClassroom);

module.exports = router;