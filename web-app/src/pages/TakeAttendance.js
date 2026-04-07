import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { lectureApi } from '../api/lectureApi';
import { attendanceApi } from '../api/attendanceApi';
import FaceCapture from '../components/FaceCapture';
import Button from '../components/Button';
import './TakeAttendance.css';

const TakeAttendance = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lecture, setLecture] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [attendancePassword, setAttendancePassword] = useState('');
  const [mode, setMode] = useState('view');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const lectureResponse = await lectureApi.getById(id);
      setLecture(lectureResponse.lecture);
      
      setAttendancePassword(lectureResponse.lecture.attendancePassword);

      const attendanceResponse = await attendanceApi.getAttendance(id);
      setAttendance(attendanceResponse);
    } catch (error) {
      alert('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const handleStartScanning = async () => {
    try {
      const response = await attendanceApi.startAttendance(id);
      setAttendancePassword(response.lecture.attendancePassword);
      setMode('scan');
    } catch (error) {
      alert('Failed to start attendance session');
    }
  };

  const handleFaceCapture = async (capturedData) => {
    try {
      const response = await attendanceApi.markAttendance(
        id, 
        capturedData.descriptor,
        attendancePassword
      );
      
      alert(`✅ Attendance marked for ${response.student.name} (${response.student.rollNumber})`);
      await fetchData();
    } catch (error) {
      if (error.response?.data?.error === 'Already marked') {
        alert(`⚠️ ${error.response.data.student.name} already marked attendance`);
      } else {
        alert(error.response?.data?.error || 'Failed to mark attendance');
      }
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const blob = await attendanceApi.downloadPDF(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_${lecture.subject}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert('Failed to download PDF');
    }
  };

  if (loading) return <div className="loading-container">Loading...</div>;

  if (mode === 'scan') {
    return (
      <div className="take-attendance-container">
        {/* 👈 Global Orbs */}
        <div className="glow-circle top-left"></div>
        <div className="glow-circle bottom-right"></div>
        
        <div style={{ position: 'relative', zIndex: 1, width: '100%' }}>
          <FaceCapture
            onCapture={handleFaceCapture}
            onCancel={() => setMode('view')}
            mode="attendance"
          />
          <div className="scan-info">
            <p>👥 Present: {attendance?.stats.present} / {attendance?.stats.totalEnrolled}</p>
            
            <div className="password-display-scanning">
              <p className="password-label">Attendance Password:</p>
              <p className="password-code">{attendancePassword}</p>
              <p className="password-hint">Share this with students to mark attendance</p>
            </div>

            <button onClick={() => setMode('view')} className="view-list-btn">
              View Attendance List
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="take-attendance-container">
      {/* 👈 Global Orbs */}
      <div className="glow-circle top-left"></div>
      <div className="glow-circle bottom-right"></div>

      <div style={{ position: 'relative', zIndex: 1, width: '100%' }}>
        <div className="attendance-header">
          <button onClick={() => navigate('/dashboard')} className="back-btn">
            ← Back
          </button>
          <h1>Attendance - {lecture?.subject}</h1>
        </div>

        <div className="password-display-box">
          <div className="password-content">
            <div className="password-icon">🔑</div>
            <div className="password-info">
              <p className="password-label">Attendance Password</p>
              <p className="password-code">{attendancePassword}</p>
              <p className="password-hint">
                Students need this password to mark attendance. Valid only during lecture time.
              </p>
            </div>
          </div>
        </div>

        <div className="attendance-stats">
          <div className="stat-card">
            <h3>Total Enrolled</h3>
            <p className="stat-number">{attendance?.stats.totalEnrolled}</p>
          </div>
          <div className="stat-card stat-present">
            <h3>Present</h3>
            <p className="stat-number">{attendance?.stats.present}</p>
          </div>
          <div className="stat-card stat-absent">
            <h3>Absent</h3>
            <p className="stat-number">{attendance?.stats.absent}</p>
          </div>
          <div className="stat-card stat-percentage">
            <h3>Attendance %</h3>
            <p className="stat-number">{attendance?.stats.percentage}%</p>
          </div>
        </div>

       <div className="attendance-actions" style={{ maxWidth: '600px', margin: '0 auto 30px', display: 'flex', gap: '20px' }}>
  <Button onClick={handleStartScanning}>
    📷 Start Face Scanning
  </Button>
  <Button onClick={handleDownloadPDF} variant="secondary">
    📄 Download PDF Report
  </Button>
</div>

        <div className="attendance-lists">
          <div className="present-list">
            <h2>Present Students ({attendance?.present.length})</h2>
            {attendance?.present.length === 0 ? (
              <p className="empty-message">No students marked present yet</p>
            ) : (
              <table className="attendance-table">
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Roll No</th>
                    <th>Name</th>
                    <th>Department</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance?.present.map((record, index) => (
                    <tr key={record.student._id}>
                      <td>{index + 1}</td>
                      <td>{record.student.rollNumber}</td>
                      <td>{record.student.name}</td>
                      <td>{record.student.department}</td>
                      <td>{new Date(record.markedAt).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="absent-list">
            <h2>Absent Students ({attendance?.absent.length})</h2>
            {attendance?.absent.length === 0 ? (
              <p className="empty-message">All students present! 🎉</p>
            ) : (
              <table className="attendance-table">
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Roll No</th>
                    <th>Name</th>
                    <th>Department</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance?.absent.map((student, index) => (
                    <tr key={student._id}>
                      <td>{index + 1}</td>
                      <td>{student.rollNumber}</td>
                      <td>{student.name}</td>
                      <td>{student.department}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TakeAttendance;