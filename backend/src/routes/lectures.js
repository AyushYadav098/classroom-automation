const express = require('express');
const router = express.Router();
const lectureController = require('../controllers/lectureController');
const { auth, teacherOnly } = require('../middleware/auth');

router.post('/', auth, teacherOnly, lectureController.createLecture);
router.get('/my-lectures', auth, lectureController.getMyLectures);
router.get('/search', auth, lectureController.searchLectures); // ADD THIS LINE
router.get('/:id', auth, lectureController.getLecture);
router.post('/:id/activate', auth, teacherOnly, lectureController.activateLecture);
router.post('/:id/deactivate', auth, teacherOnly, lectureController.deactivateLecture);
router.post('/:id/cancel', auth, teacherOnly, lectureController.cancelLecture);

module.exports = router;