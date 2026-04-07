#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ===== WiFi Credentials =====
const char* WIFI_SSID = "Redmi 10 Prime 2022";
const char* WIFI_PASSWORD = "12345678";


// ===== MQTT Configuration =====
const char* MQTT_BROKER = "broker.hivemq.com";
const int MQTT_PORT = 1883;
const char* ESP32_ID = "ESP32_001";
const char* CLASSROOM_TOPIC = "classroom/101";

// ===== Pin Configuration =====
const int RELAY_PIN = 26;        // Relay connected to GPIO 26
const int STATUS_LED = 2;        // Built-in LED on ESP32

// ===== Global Variables =====
WiFiClient espClient;
PubSubClient mqttClient(espClient);
unsigned long lastHeartbeat = 0;
bool powerState = false;
void reportNetworkInfo() {
  StaticJsonDocument<256> doc;
  
  doc["esp32Id"] = ESP32_ID;
  doc["classroomTopic"] = CLASSROOM_TOPIC;
  doc["wifiSSID"] = WiFi.SSID();
  doc["ipAddress"] = WiFi.localIP().toString();
  doc["subnetMask"] = WiFi.subnetMask().toString();
  doc["gateway"] = WiFi.gatewayIP().toString();
  doc["timestamp"] = millis();
  
  String output;
  serializeJson(doc, output);
  
  // Publish to status topic
  mqttClient.publish("classroom/101/status", output.c_str());
  
  Serial.println("📡 Network Info Published:");
  Serial.println(output);
}

// ===========================
// SETUP FUNCTION
// ===========================
void setup() {
  // Initialize Serial Monitor
  Serial.begin(115200);
  Serial.println("\n\n=================================");
  Serial.println("ESP32 Classroom Controller");
  Serial.println("=================================\n");
  
  // Initialize Pins
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(STATUS_LED, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH);  // <-- CHANGE TO HIGH (Relay OFF initially)
  digitalWrite(STATUS_LED, LOW);  // LED OFF initially
  
  // Connect to WiFi
  connectWiFi();
  
  // Setup MQTT
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  
  // Connect to MQTT Broker
  connectMQTT();
  reportNetworkInfo();
  
  Serial.println("\n✓ Setup Complete!");
  Serial.println("Waiting for commands...\n");
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
  
  // Heartbeat LED blink every 2 seconds
  if (millis() - lastHeartbeat > 2000) {
    lastHeartbeat = millis();
    digitalWrite(STATUS_LED, !digitalRead(STATUS_LED));
    
    // Print status
    Serial.print("⚡ Status: WiFi=");
    Serial.print(WiFi.status() == WL_CONNECTED ? "✓" : "✗");
    Serial.print(" | MQTT=");
    Serial.print(mqttClient.connected() ? "✓" : "✗");
    Serial.print(" | Power=");
    Serial.println(powerState ? "ON" : "OFF");
  }
  static unsigned long lastReport = 0;
  if (millis() - lastReport > 300000) { // 5 minutes
    lastReport = millis();
    reportNetworkInfo();
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
    Serial.println("Check SSID and Password!");
  }
}

// ===========================
// MQTT CONNECTION
// ===========================
void connectMQTT() {
  while (!mqttClient.connected()) {
    Serial.print("Connecting to MQTT Broker...");
    
    // Generate unique client ID
    String clientId = "ESP32_";
    clientId += String(ESP32_ID);
    clientId += "_";
    clientId += String(random(0xffff), HEX);
    
    if (mqttClient.connect(clientId.c_str())) {
      Serial.println(" ✓ Connected!");
      
      // Subscribe to classroom topic
      mqttClient.subscribe(CLASSROOM_TOPIC);
      Serial.print("✓ Subscribed to: ");
      Serial.println(CLASSROOM_TOPIC);
      
    } else {
      Serial.print(" ✗ Failed! RC=");
      Serial.println(mqttClient.state());
      Serial.println("Retrying in 5 seconds...");
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
  
  // Convert payload to string
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  
  Serial.print("Topic: ");
  Serial.println(topic);
  Serial.print("Message: ");
  Serial.println(message);
  
  // Parse JSON
  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, message);
  
  if (error) {
    Serial.print("✗ JSON Parse Error: ");
    Serial.println(error.c_str());
    return;
  }
  
  // Extract action
  const char* action = doc["action"];
  
  if (action == nullptr) {
    Serial.println("✗ No 'action' field in message");
    return;
  }
  
  Serial.print("Action: ");
  Serial.println(action);
  
  // Execute action
  if (strcmp(action, "POWER_ON") == 0) {
    powerOn();
  } 
  else if (strcmp(action, "POWER_OFF") == 0) {
    powerOff();
  }
  else {
    Serial.println("✗ Unknown action!");
  }
  
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

// ===========================
// POWER ON FUNCTION
// ===========================
void powerOn() {
  Serial.println("⚡ TURNING POWER ON...");
  digitalWrite(RELAY_PIN, LOW);  // <-- CHANGE TO LOW (Activate relay)
  powerState = true;
  
  // Visual feedback - rapid blink
  for (int i = 0; i < 5; i++) {
    digitalWrite(STATUS_LED, HIGH);
    delay(100);
    digitalWrite(STATUS_LED, LOW);
    delay(100);
  }
  
  Serial.println("✓ Power is now ON!");
}

// ===========================
// POWER OFF FUNCTION
// ===========================
void powerOff() {
  Serial.println("⚡ TURNING POWER OFF...");
  digitalWrite(RELAY_PIN, HIGH);   // <-- CHANGE TO HIGH (Deactivate relay)
  powerState = false;
  
  // Visual feedback - slow blink
  for (int i = 0; i < 3; i++) {
    digitalWrite(STATUS_LED, HIGH);
    delay(300);
    digitalWrite(STATUS_LED, LOW);
    delay(300);
  }
  
  Serial.println("✓ Power is now OFF!");
}