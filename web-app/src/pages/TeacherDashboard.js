import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { lectureApi } from '../api/lectureApi';
import LectureCard from '../components/LectureCard';
import Button from '../components/Button';
import Logo from '../components/Logo'; // 👈 Imported our new Logo
import './Dashboard.css';

const TeacherDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const [upcomingLectures, setUpcomingLectures] = useState([]);
  const [activeLectures, setActiveLectures] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
    <div className="dashboard">
      {/* 👈 Global Orbs */}
      <div className="glow-circle top-left"></div>
      <div className="glow-circle bottom-right"></div>

      <div className="dashboard-header" style={{ position: 'relative', zIndex: 1 }}>
        <div className="header-left">
          <p className="welcome-text">Welcome back,</p>
          <h1 className="user-name">{user?.name}</h1>
        </div>
        
        <div className="header-right">
          <Logo className="dashboard-logo" /> {/* 👈 Replaced standard image tag */}
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </div>

      <div className="dashboard-content" style={{ position: 'relative', zIndex: 1 }}>
        <div className="quick-actions">
          <Button onClick={() => navigate('/create-lecture')}>
            Schedule New Lecture
          </Button>
          <Button 
            onClick={() => navigate('/search')}
            variant="secondary"
            style={{ marginTop: '10px' }}
          >
            🔍 Search Lectures
          </Button>
        </div>

        {activeLectures.length > 0 && (
          <section className="dashboard-section">
            <h2 className="section-title">Active Lectures</h2>
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
              <p className="empty-subtext">Schedule your first lecture to get started</p>
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

export default TeacherDashboard;