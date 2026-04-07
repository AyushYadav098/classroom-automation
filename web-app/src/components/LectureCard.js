import React from 'react';
import { formatTime, formatDate } from '../utils/dateUtils';
import './LectureCard.css';

const LectureCard = ({ lecture, onClick }) => {
  return (
    <div className="lecture-card" onClick={onClick}>
      <div className="lecture-header">
        <h3 className="lecture-subject">{lecture.subject}</h3>
        {/* Swapped inline styles for dynamic CSS classes */}
        <span className={`lecture-status status-${lecture.status.toLowerCase()}`}>
          {lecture.status.toUpperCase()}
        </span>
      </div>
      
      <p className="lecture-classroom">
        📍 {lecture.classroom?.name || 'Room ' + lecture.classroom?.roomNumber}
      </p>
      
      <div className="lecture-time">
        <span className="lecture-date">📅 {formatDate(lecture.startTime)}</span>
        <span className="lecture-time-range">
          ⏱️ {formatTime(lecture.startTime)} - {formatTime(lecture.endTime)}
        </span>
      </div>

      {lecture.description && (
        <p className="lecture-description">{lecture.description}</p>
      )}

      <p className="lecture-duration">⏳ Duration: {lecture.duration} minutes</p>
    </div>
  );
};

export default LectureCard;