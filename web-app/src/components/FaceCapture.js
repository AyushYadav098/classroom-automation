import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import './FaceCapture.css';

const FaceCapture = ({ onCapture, onCancel, mode = 'registration' }) => {
  const webcamRef = useRef(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [message, setMessage] = useState('Loading face detection models...');
  const detectionIntervalRef = useRef(null);

  useEffect(() => {
    loadModels();
    
    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, []);

  const loadModels = async () => {
    try {
      const MODEL_URL = process.env.PUBLIC_URL + '/models';
      
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);

      setModelsLoaded(true);
      setMessage('Ready! Position your face in the frame');
      
      setTimeout(() => {
        startDetection();
      }, 1000);
    } catch (error) {
      console.error('Error loading models:', error);
      setMessage('Error loading face detection. Please refresh the page.');
    }
  };

  const startDetection = () => {
    detectionIntervalRef.current = setInterval(() => {
      detectFaces();
    }, 500);
  };

  const detectFaces = async () => {
    if (webcamRef.current && webcamRef.current.video && webcamRef.current.video.readyState === 4) {
      const video = webcamRef.current.video;

      if (video.videoWidth === 0 || video.videoHeight === 0) return;
      video.width = video.videoWidth;
      video.height = video.videoHeight;

      try {
        const detection = await faceapi
          .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detection) {
          setFaceDetected(true);
          setMessage('✅ Face detected! Click "Capture" to proceed');
        } else {
          setFaceDetected(false);
          setMessage('⚠️ No face detected. Please position your face in the frame');
        }
      } catch (error) {
        // Silently handle detection errors
      }
    }
  };

  const handleCapture = async () => {
    if (!faceDetected) {
      alert('Please wait for face detection');
      return;
    }

    if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
    setMessage('Processing...');

    try {
      const video = webcamRef.current.video;
      video.width = video.videoWidth;
      video.height = video.videoHeight;
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection && detection.descriptor) {
        const descriptor = Array.from(detection.descriptor);
        const imageSrc = webcamRef.current.getScreenshot();
        onCapture({ descriptor, image: imageSrc });
      } else {
        alert('Face not detected. Please try again.');
        startDetection();
      }
    } catch (error) {
      console.error('Capture error:', error);
      alert('Error capturing face. Please try again.');
      startDetection();
    }
  };

  return (
    <div className="face-capture-container">
      <div className="face-capture-header">
        <h2>{mode === 'registration' ? 'Register Your Face' : 'Mark Attendance'}</h2>
        <p className="instruction">
          {mode === 'registration'
            ? 'Position your face in the center of the camera'
            : 'Look at the camera to mark your attendance'}
        </p>
      </div>

      <div className="camera-container">
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          videoConstraints={{ width: 640, height: 480, facingMode: 'user' }}
          className="webcam"
        />
        {faceDetected && (
          <div className="face-detected-indicator">
            <div className="detection-frame"></div>
          </div>
        )}
      </div>

      <div className="status-message">
        <span className={faceDetected ? 'status-success' : 'status-warning'}>
          {message}
        </span>
      </div>

      <div className="capture-controls">
        <button
          onClick={handleCapture}
          disabled={!modelsLoaded || !faceDetected}
          className="custom-btn btn-primary"
        >
          {mode === 'registration' ? 'Register Face' : 'Mark Attendance'}
        </button>
        <button onClick={onCancel} className="custom-btn btn-secondary">
          Cancel
        </button>
      </div>

      {!modelsLoaded && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Loading face detection models...</p>
        </div>
      )}
    </div>
  );
};

export default FaceCapture;