const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No authentication token' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) return res.status(401).json({ error: 'User not found' });

    // Block unapproved users (unless they are the admin)
    if (user.status !== 'approved' && user.role !== 'admin') {
      return res.status(403).json({ error: 'Account not approved', status: user.status });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// NEW: Admin-only middleware
exports.adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admin only.' });
  }
  next();
};
// NEW: Teacher or Admin middleware
exports.teacherOnly = (req, res, next) => {
  // Allow if the user is a teacher OR an admin
  if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Access denied. Teachers or Admins only.' 
    });
  }
  next();
};