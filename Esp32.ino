#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <DHT.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <WiFiClientSecure.h>

// WiFi credentials
const char* ssid = "Dialog 4G";
const char* password = "200225403366";

// Ballerina server endpoint
const char* ballerina_server = "http://192.168.8.161/sensors";  // Change to your Ballerina server IP

// OLED display settings
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
#define SCREEN_ADDRESS 0x3C

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// Sensor pins
#define DHT_PIN 4
#define DHT_TYPE DHT22
#define SOIL_MOISTURE_PIN A0
#define SOIL_POWER_PIN 7
#define LDR_PIN A1
#define PH_PIN A2
#define DS18B20_PIN 5

// Actuator pins
#define FAN_PIN 12
#define HEATER_PIN 13
#define PUMP_PIN 14
#define LED_GROW_PIN 15
#define VENT_PIN 16
#define MIST_PIN 17
#define STATUS_LED 2

// Initialize sensors
DHT dht(DHT_PIN, DHT_TYPE);
OneWire oneWire(DS18B20_PIN);
DallasTemperature ds18b20(&oneWire);

// Web server
WebServer server(80);
HTTPClient http;

// Enhanced sensor data structure
struct SensorData {
  float airTemperature;
  float airHumidity;
  float soilTemperature;
  int soilMoisture;
  int lightLevel;
  float phLevel;
  float ec; // Electrical conductivity
  bool hasValidData;
  unsigned long lastUpdate;
};

// Control system structure
struct ControlData {
  bool fanState;
  bool heaterState;
  bool pumpState;
  bool growLightState;
  bool ventState;
  bool mistState;
  int fanSpeed; // PWM value 0-255
  int heaterLevel; // PWM value 0-255
  unsigned long lastControlUpdate;
};

// Setpoints and thresholds
struct Thresholds {
  float minTemp = 18.0;
  float maxTemp = 28.0;
  float minHumidity = 45.0;
  float maxHumidity = 75.0;
  int minSoilMoisture = 40;
  int maxSoilMoisture = 80;
  int minLightLevel = 300;
  float minPH = 6.0;
  float maxPH = 7.5;
};

// Customer and plant data
struct PlantProfile {
  String customerId;
  String customerName;
  String email;
  String plantId;
  String plantType;
  String growthStage;
  Thresholds thresholds;
  bool hasData;
};

// Global variables
SensorData sensors;
ControlData controls;
PlantProfile plantProfile;

// Display cycling
enum DisplayMode {
  DISPLAY_WELCOME,
  DISPLAY_SENSORS,
  DISPLAY_CONTROLS,
  DISPLAY_CUSTOMER,
  DISPLAY_ALERTS
};

DisplayMode currentDisplayMode = DISPLAY_WELCOME;
unsigned long lastDisplaySwitch = 0;
const unsigned long DISPLAY_INTERVAL = 3000;

// Timing variables
unsigned long lastSensorRead = 0;
unsigned long lastControlUpdate = 0;
unsigned long lastDataSend = 0;
const unsigned long SENSOR_INTERVAL = 5000;  // Read sensors every 5 seconds
const unsigned long CONTROL_INTERVAL = 10000; // Update controls every 10 seconds
const unsigned long DATA_SEND_INTERVAL = 30000; // Send data every 30 seconds

// Alert system
struct Alert {
  String message;
  String severity; // LOW, MEDIUM, HIGH, CRITICAL
  unsigned long timestamp;
  bool active;
};

Alert alerts[10];
int alertCount = 0;

