import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { lectureApi } from '../api/lectureApi';
import { attendanceApi } from '../api/attendanceApi';
import FaceCapture from '../components/FaceCapture';
import Input from '../components/Input';
import Button from '../components/Button';
import './StudentMarkAttendance.css';

const StudentMarkAttendance = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lecture, setLecture] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCamera, setShowCamera] = useState(false);
  const [marked, setMarked] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordEntered, setPasswordEntered] = useState(false);
  
  const [bluetoothVerified, setBluetoothVerified] = useState(false);
  const [bluetoothChecking, setBluetoothChecking] = useState(false);
  const [bluetoothError, setBluetoothError] = useState('');

  useEffect(() => {
    fetchLecture();
  }, [id]);

  const fetchLecture = async () => {
    setLoading(true);
    try {
      const response = await lectureApi.getById(id);
      setLecture(response.lecture);

      const attendanceResponse = await attendanceApi.getAttendance(id);
      const user = JSON.parse(localStorage.getItem('user'));
      const isMarked = attendanceResponse.present.some(
        record => record.student._id === user.id
      );
      setMarked(isMarked);
    } catch (error) {
      alert('Failed to load lecture details');
    } finally {
      setLoading(false);
    }
  };

  const scanForBeacon = async () => {
    setBluetoothChecking(true);
    setBluetoothError('');

    try {
      if (!navigator.bluetooth) {
        throw new Error('Bluetooth not supported on this device/browser. Please use Chrome or Edge on Android/Desktop.');
      }

      const expectedBeacon = `CLASSROOM_${lecture.classroom.roomNumber}`;
      
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: 'CLASSROOM_' }],
        optionalServices: ['battery_service']
      });

      if (device.name === expectedBeacon) {
        setBluetoothVerified(true);
        setBluetoothChecking(false);
        alert(`✅ Classroom verified!\nYou are in ${lecture.classroom.name}`);
      } else {
        throw new Error(`Wrong classroom! You are near "${device.name}" but need "${expectedBeacon}"`);
      }

    } catch (error) {
      setBluetoothError(error.message);
      setBluetoothChecking(false);
      setBluetoothVerified(false);
    }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (!bluetoothVerified) {
      alert('Please verify your location using Bluetooth first!');
      return;
    }
    if (!password.trim()) {
      alert('Please enter the attendance password');
      return;
    }
    setPasswordEntered(true);
    setShowCamera(true);
  };

  const handleFaceCapture = async (capturedData) => {
    try {
      const response = await attendanceApi.markAttendance(
        id, 
        capturedData.descriptor,
        password
      );
      
      alert(`✅ Attendance marked successfully!\nConfidence: ${(response.confidence * 100).toFixed(1)}%`);
      setMarked(true);
      setShowCamera(false);
    } catch (error) {
      if (error.response?.data?.error === 'Already marked') {
        alert('⚠️ You have already marked attendance for this lecture');
        setMarked(true);
      } else if (error.response?.data?.error === 'Invalid attendance password') {
        alert('❌ Incorrect password! Please check with your teacher.');
        setPasswordEntered(false);
        setPassword('');
      } else if (error.response?.data?.error === 'Attendance closed') {
        alert('⏰ ' + error.response.data.message);
        setPasswordEntered(false);
      } else {
        alert(error.response?.data?.message || 'Face not recognized. Please try again or contact your teacher.');
        setPasswordEntered(false);
      }
      setShowCamera(false);
    }
  };

  if (loading) return <div className="loading-container">Loading...</div>;

  if (showCamera) {
    return (
      <div className="student-attendance-container">
        {/* 👈 Global Orbs */}
        <div className="glow-circle top-left"></div>
        <div className="glow-circle bottom-right"></div>
        
        <div style={{ position: 'relative', zIndex: 1, width: '100%' }}>
          <FaceCapture
            onCapture={handleFaceCapture}
            onCancel={() => {
              setShowCamera(false);
              setPasswordEntered(false);
            }}
            mode="attendance"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="student-attendance-container">
      {/* 👈 Global Orbs */}
      <div className="glow-circle top-left"></div>
      <div className="glow-circle bottom-right"></div>

      <div className="student-attendance-box" style={{ position: 'relative', zIndex: 1 }}>
        <button onClick={() => navigate('/dashboard')} className="back-btn">
          ← Back to Dashboard
        </button>

        <div className="lecture-info">
          <h1>{lecture?.subject}</h1>
          <div className="info-row">
            <span className="label">Classroom:</span>
            <span className="value">{lecture?.classroom?.name}</span>
          </div>
          <div className="info-row">
            <span className="label">Teacher:</span>
            <span className="value">{lecture?.teacher?.name}</span>
          </div>
          <div className="info-row">
            <span className="label">Time:</span>
            <span className="value">{new Date(lecture?.startTime).toLocaleString()}</span>
          </div>
          <div className="info-row">
            <span className="label">Duration:</span>
            <span className="value">{lecture?.duration} minutes</span>
          </div>
        </div>

        {marked ? (
          <div className="marked-status">
            <div className="success-icon">✓</div>
            <h2>Attendance Already Marked</h2>
            <p>You have successfully marked your attendance for this lecture.</p>
          </div>
        ) : (
          <div className="mark-attendance-section">
            <h2>Mark Your Attendance</h2>
            
            {!bluetoothVerified && (
              <div className="bluetooth-verification-section">
                <div className="bluetooth-instructions">
                  <div className="instruction-icon">📶</div>
                  <div className="instruction-text">
                    <p className="instruction-title">Step 1: Verify You're in the Classroom</p>
                    <p className="instruction-description">
                      Click the button below to scan for the classroom's Bluetooth beacon.
                      You must be physically present in <strong>{lecture?.classroom?.name}</strong> to proceed.
                    </p>
                  </div>
                </div>

                <div className="bluetooth-scan-box">
                  <Button onClick={scanForBeacon} disabled={bluetoothChecking}>
                    {bluetoothChecking ? '🔍 Scanning...' : '📡 Scan for Classroom Beacon'}
                  </Button>

                  {bluetoothError && (
                    <div className="bluetooth-error">
                      <p className="error-message">❌ {bluetoothError}</p>
                      <p className="error-help">
                        Make sure:
                        <br />• You are using Chrome or Edge browser
                        <br />• Bluetooth is enabled on your device
                        <br />• You are physically in the classroom
                      </p>
                    </div>
                  )}

                  <div className="bluetooth-help">
                    <p>💡 <strong>Troubleshooting:</strong></p>
                    <ul>
                      <li>Make sure Bluetooth is turned ON on your device</li>
                      <li>Use Chrome or Edge browser</li>
                      <li>Grant Bluetooth permission when prompted</li>
                      <li>You must be within 10 meters of the classroom</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {bluetoothVerified && !passwordEntered && (
              <div className="password-entry-section">
                <div className="verification-success">
                  <div className="success-icon-small">✓</div>
                  <p className="success-message">Location Verified: {lecture?.classroom?.name}</p>
                </div>

                <div className="password-instructions">
                  <div className="instruction-icon">🔒</div>
                  <div className="instruction-text">
                    <p className="instruction-title">Step 2: Enter Attendance Password</p>
                    <p className="instruction-description">
                      Ask your teacher for the attendance password displayed in the classroom.
                    </p>
                  </div>
                </div>

                <form onSubmit={handlePasswordSubmit} className="password-form">
                  <Input
                    label="Enter Attendance Password"
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value.toUpperCase())}
                    placeholder="Enter 6-digit password"
                    maxLength="6"
                    style={{ 
                      textAlign: 'center',
                      fontSize: '24px',
                      letterSpacing: '8px',
                      fontFamily: 'Courier New, monospace',
                      fontWeight: 'bold'
                    }}
                    required
                  />
                  
                  <Button type="submit">
                    Continue to Face Scan
                  </Button>
                </form>
              </div>
            )}

            {bluetoothVerified && passwordEntered && (
              <div className="ready-to-scan">
                <div className="all-verified">
                  <p className="verified-item">✅ Location: {lecture?.classroom?.name}</p>
                  <p className="verified-item">✅ Password: {password}</p>
                </div>
                <p className="instruction">Click below to scan your face</p>
                <button onClick={() => setShowCamera(true)} className="mark-btn">
                  📷 Scan Face to Mark Attendance
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentMarkAttendance;