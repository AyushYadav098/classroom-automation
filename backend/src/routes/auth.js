const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const User = require('../models/User');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/profile', auth, authController.getProfile);

// Get students filtered by department and year
router.post('/students/filter', auth, async (req, res) => {
  try {
    const { departments, years } = req.body;

    let filter = { role: 'student' };

    // Add filters if provided
    if (departments && departments.length > 0) {
      filter.department = { $in: departments };
    }

    if (years && years.length > 0) {
      filter.year = { $in: years };
    }

    const students = await User.find(filter)
      .select('name email department year')
      .sort({ department: 1, year: 1, name: 1 });
    
    res.json({ 
      students,
      count: students.length 
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get unique departments and years (for filter dropdowns)
router.get('/students/metadata', auth, async (req, res) => {
  try {
    const departments = await User.distinct('department', { role: 'student' });
    const years = await User.distinct('year', { role: 'student' });
    
    res.json({ 
      departments: departments.filter(d => d).sort(),
      years: years.filter(y => y).sort()
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});
router.post('/update-face', auth, async (req, res) => {
  try {
    const { faceDescriptor } = req.body;

    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Only students can update face data' });
    }

    if (!faceDescriptor || !Array.isArray(faceDescriptor) || faceDescriptor.length !== 128) {
      return res.status(400).json({ error: 'Invalid face descriptor' });
    }

    // Update user's face
    await User.findByIdAndUpdate(req.user._id, {
      faceDescriptor: faceDescriptor
    });

    res.json({ message: 'Face updated successfully' });
  } catch (error) {
    console.error('Update face error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;