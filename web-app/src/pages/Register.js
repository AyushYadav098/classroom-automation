import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Input from '../components/Input';
import Button from '../components/Button';
import FaceCapture from '../components/FaceCapture';
import Logo from '../components/Logo'; // 👈 Imported Logo
import './Auth.css';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    role: 'student', phone: '', department: '', year: '', rollNumber: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showFaceCapture, setShowFaceCapture] = useState(false);
  const [faceData, setFaceData] = useState(null);
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      setError('Please fill in all required fields');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (formData.role === 'student') {
      if (!formData.department || !formData.year || !formData.rollNumber) {
        setError('Students must provide department, year, and roll number');
        return;
      }
      setShowFaceCapture(true);
      return;
    }
    await submitRegistration();
  };

  const handleFaceCapture = async (capturedData) => {
    setFaceData(capturedData);
    setShowFaceCapture(false);
    await submitRegistration(capturedData.descriptor);
  };

  const submitRegistration = async (faceDescriptor = null) => {
    setLoading(true);
    setError('');
    try {
      // 1. Properly map all the form data to send to the backend
      const userData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        phone: formData.phone,
      };

      // 2. Add student-specific fields if they are a student
      if (formData.role === 'student') {
        userData.department = formData.department;
        userData.year = Number(formData.year); // Converts "1" to an actual math number!
        userData.rollNumber = formData.rollNumber;
        userData.faceDescriptor = faceDescriptor;
      }

      // 3. Send it to the backend!
      await register(userData);
      
      // 4. Show success state instead of navigating
      alert('✅ Registration submitted!\n\nYour account is pending admin approval.');
      navigate('/login', { replace: true });
      
    } catch (err) {
      if (err.response?.data?.duplicateStudent) {
        const duplicate = err.response.data.duplicateStudent;
        setError(`This face is already registered!\n\nStudent: ${duplicate.name}\nRoll No: ${duplicate.rollNumber}\nDepartment: ${duplicate.department}\n\nEach student must use their own face for registration.`);
      } else {
        setError(err.response?.data?.error || err.response?.data?.message || 'Registration failed');
      }
      setShowFaceCapture(false);
      setFaceData(null);
    } finally {
      setLoading(false);
    }
  };

  if (showFaceCapture) {
    return (
      <div className="auth-container">
        <div className="glow-circle top-left"></div>
        <div className="glow-circle bottom-right"></div>
        <div className="face-capture-wrapper" style={{ position: 'relative', zIndex: 1 }}>
          <FaceCapture
            onCapture={handleFaceCapture}
            onCancel={() => setShowFaceCapture(false)}
            mode="registration"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      {/* 👈 Global Orbs */}
      <div className="glow-circle top-left"></div>
      <div className="glow-circle bottom-right"></div>

      <div className="auth-box" style={{ position: 'relative', zIndex: 1 }}>
        <div className="logo-container">
          <Logo className="auth-logo" /> {/* 👈 Replaced image tag */}
        </div>

        <h1 className="auth-title">Create Account</h1>
        <p className="auth-subtitle">Sign up to get started</p>

        <form onSubmit={handleSubmit}>
          {error && <div className="error-box">{error}</div>}

          <Input label="Full Name *" name="name" value={formData.name} onChange={handleChange} placeholder="Enter your full name" />
          <Input label="Email *" type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Enter your email" />

          <div className="input-container">
            <label className="input-label">Role *</label>
            <select name="role" value={formData.role} onChange={handleChange} className="input-field">
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
            </select>
          </div>

          <Input label="Phone" name="phone" value={formData.phone} onChange={handleChange} placeholder="Enter your phone number" />

          {formData.role === 'student' && (
            <>
              <Input label="Roll Number *" name="rollNumber" value={formData.rollNumber} onChange={handleChange} placeholder="e.g., 21CS001" required />
              <div className="input-container">
                <label className="input-label">Department *</label>
                <select name="department" value={formData.department} onChange={handleChange} className="input-field" required>
                  <option value="">Select Department</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Information Technology">Basic Science</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Mechanical">Mechanical</option>
                  <option value="Civil">Civil</option>
                  <option value="Electrical">Electrical</option>
                  <option value="Chemical">Chemical</option>
                  <option value="Biotechnology">Biotechnology</option>
                </select>
              </div>
              <div className="input-container">
                <label className="input-label">Year *</label>
                <select name="year" value={formData.year} onChange={handleChange} className="input-field" required>
                  <option value="">Select Year</option>
                  <option value="1">1st Year (B.Tech)</option>
                  <option value="2">2nd Year (B.Tech)</option>
                  <option value="3">3rd Year (B.Tech)</option>
                  <option value="4">4th Year (B.Tech)</option>
                  <option value="5">1st Year (M.Tech)</option>
                  <option value="6">2nd Year (M.Tech)</option>
                </select>
              </div>
            </>
          )}

          <Input label="Password *" type="password" name="password" value={formData.password} onChange={handleChange} placeholder="At least 6 characters" />
          <Input label="Confirm Password *" type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="Re-enter your password" />

          {formData.role === 'student' && (
            <div className="face-info-box">
              <p>📷 After clicking Register, you'll be asked to capture your face for attendance system</p>
            </div>
          )}

          <Button type="submit" loading={loading}>Register</Button>
        </form>

        <p className="auth-link">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;