void setup() {
  Serial.begin(115200);
  
  // Initialize pins
  pinMode(STATUS_LED, OUTPUT);
  pinMode(FAN_PIN, OUTPUT);
  pinMode(HEATER_PIN, OUTPUT);
  pinMode(PUMP_PIN, OUTPUT);
  pinMode(LED_GROW_PIN, OUTPUT);
  pinMode(VENT_PIN, OUTPUT);
  pinMode(MIST_PIN, OUTPUT);
  pinMode(SOIL_POWER_PIN, OUTPUT);
  
  // Initialize all outputs to OFF
  digitalWrite(FAN_PIN, LOW);
  digitalWrite(HEATER_PIN, LOW);
  digitalWrite(PUMP_PIN, LOW);
  digitalWrite(LED_GROW_PIN, LOW);
  digitalWrite(VENT_PIN, LOW);
  digitalWrite(MIST_PIN, LOW);
  digitalWrite(SOIL_POWER_PIN, LOW);
  
  // Initialize I2C
  Wire.begin(21, 22);
  
  // Initialize OLED display
  if(!display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) {
    Serial.println(F("SSD1306 allocation failed"));
    for(;;);
  }
  
  // Initialize sensors
  dht.begin();
  ds18b20.begin();
  
  // Initialize data structures
  sensors.hasValidData = false;
  plantProfile.hasData = false;
  controls.lastControlUpdate = 0;
  
  // Initialize display
  display.clearDisplay();
  displayBootMessage();
  
  // Connect to WiFi
  connectToWiFi();
  
  // Setup web server
  setupWebServer();
  
  // Initial sensor reading
  readAllSensors();
  
  Serial.println("Advanced Greenhouse Controller Ready!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  server.handleClient();
  
  unsigned long currentTime = millis();
  
  // Read sensors periodically
  if (currentTime - lastSensorRead >= SENSOR_INTERVAL) {
    readAllSensors();
    lastSensorRead = currentTime;
  }
  
  // Update controls periodically
  if (currentTime - lastControlUpdate >= CONTROL_INTERVAL) {
    updateControls();
    lastControlUpdate = currentTime;
  }
  
  // Send data to Ballerina server periodically
  if (currentTime - lastDataSend >= DATA_SEND_INTERVAL) {
    sendDataToBallerina();
    lastDataSend = currentTime;
  }
  
  // Handle display cycling
  handleDisplayCycling();
  
  // Status LED heartbeat
  static unsigned long lastHeartbeat = 0;
  if (currentTime - lastHeartbeat > 1000) {
    digitalWrite(STATUS_LED, !digitalRead(STATUS_LED));
    lastHeartbeat = currentTime;
  }
}

void readAllSensors() {
  Serial.println("Reading all sensors...");
  
  // Read DHT22
  sensors.airTemperature = dht.readTemperature();
  sensors.airHumidity = dht.readHumidity();
  
  // Read DS18B20 soil temperature
  ds18b20.requestTemperatures();
  sensors.soilTemperature = ds18b20.getTempCByIndex(0);
  
  // Read soil moisture
  digitalWrite(SOIL_POWER_PIN, HIGH);
  delay(100); // Let the sensor settle
  int soilValue = analogRead(SOIL_MOISTURE_PIN);
  digitalWrite(SOIL_POWER_PIN, LOW);
  sensors.soilMoisture = map(soilValue, 0, 4095, 100, 0); // Convert to percentage
  
  // Read light level
  int lightValue = analogRead(LDR_PIN);
  sensors.lightLevel = map(lightValue, 0, 4095, 0, 1000);
  
  // Read pH level (simplified - would need calibration)
  int phValue = analogRead(PH_PIN);
  sensors.phLevel = map(phValue, 0, 4095, 0, 14) / 100.0 + 6.0; // Approximate pH
  
  // Calculate EC (simplified)
  sensors.ec = (sensors.soilMoisture / 100.0) * 2.5; // Simplified EC calculation
  
  // Validate readings
  sensors.hasValidData = true;
  if (isnan(sensors.airTemperature) || isnan(sensors.airHumidity)) {
    sensors.hasValidData = false;
    Serial.println("DHT reading failed!");
  }
  
  if (sensors.soilTemperature == DEVICE_DISCONNECTED_C) {
    sensors.soilTemperature = sensors.airTemperature; // Use air temp as fallback
    Serial.println("DS18B20 reading failed, using air temperature");
  }
  
  sensors.lastUpdate = millis();
  
  // Check for alerts
  checkAlerts();
  
  // Print sensor readings
  Serial.println("=== Sensor Readings ===");
  Serial.println("Air Temp: " + String(sensors.airTemperature) + "°C");
  Serial.println("Air Humidity: " + String(sensors.airHumidity) + "%");
  Serial.println("Soil Temp: " + String(sensors.soilTemperature) + "°C");
  Serial.println("Soil Moisture: " + String(sensors.soilMoisture) + "%");
  Serial.println("Light Level: " + String(sensors.lightLevel));
  Serial.println("pH Level: " + String(sensors.phLevel));
  Serial.println("EC: " + String(sensors.ec) + " dS/m");
}

void updateControls() {
  if (!sensors.hasValidData || !plantProfile.hasData) {
    Serial.println("No valid data for control decisions");
    return;
  }
  
  Serial.println("Updating controls...");
  
  Thresholds& thresh = plantProfile.thresholds;
  
  // Temperature control
  if (sensors.airTemperature < thresh.minTemp) {
    // Too cold - turn on heater, turn off fan
    controls.heaterState = true;
    controls.fanState = false;
    controls.heaterLevel = map(thresh.minTemp - sensors.airTemperature, 0, 5, 50, 255);
    controls.heaterLevel = constrain(controls.heaterLevel, 0, 255);
    
    digitalWrite(HEATER_PIN, HIGH);
    analogWrite(FAN_PIN, 0);
    
    addAlert("Temperature too low: " + String(sensors.airTemperature) + "°C", "MEDIUM");
    
  } else if (sensors.airTemperature > thresh.maxTemp) {
    // Too hot - turn on fan, turn off heater
    controls.fanState = true;
    controls.heaterState = false;
    controls.fanSpeed = map(sensors.airTemperature - thresh.maxTemp, 0, 5, 100, 255);
    controls.fanSpeed = constrain(controls.fanSpeed, 0, 255);
    
    analogWrite(FAN_PIN, controls.fanSpeed);
    digitalWrite(HEATER_PIN, LOW);
    
    // Also open vents for extreme heat
    if (sensors.airTemperature > thresh.maxTemp + 3) {
      controls.ventState = true;
      digitalWrite(VENT_PIN, HIGH);
    }
    
    addAlert("Temperature too high: " + String(sensors.airTemperature) + "°C", "MEDIUM");
    
  } else {
    // Temperature OK
    controls.fanState = false;
    controls.heaterState = false;
    controls.ventState = false;
    digitalWrite(FAN_PIN, LOW);
    digitalWrite(HEATER_PIN, LOW);
    digitalWrite(VENT_PIN, LOW);
  }
  
  // Humidity control
  if (sensors.airHumidity < thresh.minHumidity) {
    // Too dry - turn on misting system
    controls.mistState = true;
    digitalWrite(MIST_PIN, HIGH);
    addAlert("Humidity too low: " + String(sensors.airHumidity) + "%", "LOW");
    
  } else if (sensors.airHumidity > thresh.maxHumidity) {
    // Too humid - ensure ventilation
    controls.mistState = false;
    controls.ventState = true;
    digitalWrite(MIST_PIN, LOW);
    digitalWrite(VENT_PIN, HIGH);
    addAlert("Humidity too high: " + String(sensors.airHumidity) + "%", "LOW");
    
  } else {
    controls.mistState = false;
    digitalWrite(MIST_PIN, LOW);
  }
  
  // Soil moisture control
  if (sensors.soilMoisture < thresh.minSoilMoisture) {
    // Soil too dry - turn on pump
    controls.pumpState = true;
    digitalWrite(PUMP_PIN, HIGH);
    addAlert("Soil moisture low: " + String(sensors.soilMoisture) + "%", "HIGH");
    
  } else if (sensors.soilMoisture >= thresh.maxSoilMoisture) {
    // Soil adequately moist
    controls.pumpState = false;
    digitalWrite(PUMP_PIN, LOW);
  }
  
  // Light control
  if (sensors.lightLevel < thresh.minLightLevel) {
    // Insufficient light - turn on grow lights
    controls.growLightState = true;
    digitalWrite(LED_GROW_PIN, HIGH);
  } else {
    // Sufficient natural light
    controls.growLightState = false;
    digitalWrite(LED_GROW_PIN, LOW);
  }
  
  // pH alerts (no direct control for now)
  if (sensors.phLevel < thresh.minPH || sensors.phLevel > thresh.maxPH) {
    addAlert("pH out of range: " + String(sensors.phLevel), "MEDIUM");
  }
  
  controls.lastControlUpdate = millis();
  
  // Print control status
  Serial.println("=== Control Status ===");
  Serial.println("Fan: " + String(controls.fanState ? "ON" : "OFF") + " (Speed: " + String(controls.fanSpeed) + ")");
  Serial.println("Heater: " + String(controls.heaterState ? "ON" : "OFF") + " (Level: " + String(controls.heaterLevel) + ")");
  Serial.println("Pump: " + String(controls.pumpState ? "ON" : "OFF"));
  Serial.println("Grow Light: " + String(controls.growLightState ? "ON" : "OFF"));
  Serial.println("Vent: " + String(controls.ventState ? "ON" : "OFF"));
  Serial.println("Mist: " + String(controls.mistState ? "ON" : "OFF"));
}

void sendDataToBallerina() {
  if (!sensors.hasValidData) {
    Serial.println("No valid sensor data to send");
    return;
  }
  
  Serial.println("Sending data to Ballerina server...");
  
  // Create JSON payload
  DynamicJsonDocument doc(2048);
  
  // Add sensor data
  JsonObject sensorData = doc.createNestedObject("sensors");
  sensorData["airTemperature"] = sensors.airTemperature;
  sensorData["airHumidity"] = sensors.airHumidity;
  sensorData["soilTemperature"] = sensors.soilTemperature;
  sensorData["soilMoisture"] = sensors.soilMoisture;
  sensorData["lightLevel"] = sensors.lightLevel;
  sensorData["phLevel"] = sensors.phLevel;
  sensorData["ec"] = sensors.ec;
  sensorData["timestamp"] = millis();
  
  // Add control data
  JsonObject controlData = doc.createNestedObject("controls");
  controlData["fanState"] = controls.fanState;
  controlData["fanSpeed"] = controls.fanSpeed;
  controlData["heaterState"] = controls.heaterState;
  controlData["heaterLevel"] = controls.heaterLevel;
  controlData["pumpState"] = controls.pumpState;
  controlData["growLightState"] = controls.growLightState;
  controlData["ventState"] = controls.ventState;
  controlData["mistState"] = controls.mistState;
  
  // Add plant profile data
  if (plantProfile.hasData) {
    JsonObject profile = doc.createNestedObject("plantProfile");
    profile["customerId"] = plantProfile.customerId;
    profile["plantId"] = plantProfile.plantId;
    profile["plantType"] = plantProfile.plantType;
    profile["growthStage"] = plantProfile.growthStage;
  }
  
  // Add device info
  doc["deviceId"] = WiFi.macAddress();
  doc["location"] = "Greenhouse_001";
  doc["timestamp"] = millis();
  
  // Send HTTP POST
  http.begin(String(ballerina_server) + "/greenhouse/data");
  http.addHeader("Content-Type", "application/json");
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  int httpResponseCode = http.POST(jsonString);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("Response code: " + String(httpResponseCode));
    Serial.println("Response: " + response);
    
    // Parse response for any control updates
    parseServerResponse(response);
    
  } else {
    Serial.println("HTTP POST failed: " + String(httpResponseCode));
  }
  
  http.end();
}

