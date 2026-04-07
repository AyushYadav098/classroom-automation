const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Helper function to calculate face similarity
function euclideanDistance(desc1, desc2) {
  if (!desc1 || !desc2) return Infinity;
  if (desc1.length !== desc2.length) return Infinity;

  let sum = 0;
  for (let i = 0; i < desc1.length; i++) {
    const diff = desc1[i] - desc2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

exports.register = async (req, res) => {
  try {
    const { name, email, password, role, phone, department, year, rollNumber, faceDescriptor } = req.body;

    // Basic validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({ 
        error: 'Please provide all required fields' 
      });
    }

    // Validate student-specific fields
    if (role === 'student') {
      if (!department || !year || !rollNumber) {
        return res.status(400).json({ 
          error: 'Students must provide department, year, and roll number' 
        });
      }
      if (year < 1 || year > 6) {
        return res.status(400).json({ 
          error: 'Year must be between 1 and 6' 
        });
      }
      if (!faceDescriptor || !Array.isArray(faceDescriptor) || faceDescriptor.length === 0) {
        return res.status(400).json({ 
          error: 'Face registration is required for students' 
        });
      }

      // NEW: Check for duplicate face
      console.log('Checking for duplicate face...');
      const existingStudents = await User.find({ 
        role: 'student',
        faceDescriptor: { $exists: true, $ne: [] }
      });

      const DUPLICATE_THRESHOLD = 0.4; // Faces closer than this are considered duplicates
      
      for (const student of existingStudents) {
        const distance = euclideanDistance(faceDescriptor, student.faceDescriptor);
        console.log(`Comparing with ${student.name} (${student.rollNumber}): distance = ${distance.toFixed(4)}`);
        
        if (distance < DUPLICATE_THRESHOLD) {
          console.log('❌ Duplicate face detected!');
          return res.status(400).json({ 
            error: 'Face already registered',
            message: `This face is already registered under ${student.name} (${student.rollNumber}). Each student must use their own face.`,
            duplicateStudent: {
              name: student.name,
              rollNumber: student.rollNumber,
              department: student.department
            }
          });
        }
      }

      console.log('✅ Face is unique');
    }

    // Check if email exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        error: 'Email already registered' 
      });
    }

    // Check if roll number exists (for students)
    if (role === 'student') {
      const existingRoll = await User.findOne({ rollNumber, role: 'student' });
      if (existingRoll) {
        return res.status(400).json({ 
          error: 'Roll number already registered' 
        });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const userData = {
      name,
      email,
      password: hashedPassword,
      role,
      phone
    };

    // Add student-specific fields
    if (role === 'student') {
      userData.department = department;
      userData.year = year;
      userData.rollNumber = rollNumber;
      userData.faceDescriptor = faceDescriptor;
    }

    const user = new User(userData);
    await user.save();
    // Don't generate token. Send pending response.
    res.status(201).json({
      message: 'Registration submitted successfully! Please wait for admin approval.',
      status: 'pending'
    });
    
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
};

// ... rest of the controller

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Please provide email and password' 
      });
    }

    // Find user
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid email or password' 
      });
    }
    if (user.status === 'pending') {
      return res.status(403).json({ error: 'Account pending approval. Please check back later.' });
    }
    if (user.status === 'rejected') {
      return res.status(403).json({ error: 'Account rejected by admin.' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ 
        error: 'Invalid email or password' 
      });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user._id }, 
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        department: user.department,
        year: user.year
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
};

exports.getProfile = async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        phone: req.user.phone,
        department: req.user.department,
        year: req.user.year
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};