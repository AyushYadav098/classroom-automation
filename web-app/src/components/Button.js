import React from 'react';
import './Button.css';

const Button = ({ children, onClick, loading, variant = 'primary', disabled, type = 'button', style, className }) => {
  return (
    <button
      type={type}
      className={`custom-btn btn-${variant} ${className || ''}`}
      onClick={onClick}
      disabled={loading || disabled}
      style={style}
    >
      {loading ? 'Processing...' : children}
    </button>
  );
};

export default Button;