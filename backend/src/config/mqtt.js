const mqtt = require('mqtt');

const mqttClient = mqtt.connect(process.env.MQTT_BROKER_URL, {
  clientId: `classroom-server-${Math.random().toString(16).slice(3)}`,
  clean: true,
  connectTimeout: 4000,
  reconnectPeriod: 1000,
});

mqttClient.on('connect', () => {
  console.log('✅ Connected to MQTT broker');
});

mqttClient.on('error', (error) => {
  console.error('❌ MQTT connection error:', error.message);
});

mqttClient.on('reconnect', () => {
  console.log('🔄 Reconnecting to MQTT broker...');
});

mqttClient.on('close', () => {
  console.log('⚠️  MQTT connection closed');
});

module.exports = mqttClient;