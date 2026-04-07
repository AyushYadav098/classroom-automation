const express = require('express');
const router = express.Router();
const pushController = require('../controllers/pushController');
const { auth } = require('../middleware/auth');

// Subscribe to push notifications
router.post('/subscribe', auth, pushController.subscribe);

// Unsubscribe from push notifications
router.post('/unsubscribe', auth, pushController.unsubscribe);

// Get user's subscriptions
router.get('/subscriptions', auth, pushController.getSubscriptions);

module.exports = router;
// Get VAPID public key (for frontend)
router.get('/vapid-public-key', (req, res) => {
  res.json({
    publicKey: process.env.VAPID_PUBLIC_KEY
  });
});