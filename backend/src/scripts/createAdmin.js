const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const existingAdmin = await User.findOne({ role: 'admin' });
    
    if (existingAdmin) {
      console.log('❌ Admin already exists!');
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = new User({
      name: 'System Administrator',
      email: 'admin@institute.com',
      password: hashedPassword,
      role: 'admin',
      status: 'approved',
      approvedAt: new Date()
    });

    await admin.save();
    console.log('✅ Admin account created: admin@institute.com / admin123');
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
createAdmin();