import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { lectureApi } from '../api/lectureApi';
import LectureCard from '../components/LectureCard';
import Button from '../components/Button';
import Logo from '../components/Logo'; // 👈 Import logo
import NotificationSettings from '../components/NotificationSettings';
import './Dashboard.css';

const StudentDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const [upcomingLectures, setUpcomingLectures] = useState([]);
  const [activeLectures, setActiveLectures] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    fetchLectures();
  }, []);

  const fetchLectures = async () => {
    setLoading(true);
    try {
      const response = await lectureApi.getMyLectures();
      setUpcomingLectures(response.upcomingLectures || []);
      setActiveLectures(response.activeLectures || []);
    } catch (error) {
      console.error('Failed to fetch lectures:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
      navigate('/');
    }
  };

  return (
    <div className="dashboard student-dashboard">
      <div className="glow-circle top-left"></div>
      <div className="glow-circle bottom-right"></div>

      <div className="dashboard-header" style={{ position: 'relative', zIndex: 1 }}>
        <div>
          <p className="welcome-text">Welcome,</p>
          <h1 className="user-name">{user?.name}</h1>
        </div>
         <div className="header-right">
          {/* Notification Toggle Button */}
          <button 
            className="logout-btn" 
            style={{ marginRight: '10px' }}
            onClick={() => setShowSettings(!showSettings)}
          >
            {showSettings ? 'Close Settings' : '🔔 Notifications'}
          </button>
          
          <Logo className="dashboard-logo" />
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </div>
      <div className="dashboard-content" style={{ position: 'relative', zIndex: 1 }}>
        {showSettings && <NotificationSettings />}
        <div className="quick-actions">
          <Button onClick={() => navigate('/search')}>
            🔍 Search Lectures
          </Button>
        </div>
        {activeLectures.length > 0 && (
          <section className="dashboard-section">
            <h2 className="section-title">Active Now</h2>
            {activeLectures.map((lecture) => (
              <LectureCard
                key={lecture._id}
                lecture={lecture}
                onClick={() => navigate(`/lecture/${lecture._id}`)}
              />
            ))}
          </section>
        )}

        <section className="dashboard-section">
          <h2 className="section-title">Upcoming Lectures</h2>
          {loading ? (
            <p>Loading...</p>
          ) : upcomingLectures.length === 0 ? (
            <div className="empty-state">
              <p>No upcoming lectures</p>
            </div>
          ) : (
            upcomingLectures.map((lecture) => (
              <LectureCard
                key={lecture._id}
                lecture={lecture}
                onClick={() => navigate(`/lecture/${lecture._id}`)}
              />
            ))
          )}
        </section>

        <button 
          className="view-all-btn"
          onClick={() => navigate('/all-lectures')}
        >
          View All Lectures
        </button>
      </div>
    </div>
  );
};

export default StudentDashboard;