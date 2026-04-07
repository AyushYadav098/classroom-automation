import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-container">
      {/* Background decorative elements */}
      <div className="glow-circle top-left"></div>
      <div className="glow-circle bottom-right"></div>

      <div className="landing-content">
        {/* Custom SVG Logo: Graduation Cap + Network Nodes */}
        <div className="logo-container">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            className="app-logo"
            fill="none" 
            stroke="currentColor" 
            strokeWidth="1.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            {/* Graduation Cap */}
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c3 3 9 3 12 0v-5" />
            {/* Digital Node / Circuit accent */}
            <circle cx="12" cy="12" r="1.5" fill="currentColor" />
            <path d="M12 13.5v3.5" />
            <path d="M12 17h-3" />
            <circle cx="8" cy="17" r="1" fill="currentColor" />
          </svg>
        </div>

        <h1 className="app-title">Smart <span className="highlight">Classroom</span></h1>
        
        <p className="app-description">
          The future of education infrastructure. Automate attendance with facial recognition, 
          verify location via Bluetooth beacons, and control classroom environments effortlessly.
        </p>

        <div className="action-buttons">
          <button 
            className="btn-primary" 
            onClick={() => navigate('/login')}
          >
            Get Started
            <span className="arrow">→</span>
          </button>
        </div>

        {/* Feature Highlights */}
        <div className="feature-grid">
          <div className="feature-item">
            <span className="feature-icon">📷</span>
            <h3>AI Attendance</h3>
            <p>Instant facial recognition</p>
          </div>
          <div className="feature-item">
            <span className="feature-icon">📶</span>
            <h3>IoT Beacons</h3>
            <p>Precise location mapping</p>
          </div>
          <div className="feature-item">
            <span className="feature-icon">⚡</span>
            <h3>Power Control</h3>
            <p>ESP32 hardware integration</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;