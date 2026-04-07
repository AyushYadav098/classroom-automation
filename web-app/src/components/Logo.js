import React from 'react';

const Logo = ({ className }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      className={`global-svg-logo ${className || ''}`}
      fill="none" 
      stroke="currentColor" 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      style={{ width: '100%', height: '100%' }} // Ensures it scales to whatever container it's in
    >
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <path d="M12 13.5v3.5" />
      <path d="M12 17h-3" />
      <circle cx="8" cy="17" r="1" fill="currentColor" />
    </svg>
  );
};

export default Logo;