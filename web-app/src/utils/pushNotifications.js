import api from '../api/config';

// Check if browser supports notifications
export const isNotificationSupported = () => {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
};

// Request notification permission
export const requestNotificationPermission = async () => {
  if (!isNotificationSupported()) {
    throw new Error('Notifications not supported in this browser');
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

// Convert VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Subscribe to push notifications
export const subscribeToPushNotifications = async () => {
  try {
    // Check support
    if (!isNotificationSupported()) {
      throw new Error('Notifications not supported');
    }

    // Request permission
    const permissionGranted = await requestNotificationPermission();
    if (!permissionGranted) {
      throw new Error('Notification permission denied');
    }

    // Register service worker
    const registration = await navigator.serviceWorker.register('/service-worker.js');
    console.log('Service Worker registered:', registration);

    // Wait for service worker to be ready
    await navigator.serviceWorker.ready;

    // Get VAPID public key from backend
    const vapidResponse = await api.get('/push/vapid-public-key');
    const vapidPublicKey = vapidResponse.data.publicKey;

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    });

    console.log('Push subscription:', subscription);

    // Send subscription to backend
    await api.post('/push/subscribe', {
      subscription: subscription.toJSON()
    });

    console.log('✅ Push notifications enabled!');
    return true;

  } catch (error) {
    console.error('Push subscription error:', error);
    throw error;
  }
};

// Unsubscribe from push notifications
export const unsubscribeFromPushNotifications = async () => {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      
      // Remove from backend
      await api.post('/push/unsubscribe', {
        endpoint: subscription.endpoint
      });

      console.log('✅ Unsubscribed from push notifications');
      return true;
    }

    return false;

  } catch (error) {
    console.error('Unsubscribe error:', error);
    throw error;
  }
};

// Check if already subscribed
export const isPushSubscribed = async () => {
  try {
    if (!isNotificationSupported()) {
      return false;
    }

    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      return false;
    }

    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;

  } catch (error) {
    console.error('Check subscription error:', error);
    return false;
  }
};

// Get current notification permission
export const getNotificationPermission = () => {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission;
};