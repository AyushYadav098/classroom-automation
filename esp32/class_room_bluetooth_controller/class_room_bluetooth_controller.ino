#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// ===== WiFi Credentials =====
const char* WIFI_SSID = "Redmi 10 Prime 2022";
const char* WIFI_PASSWORD = "12345678";

// ===== MQTT Configuration =====
const char* MQTT_BROKER = "broker.hivemq.com";
const int MQTT_PORT = 1883;
const char* ESP32_ID = "ESP32_001";
const char* CLASSROOM_TOPIC = "classroom/101";

// ===== Classroom Info =====
const char* ROOM_NUMBER = "101";
const char* CLASSROOM_NAME = "Computer Lab 1";

// ===== Pin Configuration =====
const int RELAY_PIN = 26;
const int STATUS_LED = 2;

// ===== Bluetooth Configuration =====
BLEServer* pServer = NULL;
BLEAdvertising* pAdvertising = NULL;
bool deviceConnected = false;

// ===== Global Variables =====
WiFiClient espClient;
PubSubClient mqttClient(espClient);
unsigned long lastHeartbeat = 0;
bool powerState = false;

// ===========================
// BLUETOOTH SETUP
// ===========================
void setupBluetooth() {
  Serial.println("📶 Setting up Bluetooth beacon...");
  
  // Create beacon name: CLASSROOM_101
  String beaconName = "CLASSROOM_" + String(ROOM_NUMBER);
  
  // Initialize BLE
  BLEDevice::init(beaconName.c_str());
  
  // Create BLE Server
  pServer = BLEDevice::createServer();
  
  // Start advertising
  pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID("180F"); // Battery service UUID (standard)
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMinPreferred(0x12);
  
  BLEDevice::startAdvertising();
  
  Serial.println("✅ Bluetooth beacon active!");
  Serial.print("Beacon name: ");
  Serial.println(beaconName);
  Serial.println("Students can now scan for this beacon");
}

// ===========================
// SETUP FUNCTION
// ===========================
void setup() {
  Serial.begin(115200);
  Serial.println("\n\n=================================");
  Serial.println("ESP32 Classroom Controller v2.0");
  Serial.println("With Bluetooth Beacon");
  Serial.println("=================================\n");
  
  // Initialize Pins
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(STATUS_LED, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH);
  digitalWrite(STATUS_LED, LOW);
  
  // Connect to WiFi
  connectWiFi();
  
  // Setup MQTT
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  connectMQTT();
  
  // Setup Bluetooth Beacon
  setupBluetooth();
  
  Serial.println("\n✓ Setup Complete!");
  Serial.println("System is ready:");
  Serial.println("  📡 MQTT: Listening for power commands");
  Serial.println("  📶 Bluetooth: Broadcasting beacon");
  Serial.println("  ⚡ Relay: Ready to control power\n");
}

// ===========================
// MAIN LOOP
// ===========================
void loop() {
  // Maintain MQTT connection
  if (!mqttClient.connected()) {
    connectMQTT();
  }
  mqttClient.loop();
  
  // Heartbeat LED blink
  if (millis() - lastHeartbeat > 2000) {
    lastHeartbeat = millis();
    digitalWrite(STATUS_LED, !digitalRead(STATUS_LED));
    
    // Print status
    Serial.print("⚡ Status: WiFi=");
    Serial.print(WiFi.status() == WL_CONNECTED ? "✓" : "✗");
    Serial.print(" | MQTT=");
    Serial.print(mqttClient.connected() ? "✓" : "✗");
    Serial.print(" | BLE=✓");
    Serial.print(" | Power=");
    Serial.println(powerState ? "ON" : "OFF");
  }
}

// ===========================
// WiFi CONNECTION
// ===========================
void connectWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✓ WiFi Connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n✗ WiFi Connection Failed!");
  }
}

// ===========================
// MQTT CONNECTION
// ===========================
void connectMQTT() {
  while (!mqttClient.connected()) {
    Serial.print("Connecting to MQTT Broker...");
    
    String clientId = "ESP32_";
    clientId += String(ESP32_ID);
    clientId += "_";
    clientId += String(random(0xffff), HEX);
    
    if (mqttClient.connect(clientId.c_str())) {
      Serial.println(" ✓ Connected!");
      mqttClient.subscribe(CLASSROOM_TOPIC);
      Serial.print("✓ Subscribed to: ");
      Serial.println(CLASSROOM_TOPIC);
    } else {
      Serial.print(" ✗ Failed! RC=");
      Serial.println(mqttClient.state());
      delay(5000);
    }
  }
}

// ===========================
// MQTT MESSAGE CALLBACK
// ===========================
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  Serial.println("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  Serial.println("📨 MQTT Message Received!");
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  
  Serial.print("Topic: ");
  Serial.println(topic);
  Serial.print("Message: ");
  Serial.println(message);
  
  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, message);
  
  if (error) {
    Serial.print("✗ JSON Parse Error: ");
    Serial.println(error.c_str());
    return;
  }
  
  const char* action = doc["action"];
  
  if (action == nullptr) {
    Serial.println("✗ No 'action' field in message");
    return;
  }
  
  Serial.print("Action: ");
  Serial.println(action);
  
  if (strcmp(action, "POWER_ON") == 0) {
    powerOn();
  } else if (strcmp(action, "POWER_OFF") == 0) {
    powerOff();
  }
  
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

// ===========================
// POWER CONTROL
// ===========================
void powerOn() {
  Serial.println("⚡ TURNING POWER ON...");
  digitalWrite(RELAY_PIN, LOW);
  powerState = true;
  
  for (int i = 0; i < 5; i++) {
    digitalWrite(STATUS_LED, HIGH);
    delay(100);
    digitalWrite(STATUS_LED, LOW);
    delay(100);
  }
  
  Serial.println("✓ Power is now ON!");
}

void powerOff() {
  Serial.println("⚡ TURNING POWER OFF...");
  digitalWrite(RELAY_PIN, HIGH);
  powerState = false;
  
  for (int i = 0; i < 3; i++) {
    digitalWrite(STATUS_LED, HIGH);
    delay(300);
    digitalWrite(STATUS_LED, LOW);
    delay(300);
  }
  
  Serial.println("✓ Power is now OFF!");
}