void parseServerResponse(String response) {
  DynamicJsonDocument doc(1024);
  DeserializationError error = deserializeJson(doc, response);
  
  if (!error && doc.containsKey("controlUpdates")) {
    Serial.println("Received control updates from server");
    
    JsonObject updates = doc["controlUpdates"];
    
    // Update thresholds if provided
    if (updates.containsKey("thresholds")) {
      JsonObject thresh = updates["thresholds"];
      if (thresh.containsKey("minTemp")) plantProfile.thresholds.minTemp = thresh["minTemp"];
      if (thresh.containsKey("maxTemp")) plantProfile.thresholds.maxTemp = thresh["maxTemp"];
      if (thresh.containsKey("minHumidity")) plantProfile.thresholds.minHumidity = thresh["minHumidity"];
      if (thresh.containsKey("maxHumidity")) plantProfile.thresholds.maxHumidity = thresh["maxHumidity"];
      if (thresh.containsKey("minSoilMoisture")) plantProfile.thresholds.minSoilMoisture = thresh["minSoilMoisture"];
      if (thresh.containsKey("maxSoilMoisture")) plantProfile.thresholds.maxSoilMoisture = thresh["maxSoilMoisture"];
      
      Serial.println("Updated thresholds from server");
    }
    
    // Manual control overrides
    if (updates.containsKey("manualControls")) {
      JsonObject manual = updates["manualControls"];
      // Implement manual control overrides here
      Serial.println("Manual controls received");
    }
  }
}

