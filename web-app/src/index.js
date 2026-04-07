import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Suppress React error overlay for known face-api.js issue
if (process.env.NODE_ENV === 'development') {
  const showErrorOverlay = window.__REACT_ERROR_OVERLAY_GLOBAL_HOOK__;
  
  // Override error reporting
  window.addEventListener('error', (event) => {
    if (event.message && event.message.includes('Box.constructor')) {
      event.stopImmediatePropagation();
      event.preventDefault();
      return false;
    }
  });

  // Suppress console errors for this specific issue
  const originalError = console.error;
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Box.constructor') || 
       args[0].includes('IBoundingBox'))
    ) {
      return; // Don't show this error
    }
    originalError.call(console, ...args);
  };
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
