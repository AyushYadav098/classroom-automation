import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { lectureApi } from '../api/lectureApi';
import { classroomApi } from '../api/classroomApi';
import { authApi } from '../api/authApi';
import Input from '../components/Input';
import Button from '../components/Button';
import './CreateLecture.css';

const CreateLecture = () => {
  const [classrooms, setClassrooms] = useState([]);
  const [availableDepartments, setAvailableDepartments] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [selectedYears, setSelectedYears] = useState([]);
  const [studentCount, setStudentCount] = useState(0);
  const [formData, setFormData] = useState({
    classroomId: '', subject: '', description: '', date: '', time: '', duration: '60', customDuration: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchClassrooms();
    fetchStudentMetadata();
    const today = new Date().toISOString().split('T')[0];
    setFormData(prev => ({ ...prev, date: today }));
  }, []);

  useEffect(() => {
    if (selectedDepartments.length > 0 || selectedYears.length > 0) {
      fetchStudentCount();
    } else {
      setStudentCount(0);
    }
  }, [selectedDepartments, selectedYears]);

  const fetchClassrooms = async () => {
    try {
      const response = await classroomApi.getAll();
      setClassrooms(response.classrooms || []);
      if (response.classrooms?.length > 0) {
        setFormData(prev => ({ ...prev, classroomId: response.classrooms[0]._id }));
      }
    } catch (error) {
      setError('Failed to fetch classrooms');
    }
  };

  const fetchStudentMetadata = async () => {
    try {
      const response = await authApi.getStudentMetadata();
      setAvailableDepartments(response.departments || []);
      setAvailableYears(response.years || []);
    } catch (error) {
      console.error('Failed to fetch student metadata:', error);
    }
  };

  const fetchStudentCount = async () => {
    try {
      const response = await authApi.getStudentsByFilter({ departments: selectedDepartments, years: selectedYears });
      setStudentCount(response.count);
    } catch (error) {
      console.error('Failed to fetch student count:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'duration' && value !== 'custom') {
      setFormData({ ...formData, [name]: value, customDuration: '' });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleDepartmentToggle = (dept) => {
    if (selectedDepartments.includes(dept)) {
      setSelectedDepartments(selectedDepartments.filter(d => d !== dept));
    } else {
      setSelectedDepartments([...selectedDepartments, dept]);
    }
  };

  const handleYearToggle = (year) => {
    if (selectedYears.includes(year)) {
      setSelectedYears(selectedYears.filter(y => y !== year));
    } else {
      setSelectedYears([...selectedYears, year]);
    }
  };

  const handleSelectAllDepartments = () => setSelectedDepartments([...availableDepartments]);
  const handleDeselectAllDepartments = () => setSelectedDepartments([]);
  const handleSelectAllYears = () => setSelectedYears([...availableYears]);
  const handleDeselectAllYears = () => setSelectedYears([]);

  const getYearLabel = (year) => {
    switch(year) {
      case 1: return '1st Year (B.Tech)'; case 2: return '2nd Year (B.Tech)';
      case 3: return '3rd Year (B.Tech)'; case 4: return '4th Year (B.Tech)';
      case 5: return '1st Year (M.Tech)'; case 6: return '2nd Year (M.Tech)';
      default: return `Year ${year}`;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.classroomId || !formData.subject || !formData.date || !formData.time) {
      setError('Please fill in all required fields'); return;
    }
    if (selectedDepartments.length === 0 && selectedYears.length === 0) {
      setError('Please select at least one department or year'); return;
    }
    if (studentCount === 0) {
      setError('No students match the selected criteria'); return;
    }

    let finalDuration;
    if (formData.duration === 'custom') {
      finalDuration = parseInt(formData.customDuration);
      if (!formData.customDuration || isNaN(finalDuration) || finalDuration < 1) {
        setError('Please enter a valid custom duration (minimum 1 minute)'); return;
      }
      if (finalDuration > 480) {
        setError('Duration cannot exceed 480 minutes (8 hours)'); return;
      }
    } else {
      finalDuration = parseInt(formData.duration);
    }

    const startDateTime = new Date(`${formData.date}T${formData.time}`);
    if (startDateTime <= new Date()) {
      setError('Please select a future date and time'); return;
    }

    setLoading(true);
    setError('');

    try {
      const studentsResponse = await authApi.getStudentsByFilter({ departments: selectedDepartments, years: selectedYears });
      const studentIds = studentsResponse.students.map(s => s._id);

      await lectureApi.create({
        classroomId: formData.classroomId, subject: formData.subject, description: formData.description,
        startTime: startDateTime.toISOString(), duration: finalDuration, studentIds: studentIds,
      });

      alert(`Lecture scheduled successfully! ${studentCount} students enrolled.`);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create lecture');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-lecture-container">
      {/* 👈 Global Orbs */}
      <div className="glow-circle top-left"></div>
      <div className="glow-circle bottom-right"></div>

      <div className="create-lecture-box" style={{ position: 'relative', zIndex: 1 }}>
        <h1 className="page-title">Schedule New Lecture</h1>

        <form onSubmit={handleSubmit}>
          {error && <div className="error-box">{error}</div>}

          <div className="input-container">
            <label className="input-label">Classroom *</label>
            <select name="classroomId" value={formData.classroomId} onChange={handleChange} className="input-field" required>
              {classrooms.map((classroom) => (
                <option key={classroom._id} value={classroom._id}>
                  {classroom.name} ({classroom.roomNumber})
                </option>
              ))}
            </select>
          </div>

          <Input label="Subject *" name="subject" value={formData.subject} onChange={handleChange} placeholder="e.g., Mathematics, Physics" required />

          <div className="input-container">
            <label className="input-label">Description</label>
            <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Optional lecture description" className="input-field" rows="3" />
          </div>

          <div className="date-time-row">
            <Input label="Date *" type="date" name="date" value={formData.date} onChange={handleChange} required />
            <Input label="Time *" type="time" name="time" value={formData.time} onChange={handleChange} required />
          </div>

          <div className="input-container">
            <label className="input-label">Duration (minutes) *</label>
            <select name="duration" value={formData.duration} onChange={handleChange} className="input-field" required>
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">60 minutes (1 hour)</option>
              <option value="90">90 minutes (1.5 hours)</option>
              <option value="120">120 minutes (2 hours)</option>
              <option value="180">180 minutes (3 hours)</option>
              <option value="custom">Custom duration...</option>
            </select>
          </div>

          {formData.duration === 'custom' && (
            <div className="custom-duration-container">
              <Input label="Enter Custom Duration (minutes) *" type="number" name="customDuration" value={formData.customDuration} onChange={handleChange} placeholder="Enter duration in minutes (1-480)" min="1" max="480" required />
              <p className="helper-text">Enter duration between 1 and 480 minutes (8 hours max)</p>
            </div>
          )}

          <div className="selection-section">
            <div className="section-header">
              <label className="input-label">Select Departments *</label>
              <div className="select-buttons">
                <button type="button" onClick={handleSelectAllDepartments} className="select-all-btn">Select All</button>
                <button type="button" onClick={handleDeselectAllDepartments} className="deselect-all-btn">Clear</button>
              </div>
            </div>
            <div className="checkbox-grid">
              {availableDepartments.map((dept) => (
                <label key={dept} className="checkbox-label">
                  <input type="checkbox" checked={selectedDepartments.includes(dept)} onChange={() => handleDepartmentToggle(dept)} />
                  <span>{dept}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="selection-section">
            <div className="section-header">
              <label className="input-label">Select Years *</label>
              <div className="select-buttons">
                <button type="button" onClick={handleSelectAllYears} className="select-all-btn">Select All</button>
                <button type="button" onClick={handleDeselectAllYears} className="deselect-all-btn">Clear</button>
              </div>
            </div>
            <div className="checkbox-grid">
              {availableYears.map((year) => (
                <label key={year} className="checkbox-label">
                  <input type="checkbox" checked={selectedYears.includes(year)} onChange={() => handleYearToggle(year)} />
                  <span>{getYearLabel(year)}</span>
                </label>
              ))}
            </div>
          </div>

          {studentCount > 0 && (
            <div className="student-count-box">
              <strong>{studentCount}</strong> student{studentCount !== 1 ? 's' : ''} will be enrolled in this lecture
            </div>
          )}

          <div className="button-row">
            <Button type="submit" loading={loading}>Schedule Lecture</Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/dashboard')}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateLecture;