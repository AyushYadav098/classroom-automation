import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api/config';
import Logo from '../components/Logo';
import Button from '../components/Button';
import './Dashboard.css';
import ClassroomManagement from '../components/ClassroomManagement';

const AdminDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  
  // Data States
  const [stats, setStats] = useState({ students: 0, teachers: 0, pending: 0, activeLectures: 0 });
  const [pendingUsers, setPendingUsers] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [lectures, setLectures] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, pendingRes, approvedRes, lecturesRes] = await Promise.all([
        api.get('/admin/dashboard/stats'),
        api.get('/admin/users/pending'),
        api.get('/admin/users/approved'),
        api.get('/admin/lectures')
      ]);
      setStats(statsRes.data);
      setPendingUsers(pendingRes.data.users);
      setStudents(approvedRes.data.students);
      setTeachers(approvedRes.data.teachers);
      setLectures(lecturesRes.data.lectures);
    } catch (error) {
      console.error('Failed to fetch admin data', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async (userId, action) => {
    if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;
    try {
      if (action === 'delete') {
        await api.delete(`/admin/users/${userId}`);
      } else {
        await api.post(`/admin/users/${userId}/${action}`);
      }
      fetchData(); 
    } catch (error) {
      alert(`Failed to ${action} user`);
    }
  };

  const handleDeleteLecture = async (lectureId) => {
    if (!window.confirm(`Are you sure you want to delete this scheduled lecture?`)) return;
    try {
      await api.delete(`/admin/lectures/${lectureId}`);
      fetchData();
    } catch (error) {
      alert('Failed to delete lecture');
    }
  };

  const handleCutPower = async (lectureId) => {
    if (!window.confirm(`EMERGENCY OVERRIDE: Are you sure you want to end this lecture and cut power?`)) return;
    
    try {
      // Send the request with the Lecture ID
      await api.post(`/admin/lectures/${lectureId}/override-power`);
      alert(`⚡ Power Cut command sent and lecture ended!`);
      fetchData(); // Refresh the table so it moves out of "Active"
    } catch (error) {
      console.error('Power cut error:', error);
      alert('Failed to send power command. Check backend logs.');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Helper function to render Tabs
  const TabButton = ({ id, label }) => (
    <button 
      onClick={() => setActiveTab(id)}
      style={{ 
        background: 'none', border: 'none', 
        color: activeTab === id ? 'var(--accent-primary)' : 'var(--text-muted)', 
        fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer',
        borderBottom: activeTab === id ? '2px solid var(--accent-primary)' : 'none',
        paddingBottom: '5px'
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="dashboard">
      <div className="glow-circle top-left"></div>
      <div className="glow-circle bottom-right"></div>

      <div className="dashboard-header" style={{ position: 'relative', zIndex: 1 }}>
        <div className="header-left">
          <p className="welcome-text">System Administrator</p>
          <h1 className="user-name">{user?.name}</h1>
        </div>
        <div className="header-right">
          <Logo className="dashboard-logo" />
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </div>

      <div className="dashboard-content" style={{ position: 'relative', zIndex: 1 }}>
        
        {/* STATS ROW */}
        <div className="attendance-stats" style={{ marginBottom: '40px' }}>
          <div className="stat-card">
            <h3>Approved Students</h3>
            <p className="stat-number">{stats.students}</p>
          </div>
          <div className="stat-card">
            <h3>Approved Teachers</h3>
            <p className="stat-number">{stats.teachers}</p>
          </div>
          <div className="stat-card stat-absent">
            <h3>Pending Approvals</h3>
            <p className="stat-number">{stats.pending}</p>
          </div>
          <div className="stat-card stat-present">
            <h3>Active Lectures</h3>
            <p className="stat-number">{stats.activeLectures}</p>
          </div>
        </div>

        {/* 5-WAY TAB NAVIGATION */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '25px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
          <TabButton id="users" label="Pending Approvals" />
          <TabButton id="lectures" label="Lectures" />
          <TabButton id="students" label="Students" />
          <TabButton id="teachers" label="Teachers" />
          <TabButton id="classrooms" label="Manage Classrooms" />
        </div>

        {/* TAB 1: PENDING USERS */}
        {activeTab === 'users' && (
          <section className="dashboard-section">
            <h2 className="section-title">Pending Registrations</h2>
            <div className="present-list" style={{ padding: '0', overflow: 'hidden' }}>
              {pendingUsers.length === 0 ? (
                <div className="empty-state"><p>No pending registrations 🎉</p></div>
              ) : (
                <table className="attendance-table">
                  <thead><tr><th>Role</th><th>Name</th><th>Email</th><th>Details</th><th>Actions</th></tr></thead>
                  <tbody>
                    {pendingUsers.map((u) => (
                      <tr key={u._id}>
                        <td><span className={`lecture-status ${u.role === 'teacher' ? 'status-active' : 'status-scheduled'}`}>{u.role.toUpperCase()}</span></td>
                        <td>{u.name}</td><td>{u.email}</td>
                        <td>{u.role === 'student' ? `${u.department} - Year ${u.year}` : 'N/A'}</td>
                        <td style={{ display: 'flex', gap: '10px' }}>
                          <Button onClick={() => handleUserAction(u._id, 'approve')} style={{ padding: '8px 16px', fontSize: '12px' }}>Approve</Button>
                          <Button variant="danger" onClick={() => handleUserAction(u._id, 'reject')} style={{ padding: '8px 16px', fontSize: '12px' }}>Reject</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        )}

        {/* TAB 2: LECTURES */}
        {activeTab === 'lectures' && (
          <section className="dashboard-section">
            <h2 className="section-title">Schedule & Active Lectures</h2>
            <div className="present-list" style={{ padding: '0', overflow: 'hidden' }}>
              {lectures.length === 0 ? (
                <div className="empty-state"><p>No lectures scheduled.</p></div>
              ) : (
                <table className="attendance-table">
                  <thead><tr><th>Status</th><th>Subject</th><th>Teacher</th><th>Location</th><th>Time & Duration</th><th>ESP32 Control</th></tr></thead>
                  <tbody>
                    {lectures.map((lec) => (
                      <tr key={lec._id}>
                        <td>
                          <span className={`lecture-status ${lec.status === 'active' ? 'status-active' : 'status-scheduled'}`}>
                            {lec.status.toUpperCase()}
                          </span>
                        </td>
                        <td><strong>{lec.subject}</strong></td>
                        <td>{lec.teacher?.name || 'Unknown'}</td>
                        <td>{lec.classroom?.name || 'Unassigned'} ({lec.classroom?.roomNumber || 'N/A'})</td>
                        <td>{new Date(lec.date).toLocaleDateString()} @ {lec.startTime}<br/><small>{lec.duration} mins</small></td>
                        <td style={{ display: 'flex', gap: '10px' }}>
                         {/* 👉 Updated Button */}
                          <Button variant="warning" onClick={() => handleCutPower(lec._id)} style={{ padding: '6px 10px', fontSize: '12px' }}>
                            🔌 Cut Power
                          </Button>
                          <Button variant="danger" onClick={() => handleDeleteLecture(lec._id)} style={{ padding: '6px 10px', fontSize: '12px' }}>Delete</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        )}

        {/* TAB 3: STUDENTS */}
        {activeTab === 'students' && (
          <section className="dashboard-section">
            <h2 className="section-title">Registered Students</h2>
            <div className="present-list" style={{ padding: '0', overflow: 'hidden' }}>
              {students.length === 0 ? (
                <div className="empty-state"><p>No approved students.</p></div>
              ) : (
                <table className="attendance-table">
                  <thead><tr><th>Name</th><th>Email</th><th>Roll Number</th><th>Department/Year</th><th>Actions</th></tr></thead>
                  <tbody>
                    {students.map((u) => (
                      <tr key={u._id}>
                        <td><strong>{u.name}</strong></td><td>{u.email}</td><td>{u.rollNumber}</td>
                        <td>{u.department} (Year {u.year})</td>
                        <td style={{ display: 'flex', gap: '10px' }}>
                          <Button variant="warning" onClick={() => handleUserAction(u._id, 'suspend')} style={{ padding: '6px 10px', fontSize: '12px' }}>Suspend</Button>
                          <Button variant="danger" onClick={() => handleUserAction(u._id, 'delete')} style={{ padding: '6px 10px', fontSize: '12px' }}>Delete</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        )}

        {/* TAB 4: TEACHERS */}
        {activeTab === 'teachers' && (
          <section className="dashboard-section">
            <h2 className="section-title">Registered Teachers</h2>
            <div className="present-list" style={{ padding: '0', overflow: 'hidden' }}>
              {teachers.length === 0 ? (
                <div className="empty-state"><p>No approved teachers.</p></div>
              ) : (
                <table className="attendance-table">
                  <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Actions</th></tr></thead>
                  <tbody>
                    {teachers.map((u) => (
                      <tr key={u._id}>
                        <td><strong>{u.name}</strong></td><td>{u.email}</td><td>{u.phone || 'N/A'}</td>
                        <td style={{ display: 'flex', gap: '10px' }}>
                          <Button variant="warning" onClick={() => handleUserAction(u._id, 'suspend')} style={{ padding: '6px 10px', fontSize: '12px' }}>Suspend</Button>
                          <Button variant="danger" onClick={() => handleUserAction(u._id, 'delete')} style={{ padding: '6px 10px', fontSize: '12px' }}>Delete</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        )}

        {/* TAB 5: CLASSROOMS */}
        {activeTab === 'classrooms' && <ClassroomManagement />}

      </div>
    </div>
  );
};

export default AdminDashboard;