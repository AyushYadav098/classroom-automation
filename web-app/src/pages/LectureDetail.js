import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { lectureApi } from '../api/lectureApi';
import { formatDateTime } from '../utils/dateUtils';
import Button from '../components/Button';
import './LectureDetail.css';

const LectureDetail = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const [lecture, setLecture] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const navigate = useNavigate();

  const fetchLecture = useCallback(async () => {
    setLoading(true);
    try {
      const response = await lectureApi.getById(id);
      setLecture(response.lecture);
    } catch (error) {
      alert('Failed to fetch lecture details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchLecture();
  }, [fetchLecture]);

  const handleActivate = async () => {
    if (window.confirm('This will turn on the power in the selected classroom. Continue?')) {
      setActionLoading(true);
      try {
        await lectureApi.activate(id);
        alert('Classroom power activated!');
        fetchLecture();
      } catch (error) {
        alert(error.response?.data?.error || 'Failed to activate');
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleDeactivate = async () => {
    if (window.confirm('This will turn off the power in the classroom. Continue?')) {
      setActionLoading(true);
      try {
        await lectureApi.deactivate(id);
        alert('Classroom power deactivated!');
        fetchLecture();
      } catch (error) {
        alert(error.response?.data?.error || 'Failed to deactivate');
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleCancel = async () => {
    if (window.confirm('Are you sure you want to cancel this lecture?')) {
      setActionLoading(true);
      try {
        await lectureApi.cancel(id);
        alert('Lecture cancelled');
        navigate('/dashboard');
      } catch (error) {
        alert(error.response?.data?.error || 'Failed to cancel');
      } finally {
        setActionLoading(false);
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#28a745';
      case 'scheduled': return '#007AFF';
      case 'completed': return '#6c757d';
      case 'cancelled': return '#dc3545';
      default: return '#6c757d';
    }
  };

  if (loading) return <div className="loading-container">Loading...</div>;
  if (!lecture) return <div className="loading-container">Lecture not found</div>;

  const isTeacher = user?.role === 'teacher';
  const isStudent = user?.role === 'student';

  return (
    <div className="lecture-detail-container">
      {/* 👈 Global Orbs */}
      <div className="glow-circle top-left"></div>
      <div className="glow-circle bottom-right"></div>

      <div className="lecture-detail-box" style={{ position: 'relative', zIndex: 1 }}>
        <button className="back-btn" onClick={() => navigate('/dashboard')}>
          ← Back to Dashboard
        </button>

        <div className="lecture-detail-header">
          <h1 className="lecture-detail-subject">{lecture.subject}</h1>
          <span 
            className="lecture-detail-status"
            style={{ backgroundColor: getStatusColor(lecture.status) }}
          >
            {lecture.status.toUpperCase()}
          </span>
        </div>

        <section className="detail-section">
          <h2 className="section-title">Classroom Information</h2>
          <InfoRow label="Room" value={lecture.classroom?.name} />
          <InfoRow label="Room Number" value={lecture.classroom?.roomNumber} />
          <InfoRow label="Building" value={lecture.classroom?.building || 'N/A'} />
          <InfoRow label="Floor" value={lecture.classroom?.floor || 'N/A'} />
          <InfoRow label="Capacity" value={lecture.classroom?.capacity || 'N/A'} />
        </section>

        <section className="detail-section">
          <h2 className="section-title">Lecture Details</h2>
          <InfoRow label="Teacher" value={lecture.teacher?.name} />
          <InfoRow label="Start Time" value={formatDateTime(lecture.startTime)} />
          <InfoRow label="End Time" value={formatDateTime(lecture.endTime)} />
          <InfoRow label="Duration" value={`${lecture.duration} minutes`} />
          {lecture.description && (
            <div className="description-box">
              <strong>Description:</strong>
              <p>{lecture.description}</p>
            </div>
          )}
        </section>

        <section className="detail-section">
          <h2 className="section-title">Status</h2>
          <InfoRow label="Power Activated" value={lecture.powerActivated ? 'Yes' : 'No'} />
          <InfoRow label="Power Deactivated" value={lecture.powerDeactivated ? 'Yes' : 'No'} />
        </section>

        {isTeacher && (
          <div className="actions-section">
            <Button onClick={() => navigate(`/attendance/${id}`)} variant="secondary">
              📋 Take Attendance
            </Button>

            {lecture.status === 'scheduled' && (
              <>
                <Button onClick={handleActivate} loading={actionLoading}>
                  Activate Classroom Now
                </Button>
                <Button onClick={handleCancel} variant="danger" loading={actionLoading}>
                  Cancel Lecture
                </Button>
              </>
            )}

            {lecture.status === 'active' && (
              <Button onClick={handleDeactivate} loading={actionLoading}>
                Deactivate Classroom
              </Button>
            )}
          </div>
        )}

        {isStudent && (lecture.status === 'active' || lecture.status === 'scheduled') && (
          <div className="actions-section">
            <Button onClick={() => navigate(`/mark-attendance/${id}`)}>
              📷 Mark My Attendance
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

const InfoRow = ({ label, value }) => (
  <div className="info-row">
    <span className="info-label">{label}:</span>
    <span className="info-value">{value || 'N/A'}</span>
  </div>
);

export default LectureDetail;