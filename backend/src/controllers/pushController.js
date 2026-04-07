const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');

// Configure web-push
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Subscribe to push notifications
exports.subscribe = async (req, res) => {
  try {
    const { subscription } = req.body;

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Invalid subscription data' });
    }

    // Check if subscription already exists
    const existing = await PushSubscription.findOne({
      user: req.user._id,
      endpoint: subscription.endpoint
    });

    if (existing) {
      // Update last used
      existing.lastUsed = new Date();
      await existing.save();
      
      return res.json({ 
        message: 'Subscription already exists',
        subscription: existing 
      });
    }

    // Create new subscription
    const newSubscription = new PushSubscription({
      user: req.user._id,
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      userAgent: req.headers['user-agent']
    });

    await newSubscription.save();

    console.log('✅ Push subscription saved for user:', req.user.name);

    res.status(201).json({
      message: 'Subscription saved successfully',
      subscription: newSubscription
    });

  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).json({ error: 'Failed to save subscription' });
  }
};

// Unsubscribe from push notifications
exports.unsubscribe = async (req, res) => {
  try {
    const { endpoint } = req.body;

    await PushSubscription.deleteOne({
      user: req.user._id,
      endpoint: endpoint
    });

    console.log('✅ Push subscription removed for user:', req.user.name);

    res.json({ message: 'Unsubscribed successfully' });

  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
};

// Send notification to specific users
exports.sendNotificationToUsers = async (userIds, payload) => {
  try {
    console.log(`📤 Sending notifications to ${userIds.length} users...`);

    // Get all subscriptions for these users
    const subscriptions = await PushSubscription.find({
      user: { $in: userIds }
    });

    console.log(`Found ${subscriptions.length} subscriptions`);

    const notificationPayload = JSON.stringify(payload);

    // Send to all subscriptions
    const promises = subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: subscription.keys
          },
          notificationPayload
        );

        // Update last used
        subscription.lastUsed = new Date();
        await subscription.save();

        console.log('✅ Notification sent to subscription:', subscription.endpoint.substring(0, 50) + '...');

      } catch (error) {
        console.error('Failed to send to subscription:', error);

        // If subscription is invalid, remove it
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log('Removing invalid subscription...');
          await PushSubscription.deleteOne({ _id: subscription._id });
        }
      }
    });

    await Promise.allSettled(promises);

    console.log('✅ All notifications sent!');

    return {
      success: true,
      sent: subscriptions.length
    };

  } catch (error) {
    console.error('Send notification error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get user's subscriptions (for debugging)
exports.getSubscriptions = async (req, res) => {
  try {
    const subscriptions = await PushSubscription.find({
      user: req.user._id
    }).select('-keys'); // Don't send keys to client

    res.json({
      subscriptions,
      count: subscriptions.length
    });

  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({ error: 'Failed to get subscriptions' });
  }
};