void checkAlerts() {
  // Clear old alerts (older than 1 hour)
  unsigned long currentTime = millis();
  for (int i = 0; i < alertCount; i++) {
    if (currentTime - alerts[i].timestamp > 3600000) { // 1 hour
      alerts[i].active = false;
    }
  }
  
  // Critical temperature alerts
  if (sensors.airTemperature < 5.0 || sensors.airTemperature > 40.0) {
    addAlert("CRITICAL: Temperature " + String(sensors.airTemperature) + "°C", "CRITICAL");
  }
  
  // Critical soil moisture alerts
  if (sensors.soilMoisture < 10) {
    addAlert("CRITICAL: Soil moisture " + String(sensors.soilMoisture) + "%", "CRITICAL");
  }
}

void addAlert(String message, String severity) {
  // Don't add duplicate alerts
  for (int i = 0; i < alertCount; i++) {
    if (alerts[i].message == message && alerts[i].active) {
      return;
    }
  }
  
  if (alertCount < 10) {
    alerts[alertCount].message = message;
    alerts[alertCount].severity = severity;
    alerts[alertCount].timestamp = millis();
    alerts[alertCount].active = true;
    alertCount++;
    
    Serial.println("ALERT [" + severity + "]: " + message);
  }
}

void connectToWiFi() {
  displayConnectingMessage();
  
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(1000);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("WiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
    
    displayWiFiConnected();
    delay(2000);
  } else {
    Serial.println();
    Serial.println("WiFi connection failed!");
    displayWiFiError();
  }
}

void setupWebServer() {
  // Plant profile endpoint
  server.on("/plant-profile", HTTP_POST, handlePlantProfile);
  
  // Manual control endpoint
  server.on("/controls", HTTP_POST, handleManualControls);
  
  // Get status endpoint
  server.on("/status", HTTP_GET, handleStatus);
  
  // Root endpoint with dashboard
  server.on("/", HTTP_GET, handleDashboard);
  
  // CORS handling
  server.on("/plant-profile", HTTP_OPTIONS, handleCORS);
  server.on("/controls", HTTP_OPTIONS, handleCORS);
  server.on("/status", HTTP_OPTIONS, handleCORS);
  
  server.begin();
  Serial.println("Web server started");
}

