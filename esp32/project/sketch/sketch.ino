#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ============================================
// CONFIGURATION
// ============================================

// WiFi Credentials (Wokwi simulation - these work automatically)
const char* WIFI_SSID = "Wokwi-GUEST";
const char* WIFI_PASSWORD = "";

// MQTT Broker
const char* MQTT_BROKER = "broker.hivemq.com";
const int MQTT_PORT = 1883;

// Classroom Configuration (MUST match MongoDB)
const char* ESP32_ID = "ESP32_001";
const char* CLASSROOM_TOPIC = "classroom/101";

// Hardware Configuration
const int RELAY_PIN = 26;        // GPIO 26 for relay
const int LED_PIN = 2;           // Built-in LED
const int STATUS_LED = 15;       // Additional status LED

// ============================================
// GLOBAL VARIABLES
// ============================================

WiFiClient espClient;
PubSubClient mqttClient(espClient);

bool powerState = false;
unsigned long powerOnTime = 0;
unsigned long scheduledDuration = 0;
String currentLectureId = "";

// ============================================
// SETUP
// ============================================

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n\n================================");
  Serial.println("CLASSROOM POWER CONTROLLER");
  Serial.println("Wokwi Simulation");
  Serial.println("================================");
  Serial.println("ESP32 ID: " + String(ESP32_ID));
  Serial.println("Topic: " + String(CLASSROOM_TOPIC));
  Serial.println("================================\n");

  // Initialize GPIO pins
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  pinMode(STATUS_LED, OUTPUT);
  
  digitalWrite(RELAY_PIN, LOW);
  digitalWrite(LED_PIN, LOW);
  digitalWrite(STATUS_LED, LOW);

  // Startup animation
  blinkLED(3, 200);

  // Connect to WiFi
  connectWiFi();

  // Configure MQTT
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  mqttClient.setKeepAlive(60);
  mqttClient.setSocketTimeout(30);

  // Connect to MQTT
  connectMQTT();
  
  Serial.println("\n✅ System Ready!");
  Serial.println("Waiting for commands...\n");
}

// ============================================
// MAIN LOOP
// ============================================

void loop() {
  // Maintain WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️  WiFi disconnected. Reconnecting...");
    connectWiFi();
  }

  // Maintain MQTT connection
  if (!mqttClient.connected()) {
    Serial.println("⚠️  MQTT disconnected. Reconnecting...");
    connectMQTT();
  }
  mqttClient.loop();

  // Check if auto-off time has been reached
  if (powerState && scheduledDuration > 0) {
    unsigned long elapsed = (millis() - powerOnTime) / 1000; // seconds
    unsigned long remaining = scheduledDuration - elapsed;
    
    // Print remaining time every 30 seconds
    static unsigned long lastPrint = 0;
    if (millis() - lastPrint > 30000) {
      Serial.println("⏰ Time remaining: " + String(remaining / 60) + " min " + String(remaining % 60) + " sec");
      lastPrint = millis();
    }
    
    if (elapsed >= scheduledDuration) {
      Serial.println("\n⏰ Scheduled duration reached!");
      turnPowerOff();
    }
  }

  // Blink status LED when connected
  static unsigned long lastBlink = 0;
  if (millis() - lastBlink > 1000) {
    digitalWrite(STATUS_LED, !digitalRead(STATUS_LED));
    lastBlink = millis();
  }
}

// ============================================
// WIFI CONNECTION
// ============================================

void connectWiFi() {
  Serial.print("🌐 Connecting to WiFi");

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi Connected!");
    Serial.print("📍 IP Address: ");
    Serial.println(WiFi.localIP());
    digitalWrite(LED_PIN, HIGH);
    delay(500);
    digitalWrite(LED_PIN, LOW);
  } else {
    Serial.println("\n❌ WiFi Connection Failed!");
    delay(5000);
  }
}

// ============================================
// MQTT CONNECTION
// ============================================

