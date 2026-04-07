import React, { useState, useEffect } from 'react';
import {
  isNotificationSupported,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  isPushSubscribed,
  getNotificationPermission
} from '../utils/pushNotifications';
import Button from './Button';
import './NotificationSettings.css';

const NotificationSettings = () => {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [permission, setPermission] = useState('default');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    const isSupported = isNotificationSupported();
    setSupported(isSupported);
    if (isSupported) {
      const isSubscribed = await isPushSubscribed();
      setSubscribed(isSubscribed);
      setPermission(getNotificationPermission());
    }
  };

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (subscribed) {
        await unsubscribeFromPushNotifications();
        alert('Notifications disabled');
      } else {
        await subscribeToPushNotifications();
        alert('✅ Notifications enabled! You will receive updates about new lectures.');
      }
      await checkStatus();
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!supported) {
    return (
      <div className="notification-card glass-panel" style={{ justifyContent: 'center', textAlign: 'center' }}>
        <p style={{ color: '#f87171', margin: 0, fontWeight: '500' }}>
          ⚠️ Push notifications are blocked or not supported here.<br/>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            (Make sure you are not in an Incognito window and are using Chrome/Edge).
          </span>
        </p>
      </div>
    );
  }

  return (
    <div className="notification-card glass-panel">
      <div className="notification-info-side">
        <div className="notification-icon-wrapper">
          <span className="bell-icon">🔔</span>
        </div>
        <div className="notification-text">
          <h3>Push Notifications</h3>
          <p>Get instant updates when your lectures are scheduled.</p>
        </div>
      </div>

      <div className="notification-action-side">
        <div className={`status-pill ${subscribed ? 'status-active' : 'status-disabled'}`}>
          {subscribed ? 'ON' : 'OFF'}
        </div>
        <Button 
          onClick={handleToggle} 
          loading={loading}
          variant={subscribed ? "danger" : "primary"}
          className="notify-btn"
        >
          {subscribed ? 'Disable' : 'Enable'}
        </Button>
      </div>
    </div>
  );
};

export default NotificationSettings;