void handlePlantProfile() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  
  if (server.hasArg("plain")) {
    String body = server.arg("plain");
    Serial.println("Received plant profile: " + body);
    
    DynamicJsonDocument doc(1024);
    DeserializationError error = deserializeJson(doc, body);
    
    if (error) {
      server.send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
      return;
    }
    
    // Update plant profile
    plantProfile.customerId = doc["customerId"].as<String>();
    plantProfile.customerName = doc["customerName"].as<String>();
    plantProfile.email = doc["email"].as<String>();
    plantProfile.plantId = doc["plantId"].as<String>();
    plantProfile.plantType = doc["plantType"].as<String>();
    plantProfile.growthStage = doc["growthStage"].as<String>();
    
    // Update thresholds if provided
    if (doc.containsKey("thresholds")) {
      JsonObject thresh = doc["thresholds"];
      if (thresh.containsKey("minTemp")) plantProfile.thresholds.minTemp = thresh["minTemp"];
      if (thresh.containsKey("maxTemp")) plantProfile.thresholds.maxTemp = thresh["maxTemp"];
      if (thresh.containsKey("minHumidity")) plantProfile.thresholds.minHumidity = thresh["minHumidity"];
      if (thresh.containsKey("maxHumidity")) plantProfile.thresholds.maxHumidity = thresh["maxHumidity"];
      if (thresh.containsKey("minSoilMoisture")) plantProfile.thresholds.minSoilMoisture = thresh["minSoilMoisture"];
      if (thresh.containsKey("maxSoilMoisture")) plantProfile.thresholds.maxSoilMoisture = thresh["maxSoilMoisture"];
      if (thresh.containsKey("minLightLevel")) plantProfile.thresholds.minLightLevel = thresh["minLightLevel"];
      if (thresh.containsKey("minPH")) plantProfile.thresholds.minPH = thresh["minPH"];
      if (thresh.containsKey("maxPH")) plantProfile.thresholds.maxPH = thresh["maxPH"];
    }
    
    plantProfile.hasData = true;
    
    Serial.println("Plant profile updated for: " + plantProfile.customerName);
    Serial.println("Plant type: " + plantProfile.plantType);
    
    server.send(200, "application/json", "{\"status\":\"success\",\"message\":\"Plant profile updated\"}");
    
    // Blink LED to indicate profile received
    for(int i = 0; i < 6; i++) {
      digitalWrite(STATUS_LED, HIGH);
      delay(100);
      digitalWrite(STATUS_LED, LOW);
      delay(100);
    }
  } else {
    server.send(400, "application/json", "{\"error\":\"No data received\"}");
  }
}

void handleManualControls() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  
  if (server.hasArg("plain")) {
    String body = server.arg("plain");
    Serial.println("Received manual controls: " + body);
    
    DynamicJsonDocument doc(512);
    DeserializationError error = deserializeJson(doc, body);
    
    if (error) {
      server.send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
      return;
    }
    
    // Apply manual controls
    if (doc.containsKey("fan")) {
      bool fanOn = doc["fan"];
      digitalWrite(FAN_PIN, fanOn ? HIGH : LOW);
      controls.fanState = fanOn;
    }
    
    if (doc.containsKey("heater")) {
      bool heaterOn = doc["heater"];
      digitalWrite(HEATER_PIN, heaterOn ? HIGH : LOW);
      controls.heaterState = heaterOn;
    }
    
    if (doc.containsKey("pump")) {
      bool pumpOn = doc["pump"];
      digitalWrite(PUMP_PIN, pumpOn ? HIGH : LOW);
      controls.pumpState = pumpOn;
    }
    
    if (doc.containsKey("growLight")) {
      bool lightOn = doc["growLight"];
      digitalWrite(LED_GROW_PIN, lightOn ? HIGH : LOW);
      controls.growLightState = lightOn;
    }
    
    if (doc.containsKey("vent")) {
      bool ventOn = doc["vent"];
      digitalWrite(VENT_PIN, ventOn ? HIGH : LOW);
      controls.ventState = ventOn;
    }
    
    if (doc.containsKey("mist")) {
      bool mistOn = doc["mist"];
      digitalWrite(MIST_PIN, mistOn ? HIGH : LOW);
      controls.mistState = mistOn;
    }
    
    Serial.println("Manual controls applied");
    server.send(200, "application/json", "{\"status\":\"success\",\"message\":\"Controls updated\"}");
  } else {
    server.send(400, "application/json", "{\"error\":\"No data received\"}");
  }
}

void handleStatus() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  
  DynamicJsonDocument doc(2048);
  
  // Add sensor data
  JsonObject sensorData = doc.createNestedObject("sensors");
  sensorData["airTemperature"] = sensors.airTemperature;
  sensorData["airHumidity"] = sensors.airHumidity;
  sensorData["soilTemperature"] = sensors.soilTemperature;
  sensorData["soilMoisture"] = sensors.soilMoisture;
  sensorData["lightLevel"] = sensors.lightLevel;
  sensorData["phLevel"] = sensors.phLevel;
  sensorData["ec"] = sensors.ec;
  sensorData["hasValidData"] = sensors.hasValidData;
  
  // Add control data
  JsonObject controlData = doc.createNestedObject("controls");
  controlData["fanState"] = controls.fanState;
  controlData["fanSpeed"] = controls.fanSpeed;
  controlData["heaterState"] = controls.heaterState;
  controlData["heaterLevel"] = controls.heaterLevel;
  controlData["pumpState"] = controls.pumpState;
  controlData["growLightState"] = controls.growLightState;
  controlData["ventState"] = controls.ventState;
  controlData["mistState"] = controls.mistState;
  
  // Add alerts
  JsonArray alertArray = doc.createNestedArray("alerts");
  for (int i = 0; i < alertCount; i++) {
    if (alerts[i].active) {
      JsonObject alert = alertArray.createNestedObject();
      alert["message"] = alerts[i].message;
      alert["severity"] = alerts[i].severity;
      alert["timestamp"] = alerts[i].timestamp;
    }
  }
  
  // Add plant profile
  if (plantProfile.hasData) {
    JsonObject profile = doc.createNestedObject("plantProfile");
    profile["customerName"] = plantProfile.customerName;
    profile["plantType"] = plantProfile.plantType;
    profile["growthStage"] = plantProfile.growthStage;
  }
  
  // Add system info
  JsonObject system = doc.createNestedObject("system");
  system["deviceId"] = WiFi.macAddress();
  system["ipAddress"] = WiFi.localIP().toString();
  system["uptime"] = millis();
  system["freeHeap"] = ESP.getFreeHeap();
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  server.send(200, "application/json", jsonString);
}