void connectMQTT() {
  int attempts = 0;
  while (!mqttClient.connected() && attempts < 3) {
    Serial.print("📡 Connecting to MQTT broker");

    String clientId = "ESP32_" + String(ESP32_ID) + "_" + String(random(0xffff), HEX);

    if (mqttClient.connect(clientId.c_str())) {
      Serial.println(" ✅ Connected!");

      // Subscribe to classroom topic
      if (mqttClient.subscribe(CLASSROOM_TOPIC)) {
        Serial.println("✅ Subscribed to: " + String(CLASSROOM_TOPIC));
        
        // Publish online status
        String statusTopic = String(CLASSROOM_TOPIC) + "/status";
        mqttClient.publish(statusTopic.c_str(), "{\"status\":\"online\",\"esp32_id\":\"ESP32_001\"}");
        
        // Blink to confirm
        blinkLED(2, 100);
      } else {
        Serial.println("❌ Failed to subscribe!");
      }

    } else {
      Serial.print(" ❌ Failed! RC=");
      Serial.println(mqttClient.state());
      attempts++;
      delay(2000);
    }
  }
}

// ============================================
// MQTT CALLBACK
// ============================================

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  Serial.println("\n" + String("=").substring(0, 50));
  Serial.println("📨 INCOMING MESSAGE");
  Serial.println(String("=").substring(0, 50));
  Serial.println("Topic: " + String(topic));

  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.println("Payload: " + message);
  Serial.println(String("=").substring(0, 50));

  // Parse JSON
  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, message);

  if (error) {
    Serial.println("❌ JSON parsing failed: " + String(error.c_str()));
    return;
  }

  const char* action = doc["action"];
  
  if (action == nullptr) {
    Serial.println("❌ No 'action' field found");
    return;
  }

  Serial.println("🎬 Action: " + String(action));

  if (strcmp(action, "POWER_ON") == 0) {
    int duration = doc["duration"] | 60;
    const char* lectureId = doc["lectureId"] | "unknown";
    
    currentLectureId = String(lectureId);
    turnPowerOn(duration);

  } else if (strcmp(action, "POWER_OFF") == 0) {
    turnPowerOff();

  } else {
    Serial.println("❌ Unknown action: " + String(action));
  }
}

// ============================================
// POWER CONTROL
// ============================================

void turnPowerOn(int durationMinutes) {
  Serial.println("\n🔌 " + String("=").substring(0, 40));
  Serial.println("🔌 ACTIVATING CLASSROOM POWER");
  Serial.println("🔌 " + String("=").substring(0, 40));
  Serial.println("📚 Lecture ID: " + currentLectureId);
  Serial.println("⏱️  Duration: " + String(durationMinutes) + " minutes");
  Serial.println("🔌 " + String("=").substring(0, 40) + "\n");

  digitalWrite(RELAY_PIN, HIGH);
  digitalWrite(LED_PIN, HIGH);
  
  powerState = true;
  powerOnTime = millis();
  scheduledDuration = durationMinutes * 60;

  String statusTopic = String(CLASSROOM_TOPIC) + "/status";
  String statusMsg = "{\"status\":\"power_on\",\"lecture_id\":\"" + currentLectureId + "\"}";
  mqttClient.publish(statusTopic.c_str(), statusMsg.c_str());

  Serial.println("✅ POWER IS NOW ON");
  Serial.println("⏰ Will auto-off in " + String(durationMinutes) + " minutes\n");
  
  blinkLED(5, 100);
}

void turnPowerOff() {
  Serial.println("\n🔌 " + String("=").substring(0, 40));
  Serial.println("🔌 DEACTIVATING CLASSROOM POWER");
  Serial.println("🔌 " + String("=").substring(0, 40) + "\n");

  digitalWrite(RELAY_PIN, LOW);
  digitalWrite(LED_PIN, LOW);
  
  powerState = false;
  scheduledDuration = 0;

  String statusTopic = String(CLASSROOM_TOPIC) + "/status";
  mqttClient.publish(statusTopic.c_str(), "{\"status\":\"power_off\"}");

  Serial.println("✅ POWER IS NOW OFF\n");
  
  blinkLED(3, 200);
  
  currentLectureId = "";
}

// ============================================
// UTILITIES
// ============================================

void blinkLED(int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(delayMs);
    digitalWrite(LED_PIN, LOW);
    delay(delayMs);
  }
}
