const webpush = require('web-push');

// Generate VAPID keys
const vapidKeys = webpush.generateVAPIDKeys();

console.log('=================================');
console.log('VAPID Keys Generated!');
console.log('=================================\n');

console.log('PUBLIC KEY:');
console.log(vapidKeys.publicKey);
console.log('\nPRIVATE KEY:');
console.log(vapidKeys.privateKey);

console.log('\n=================================');
console.log('Add these to your .env file:');
console.log('=================================\n');

console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log(`VAPID_SUBJECT=mailto:your-email@example.com`);