void handleDashboard() {
  String html = "<!DOCTYPE html><html><head><title>Greenhouse Controller</title>";
  html += "<meta name='viewport' content='width=device-width, initial-scale=1'>";
  html += "<style>";
  html += "body { font-family: Arial, sans-serif; margin: 20px; background-color: #f0f8f0; }";
  html += ".container { max-width: 1200px; margin: 0 auto; }";
  html += ".card { background: white; border-radius: 10px; padding: 20px; margin: 10px 0; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }";
  html += ".header { background: #2e7d32; color: white; text-align: center; padding: 20px; border-radius: 10px; margin-bottom: 20px; }";
  html += ".sensor-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }";
  html += ".sensor { background: #e8f5e8; padding: 15px; border-radius: 8px; text-align: center; }";
  html += ".control { background: #fff3e0; padding: 10px; border-radius: 5px; margin: 5px; display: inline-block; }";
  html += ".status-on { color: #4caf50; font-weight: bold; }";
  html += ".status-off { color: #757575; }";
  html += ".alert { padding: 10px; margin: 5px 0; border-radius: 5px; }";
  html += ".alert-low { background: #e3f2fd; border-left: 4px solid #2196f3; }";
  html += ".alert-medium { background: #fff3e0; border-left: 4px solid #ff9800; }";
  html += ".alert-high { background: #ffebee; border-left: 4px solid #f44336; }";
  html += ".alert-critical { background: #ffcdd2; border-left: 4px solid #d32f2f; }";
  html += "button { background: #4caf50; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin: 5px; }";
  html += "button:hover { background: #45a049; }";
  html += ".refresh { text-align: center; margin: 20px 0; }";
  html += "</style>";
  html += "<script>";
  html += "function refreshData() { location.reload(); }";
  html += "function controlDevice(device, state) {";
  html += "  fetch('/controls', {";
  html += "    method: 'POST',";
  html += "    headers: { 'Content-Type': 'application/json' },";
  html += "    body: JSON.stringify({[device]: state})";
  html += "  }).then(response => response.json())";
  html += "    .then(data => { alert('Control updated: ' + data.message); refreshData(); });";
  html += "}";
  html += "setInterval(refreshData, 30000);"; // Auto-refresh every 30 seconds
  html += "</script>";
  html += "</head><body>";
  
  html += "<div class='container'>";
  html += "<div class='header'><h1>🌱 ECOGREEN360 Greenhouse Controller</h1>";
  html += "<p>IP: " + WiFi.localIP().toString() + " | Uptime: " + String(millis()/1000) + "s</p></div>";
  
  // Current readings
  if (sensors.hasValidData) {
    html += "<div class='card'><h2>📊 Current Sensor Readings</h2>";
    html += "<div class='sensor-grid'>";
    html += "<div class='sensor'><h3>🌡️ Air Temperature</h3><p>" + String(sensors.airTemperature, 1) + "°C</p></div>";
    html += "<div class='sensor'><h3>💧 Air Humidity</h3><p>" + String(sensors.airHumidity, 1) + "%</p></div>";
    html += "<div class='sensor'><h3>🌡️ Soil Temperature</h3><p>" + String(sensors.soilTemperature, 1) + "°C</p></div>";
    html += "<div class='sensor'><h3>💦 Soil Moisture</h3><p>" + String(sensors.soilMoisture) + "%</p></div>";
    html += "<div class='sensor'><h3>☀️ Light Level</h3><p>" + String(sensors.lightLevel) + "</p></div>";
    html += "<div class='sensor'><h3>⚗️ pH Level</h3><p>" + String(sensors.phLevel, 1) + "</p></div>";
    html += "</div></div>";
  } else {
    html += "<div class='card'><h2>⚠️ No Sensor Data Available</h2></div>";
  }
  
  // Control status
  html += "<div class='card'><h2>🎛️ Control Status</h2>";
  html += "<div class='control'>Fan: <span class='" + String(controls.fanState ? "status-on" : "status-off") + "'>" + String(controls.fanState ? "ON" : "OFF") + "</span></div>";
  html += "<div class='control'>Heater: <span class='" + String(controls.heaterState ? "status-on" : "status-off") + "'>" + String(controls.heaterState ? "ON" : "OFF") + "</span></div>";
  html += "<div class='control'>Pump: <span class='" + String(controls.pumpState ? "status-on" : "status-off") + "'>" + String(controls.pumpState ? "ON" : "OFF") + "</span></div>";
  html += "<div class='control'>Grow Light: <span class='" + String(controls.growLightState ? "status-on" : "status-off") + "'>" + String(controls.growLightState ? "ON" : "OFF") + "</span></div>";
  html += "<div class='control'>Ventilation: <span class='" + String(controls.ventState ? "status-on" : "status-off") + "'>" + String(controls.ventState ? "ON" : "OFF") + "</span></div>";
  html += "<div class='control'>Misting: <span class='" + String(controls.mistState ? "status-on" : "status-off") + "'>" + String(controls.mistState ? "ON" : "OFF") + "</span></div>";
  html += "</div>";
  
  // Manual controls
  html += "<div class='card'><h2>🎮 Manual Controls</h2>";
  html += "<button onclick='controlDevice(\"fan\", true)'>Fan ON</button>";
  html += "<button onclick='controlDevice(\"fan\", false)'>Fan OFF</button>";
  html += "<button onclick='controlDevice(\"heater\", true)'>Heater ON</button>";
  html += "<button onclick='controlDevice(\"heater\", false)'>Heater OFF</button>";
  html += "<button onclick='controlDevice(\"pump\", true)'>Pump ON</button>";
  html += "<button onclick='controlDevice(\"pump\", false)'>Pump OFF</button>";
  html += "<button onclick='controlDevice(\"growLight\", true)'>Light ON</button>";
  html += "<button onclick='controlDevice(\"growLight\", false)'>Light OFF</button>";
  html += "</div>";
  
  // Plant profile
  if (plantProfile.hasData) {
    html += "<div class='card'><h2>🌿 Plant Profile</h2>";
    html += "<p><strong>Customer:</strong> " + plantProfile.customerName + "</p>";
    html += "<p><strong>Plant Type:</strong> " + plantProfile.plantType + "</p>";
    html += "<p><strong>Growth Stage:</strong> " + plantProfile.growthStage + "</p>";
    html += "<p><strong>Temperature Range:</strong> " + String(plantProfile.thresholds.minTemp) + "°C - " + String(plantProfile.thresholds.maxTemp) + "°C</p>";
    html += "<p><strong>Humidity Range:</strong> " + String(plantProfile.thresholds.minHumidity) + "% - " + String(plantProfile.thresholds.maxHumidity) + "%</p>";
    html += "</div>";
  }
  
  // Alerts
  html += "<div class='card'><h2>🚨 Active Alerts</h2>";
  bool hasActiveAlerts = false;
  for (int i = 0; i < alertCount; i++) {
    if (alerts[i].active) {
      hasActiveAlerts = true;
      String alertClass = "alert-" + alerts[i].severity.toLowerCase();
      html += "<div class='alert " + alertClass + "'>";
      html += "<strong>" + alerts[i].severity + ":</strong> " + alerts[i].message;
      html += " <small>(" + String((millis() - alerts[i].timestamp) / 1000) + "s ago)</small>";
      html += "</div>";
    }
  }
  if (!hasActiveAlerts) {
    html += "<p style='color: #4caf50;'>✅ No active alerts</p>";
  }
  html += "</div>";
  
  html += "<div class='refresh'>";
  html += "<button onclick='refreshData()'>🔄 Refresh Data</button>";
  html += "</div>";
  
  html += "</div></body></html>";
  
  server.send(200, "text/html", html);
}

