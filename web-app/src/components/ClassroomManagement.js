import React, { useState, useEffect } from 'react';
import api from '../api/config';
import Button from './Button';
import Input from './Input';
import './ClassroomManagement.css';

const ClassroomManagement = () => {
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // 👉 NEW: Added wifiSSID and wifiPassword to state
  const [formData, setFormData] = useState({
    name: '', roomNumber: '', building: '', floor: '', capacity: '',
    wifiSSID: '', wifiPassword: '', 
    esp32Id: '', mqttTopic: ''
  });

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const fetchClassrooms = async () => {
    try {
      const response = await api.get('/admin/classrooms');
      setClassrooms(response.data.classrooms);
    } catch (error) {
      console.error('Failed to fetch classrooms', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let updatedData = { ...formData, [name]: value };

    // 👉 NEW: AUTO-FILL LOGIC! 
    // When the admin types a Room Number, it automatically builds the tech stuff
    if (name === 'roomNumber') {
      const cleanRoom = value.trim().replace(/\s+/g, '').toLowerCase();
      const cleanId = value.trim().replace(/\s+/g, '').toUpperCase();
      
      updatedData.mqttTopic = cleanRoom ? `classroom/${cleanRoom}` : '';
      updatedData.esp32Id = cleanId ? `ESP32_${cleanId}` : '';
    }

    setFormData(updatedData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/classrooms', {
        ...formData,
        capacity: Number(formData.capacity),
        floor: Number(formData.floor)
      });
      alert('✅ Classroom created successfully!');
      setShowAddForm(false);
      setFormData({ 
        name: '', roomNumber: '', building: '', floor: '', capacity: '',
        wifiSSID: '', wifiPassword: '', esp32Id: '', mqttTopic: '' 
      });
      fetchClassrooms();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to create classroom');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete ${name}? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/classrooms/${id}`);
      fetchClassrooms();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete classroom');
    }
  };
  const handleToggleStatus = async (id, name, currentStatus) => {
    if (!window.confirm(`Are you sure you want to ${currentStatus ? 'suspend' : 'activate'} ${name}?`)) return;
    try {
      await api.put(`/admin/classrooms/${id}/toggle`);
      fetchClassrooms(); // Refresh the list
    } catch (error) {
      alert('Failed to update classroom status');
    }
  };
  // Generate and download the customized ESP32 Code
  const downloadESP32Code = (room) => {
    const codeTemplate = `#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// ===== WiFi Credentials =====
const char* WIFI_SSID = "${room.wifiSSID}"; 
const char* WIFI_PASSWORD = "${room.wifiPassword}";

// ===== MQTT Configuration =====
const char* MQTT_BROKER = "broker.hivemq.com";
const int MQTT_PORT = 1883;
const char* ESP32_ID = "${room.esp32Id}";
const char* CLASSROOM_TOPIC = "${room.mqttTopic}";

// ===== Classroom Info =====
const char* ROOM_NUMBER = "${room.roomNumber}";
const char* CLASSROOM_NAME = "${room.name}";

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
  
  String beaconName = "CLASSROOM_" + String(ROOM_NUMBER);
  
  BLEDevice::init(beaconName.c_str());
  pServer = BLEDevice::createServer();
  pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID("180F"); 
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMinPreferred(0x12);
  
  BLEDevice::startAdvertising();
  
  Serial.println("✅ Bluetooth beacon active!");
  Serial.print("Beacon name: ");
  Serial.println(beaconName);
}

// ===========================
// SETUP FUNCTION
// ===========================
void setup() {
  Serial.begin(115200);
  Serial.println("\\n\\n=================================");
  Serial.println("ESP32 Classroom Controller v2.0");
  Serial.println("=================================\\n");
  
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(STATUS_LED, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH);
  digitalWrite(STATUS_LED, LOW);
  
  connectWiFi();
  
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  connectMQTT();
  
  setupBluetooth();
  
  Serial.println("\\n✓ Setup Complete!");
}

// ===========================
// MAIN LOOP
// ===========================
void loop() {
  if (!mqttClient.connected()) {
    connectMQTT();
  }
  mqttClient.loop();
  
  if (millis() - lastHeartbeat > 2000) {
    lastHeartbeat = millis();
    digitalWrite(STATUS_LED, !digitalRead(STATUS_LED));
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
    Serial.println("\\n✓ WiFi Connected!");
  }
}

// ===========================
// MQTT CONNECTION
// ===========================
void connectMQTT() {
  while (!mqttClient.connected()) {
    String clientId = "ESP32_";
    clientId += String(ESP32_ID);
    clientId += "_";
    clientId += String(random(0xffff), HEX);
    
    if (mqttClient.connect(clientId.c_str())) {
      mqttClient.subscribe(CLASSROOM_TOPIC);
    } else {
      delay(5000);
    }
  }
}

// ===========================
// MQTT MESSAGE CALLBACK
// ===========================
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  
  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, message);
  if (error) return;
  
  const char* action = doc["action"];
  if (action == nullptr) return;
  
  if (strcmp(action, "POWER_ON") == 0) {
    powerOn();
  } else if (strcmp(action, "POWER_OFF") == 0) {
    powerOff();
  }
}

// ===========================
// POWER CONTROL
// ===========================
void powerOn() {
  digitalWrite(RELAY_PIN, LOW);
  powerState = true;
}

void powerOff() {
  digitalWrite(RELAY_PIN, HIGH);
  powerState = false;
}`;

    const blob = new Blob([codeTemplate], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ESP32_${room.roomNumber}_Firmware.ino`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) return <p style={{ textAlign: 'center', padding: '20px' }}>Loading classrooms...</p>;

  return (
    <div className="classroom-management">
      <div className="section-header">
        <h2 className="section-title">Smart Classrooms</h2>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? 'Cancel' : '+ Add Classroom'}
        </Button>
      </div>

      {showAddForm && (
        <div className="add-classroom-form glass-panel">
          <h3>Register New Classroom</h3>
          <form onSubmit={handleSubmit} className="classroom-grid-form">
            <Input label="Classroom Name *" name="name" value={formData.name} onChange={handleChange} placeholder="e.g., IoT Lab" required />
            <Input label="Room Number *" name="roomNumber" value={formData.roomNumber} onChange={handleChange} placeholder="e.g., 304A" required />
            <Input label="Building" name="building" value={formData.building} onChange={handleChange} placeholder="e.g., Block B" />
            <Input label="Floor" name="floor" type="number" value={formData.floor} onChange={handleChange} placeholder="e.g., 3" />
            <Input label="Capacity" name="capacity" type="number" value={formData.capacity} onChange={handleChange} placeholder="e.g., 60" />
            
            {/* 👉 NEW: WiFi Configuration Fields */}
            <Input label="WiFi Network (SSID) *" name="wifiSSID" value={formData.wifiSSID} onChange={handleChange} placeholder="e.g., Institute_WiFi" required />
            <Input label="WiFi Password *" name="wifiPassword" type="password" value={formData.wifiPassword} onChange={handleChange} placeholder="Enter password" required />
            
            {/* 👉 AUTO-FILLED: The admin sees them, but can't accidentally break them */}
            <div style={{ opacity: 0.6, cursor: 'not-allowed' }}>
              <Input label="ESP32 Device ID (Auto-Generated)" name="esp32Id" value={formData.esp32Id} readOnly disabled />
            </div>
            <div style={{ opacity: 0.6, cursor: 'not-allowed' }}>
              <Input label="MQTT Topic (Auto-Generated)" name="mqttTopic" value={formData.mqttTopic} readOnly disabled />
            </div>
            
            <div className="form-actions">
              <Button type="submit">Save Classroom</Button>
            </div>
          </form>
        </div>
      )}

      <div className="classrooms-grid">
        {classrooms.length === 0 && !showAddForm ? (
          <div className="empty-state">No classrooms registered yet.</div>
        ) : (
          classrooms.map((room) => (
            <div key={room._id} className="classroom-card glass-panel">
              <div className="card-header">
                <h3>{room.name}</h3>
                <span className="room-badge" style={{ backgroundColor: room.isActive ? '' : 'rgba(239, 68, 68, 0.2)', color: room.isActive ? '' : '#ef4444' }}>{room.roomNumber} {room.isActive ? '' : '(Suspended)'}</span>
              </div>
              <div className="card-body">
                <p><span>Building:</span> {room.building || 'N/A'} (Floor {room.floor || 'N/A'})</p>
                <p><span>Capacity:</span> {room.capacity || 'N/A'} students</p>
                <p><span>WiFi:</span> 📶 {room.wifiSSID || 'Not set'}</p>
                
                <div className="iot-details">
                  <p>🔌 <strong>ESP32 ID:</strong> {room.esp32Id}</p>
                  <p>📡 <strong>Topic:</strong> {room.mqttTopic}</p>
                </div>
              </div>
              
              <div className="card-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '15px' }}>
                <Button 
                  variant="secondary" 
                  onClick={() => downloadESP32Code(room)} 
                  style={{ padding: '6px 12px', fontSize: '12px', flex: 1 }}
                >
                  📥 Download Code
                </Button>
                <Button 
                  variant={room.isActive ? "warning" : "success"} 
                  onClick={() => handleToggleStatus(room._id, room.name, room.isActive)} 
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  {room.isActive ? '⏸️ Suspend' : '▶️ Activate'}
                </Button>
                <Button 
                  variant="danger" 
                  onClick={() => handleDelete(room._id, room.name)} 
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ClassroomManagement;