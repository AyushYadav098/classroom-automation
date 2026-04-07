import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { lectureApi } from '../api/lectureApi';
import LectureCard from '../components/LectureCard';
import './AllLectures.css';

const AllLectures = () => {
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchLectures();
  }, []);

  const fetchLectures = async () => {
    setLoading(true);
    try {
      const response = await lectureApi.getMyLectures();
      setLectures(response.lectures || []);
    } catch (error) {
      alert('Failed to fetch lectures');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="all-lectures-container">
      {/* 👈 Global Orbs */}
      <div className="glow-circle top-left"></div>
      <div className="glow-circle bottom-right"></div>

      <div className="all-lectures-box" style={{ position: 'relative', zIndex: 1 }}>
        <button className="back-btn" onClick={() => navigate('/dashboard')}>
          ← Back to Dashboard
        </button>

        <h1 className="page-title">All Lectures</h1>

        {loading ? (
          <p>Loading...</p>
        ) : lectures.length === 0 ? (
          <div className="empty-state">
            <p>No lectures found</p>
          </div>
        ) : (
          lectures.map((lecture) => (
            <LectureCard
              key={lecture._id}
              lecture={lecture}
              onClick={() => navigate(`/lecture/${lecture._id}`)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default AllLectures;