void handleCORS() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  server.send(200, "text/plain", "");
}

void handleDisplayCycling() {
  if (millis() - lastDisplaySwitch >= DISPLAY_INTERVAL) {
    lastDisplaySwitch = millis();
    
    // Cycle through different display modes
    switch (currentDisplayMode) {
      case DISPLAY_WELCOME:
        if (sensors.hasValidData) {
          currentDisplayMode = DISPLAY_SENSORS;
          displaySensorInfo();
        }
        break;
        
      case DISPLAY_SENSORS:
        currentDisplayMode = DISPLAY_CONTROLS;
        displayControlInfo();
        break;
        
      case DISPLAY_CONTROLS:
        if (plantProfile.hasData) {
          currentDisplayMode = DISPLAY_CUSTOMER;
          displayCustomerInfo();
        } else {
          currentDisplayMode = DISPLAY_ALERTS;
          displayAlertInfo();
        }
        break;
        
      case DISPLAY_CUSTOMER:
        currentDisplayMode = DISPLAY_ALERTS;
        displayAlertInfo();
        break;
        
      case DISPLAY_ALERTS:
        currentDisplayMode = DISPLAY_SENSORS;
        displaySensorInfo();
        break;
    }
  }
}

// Display functions
void displayBootMessage() {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println("ECOGREEN360");
  display.println("Greenhouse Controller");
  display.println();
  display.println("Initializing...");
  display.println("- Sensors");
  display.println("- WiFi");
  display.println("- Server");
  display.display();
}

void displayConnectingMessage() {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println("ECOGREEN360");
  display.println();
  display.println("Connecting to WiFi...");
  display.println(ssid);
  display.display();
}

void displayWiFiConnected() {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println("WiFi Connected!");
  display.println();
  display.print("IP: ");
  display.println(WiFi.localIP());
  display.println();
  display.println("Starting services...");
  display.display();
}

void displayWiFiError() {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println("WiFi Connection");
  display.println("FAILED!");
  display.println();
  display.println("Check credentials");
  display.println("and try again");
  display.display();
}

void displaySensorInfo() {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println("SENSORS [1/4]");
  display.drawLine(0, 10, SCREEN_WIDTH-1, 10, SSD1306_WHITE);
  
  if (sensors.hasValidData) {
    display.setCursor(0, 15);
    display.print("Air: ");
    display.print(sensors.airTemperature, 1);
    display.print("C ");
    display.print(sensors.airHumidity, 1);
    display.println("%");
    
    display.setCursor(0, 28);
    display.print("Soil: ");
    display.print(sensors.soilTemperature, 1);
    display.print("C ");
    display.print(sensors.soilMoisture);
    display.println("%");
    
    display.setCursor(0, 41);
    display.print("Light: ");
    display.print(sensors.lightLevel);
    display.print(" pH: ");
    display.println(sensors.phLevel, 1);
    
    display.setCursor(0, 54);
    display.print("Updated: ");
    display.print((millis() - sensors.lastUpdate) / 1000);
    display.println("s ago");
  } else {
    display.setCursor(0, 25);
    display.println("No valid sensor data");
  }
  
  display.display();
}

void displayControlInfo() {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println("CONTROLS [2/4]");
  display.drawLine(0, 10, SCREEN_WIDTH-1, 10, SSD1306_WHITE);
  
  display.setCursor(0, 15);
  display.print("Fan: ");
  display.print(controls.fanState ? "ON" : "OFF");
  display.print(" Heater: ");
  display.println(controls.heaterState ? "ON" : "OFF");
  
  display.setCursor(0, 28);
  display.print("Pump: ");
  display.print(controls.pumpState ? "ON" : "OFF");
  display.print(" Light: ");
  display.println(controls.growLightState ? "ON" : "OFF");
  
  display.setCursor(0, 41);
  display.print("Vent: ");
  display.print(controls.ventState ? "ON" : "OFF");
  display.print(" Mist: ");
  display.println(controls.mistState ? "ON" : "OFF");
  
  display.setCursor(0, 54);
  display.print("Auto Control: ACTIVE");
  
  display.display();
}

void displayCustomerInfo() {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println("CUSTOMER [3/4]");
  display.drawLine(0, 10, SCREEN_WIDTH-1, 10, SSD1306_WHITE);
  
  if (plantProfile.hasData) {
    display.setCursor(0, 15);
    display.print("Name: ");
    String name = plantProfile.customerName;
    if (name.length() > 16) name = name.substring(0, 13) + "...";
    display.println(name);
    
    display.setCursor(0, 28);
    display.print("Plant: ");
    String plant = plantProfile.plantType;
    if (plant.length() > 15) plant = plant.substring(0, 12) + "...";
    display.println(plant);
    
    display.setCursor(0, 41);
    display.print("Stage: ");
    display.println(plantProfile.growthStage);
    
    display.setCursor(0, 54);
    display.print("ID: ");
    display.println(plantProfile.plantId);
  } else {
    display.setCursor(0, 25);
    display.println("No plant profile");
    display.println("configured");
  }
  
  display.display();
}

void displayAlertInfo() {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println("ALERTS [4/4]");
  display.drawLine(0, 10, SCREEN_WIDTH-1, 10, SSD1306_WHITE);
  
  int activeAlerts = 0;
  int yPos = 15;
  
  for (int i = 0; i < alertCount && yPos < 55; i++) {
    if (alerts[i].active) {
      activeAlerts++;
      display.setCursor(0, yPos);
      
      // Display severity indicator
      if (alerts[i].severity == "CRITICAL") display.print("!!! ");
      else if (alerts[i].severity == "HIGH") display.print("!! ");
      else if (alerts[i].severity == "MEDIUM") display.print("! ");
      else display.print("- ");
      
      // Display truncated message
      String msg = alerts[i].message;
      if (msg.length() > 17) msg = msg.substring(0, 14) + "...";
      display.println(msg);
      
      yPos += 13;
    }
  }
  
  if (activeAlerts == 0) {
    display.setCursor(0, 30);
    display.println("No active alerts");
    display.setCursor(0, 43);
    display.println("System OK");
  }
  
  display.display();
}

String getSensorStatus(float value, float min, float max) {
  if (value < min) return "LOW";
  if (value > max) return "HIGH";
  return "OK";
}
