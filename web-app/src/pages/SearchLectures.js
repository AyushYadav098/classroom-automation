import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { lectureApi } from '../api/lectureApi';
import { classroomApi } from '../api/classroomApi';
import LectureCard from '../components/LectureCard';
import Input from '../components/Input';
import Button from '../components/Button';
import './SearchLectures.css';

const SearchLectures = () => {
  const [searchParams, setSearchParams] = useState({ query: '', date: '', classroom: '', status: '' });
  const [classrooms, setClassrooms] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const fetchClassrooms = async () => {
    try {
      const response = await classroomApi.getAll();
      setClassrooms(response.classrooms || []);
    } catch (error) {
      console.error('Failed to fetch classrooms:', error);
    }
  };

  const handleChange = (e) => {
    setSearchParams({ ...searchParams, [e.target.name]: e.target.value });
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSearched(true);
    try {
      const response = await lectureApi.search(searchParams);
      setResults(response.lectures || []);
    } catch (error) {
      alert('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setSearchParams({ query: '', date: '', classroom: '', status: '' });
    setResults([]);
    setSearched(false);
  };

  return (
    <div className="search-lectures-container">
      {/* 👈 Global Orbs */}
      <div className="glow-circle top-left"></div>
      <div className="glow-circle bottom-right"></div>

      <div className="search-lectures-box" style={{ position: 'relative', zIndex: 1 }}>
        <button className="back-btn" onClick={() => navigate('/dashboard')}>
          ← Back to Dashboard
        </button>

        <h1 className="page-title">Search Lectures</h1>

        <form onSubmit={handleSearch} className="search-form">
          <Input label="Search by Subject" name="query" value={searchParams.query} onChange={handleChange} placeholder="e.g., Mathematics, Physics" />
          <Input label="Filter by Date" type="date" name="date" value={searchParams.date} onChange={handleChange} />

          <div className="input-container">
            <label className="input-label">Filter by Classroom</label>
            <select name="classroom" value={searchParams.classroom} onChange={handleChange} className="input-field">
              <option value="">All Classrooms</option>
              {classrooms.map((classroom) => (
                <option key={classroom._id} value={classroom._id}>
                  {classroom.name} ({classroom.roomNumber})
                </option>
              ))}
            </select>
          </div>

          <div className="input-container">
            <label className="input-label">Filter by Status</label>
            <select name="status" value={searchParams.status} onChange={handleChange} className="input-field">
              <option value="">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="button-row">
            <Button type="submit" loading={loading}>Search</Button>
            <Button type="button" variant="secondary" onClick={handleClear}>Clear Filters</Button>
          </div>
        </form>

        {loading && <div className="search-loading"><p>Searching...</p></div>}

        {searched && !loading && (
          <div className="search-results">
            <h2 className="results-title">
              {results.length} {results.length === 1 ? 'Result' : 'Results'} Found
            </h2>
            {results.length === 0 ? (
              <div className="empty-state">
                <p>No lectures found matching your search criteria</p>
                <p className="empty-subtext">Try adjusting your filters</p>
              </div>
            ) : (
              results.map((lecture) => (
                <LectureCard
                  key={lecture._id}
                  lecture={lecture}
                  onClick={() => navigate(`/lecture/${lecture._id}`)}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchLectures;