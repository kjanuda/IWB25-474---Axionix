import ballerina/http;
import ballerina/sql;
import ballerinax/java.jdbc as jdbc;
import ballerinax/mysql.driver as _;
import ballerina/websocket;
import ballerina/io;
import ballerina/time;


// Configurable Variables
configurable string host = ?;
configurable int port = ?;
configurable string username = ?;
configurable string password = ?;
configurable string database = ?;
configurable string geminiApiKey = ?;
configurable string unsplashApiKey = ?;

string jdbcUrl = string `jdbc:mysql://${host}:${port}/${database}`;

// WebSocket Config for Alerts
listener websocket:Listener alertListener = new websocket:Listener(9095);
isolated map<websocket:Caller> clientsMap = {};

// WebSocket Config for ESP32 Real-time Communication
listener websocket:Listener esp32Listener = new websocket:Listener(9096);
isolated map<websocket:Caller> esp32ClientsMap = {};

service /subscribe on alertListener {
    resource function get [string name](http:Request req) returns websocket:Service|websocket:UpgradeError {
        return new UserService(name);
    }
}

service /esp32 on esp32Listener {
    resource function get .(http:Request req) returns websocket:Service|websocket:UpgradeError {
        return new ESP32Service();
    }
}

service class UserService {
    *websocket:Service;
    final string userName;

    public isolated function init(string username) {
        self.userName = username;
    }

    remote function onOpen(websocket:Caller caller) returns websocket:Error? {
        io:println("🔔 WebSocket connected: " + self.userName);
        lock {
            clientsMap[caller.getConnectionId()] = caller;
        }
    }

    isolated remote function onClose(websocket:Caller caller, int statusCode, string reason) {
        lock {
            _ = clientsMap.remove(caller.getConnectionId());
            io:println("❌ " + self.userName + " disconnected.");
        }
    }
}

service class ESP32Service {
    *websocket:Service;

    remote function onOpen(websocket:Caller caller) returns websocket:Error? {
        io:println("🤖 ESP32 WebSocket connected: " + caller.getConnectionId());
        lock {
            esp32ClientsMap[caller.getConnectionId()] = caller;
        }
        
        // Send initial greenhouse data to newly connected ESP32
        // Create a simple initial command directly here  
        GreenhouseCommand initialCommand = {
            commandType: "INITIAL_SETUP",
            timestamp: getCurrentTimestamp(),
            temperature: {
                target: 24.0,
                tolerance: 2.0,
                heatingEnabled: true,
                coolingEnabled: true
            },
            humidity: {
                target: 65.0,
                tolerance: 10.0,
                humidifierEnabled: true,
                dehumidifierEnabled: true
            },
            ventilation: {
                fanSpeed: 50,
                autoVentEnabled: true
            },
            irrigation: (),
            lighting: ()
        };
        
        json|error commandJson = initialCommand.cloneWithType(json);
        if commandJson is json {
            websocket:Error? result = caller->writeMessage(commandJson.toJsonString());
            if result is websocket:Error {
                io:println("❌ Failed to send initial data to ESP32: " + result.message());
            }
        }
    }

    isolated remote function onMessage(websocket:Caller caller, string message) returns websocket:Error? {
        // Parse ESP32 sensor data and store in database
        json|error parsedMessage = message.fromJsonString();
        if parsedMessage is json {
            ESP32SensorData|error sensorData = parsedMessage.cloneWithType(ESP32SensorData);
            if sensorData is ESP32SensorData {
                // Process sensor data
                // Note: Processing moved to HTTP endpoint for proper database access
            }
        }
    }

    remote isolated function onClose(websocket:Caller caller, int statusCode, string reason) {
        lock {
            _ = esp32ClientsMap.remove(caller.getConnectionId());
            io:println("❌ ESP32 disconnected: " + reason);
        }
    }
}

// Broadcast functions
function broadcast(string msg) {
    lock {
        foreach string connectionId in clientsMap.keys() {
            websocket:Caller? con = clientsMap[connectionId];
            if con is websocket:Caller {
                io:println("📢 Broadcasting: " + msg);
                websocket:Error? err = con->writeMessage(msg);
                if err is websocket:Error {
                    io:println("⚠️ Error sending: " + err.message());
                }
            }
        }
    }
}

function broadcastToESP32(GreenhouseCommand command) {
    json|error commandJson = command.cloneWithType(json);
    if commandJson is json {
        string commandJsonString = commandJson.toJsonString();
        lock {
            foreach string connectionId in esp32ClientsMap.keys() {
                websocket:Caller? con = esp32ClientsMap[connectionId];
                if con is websocket:Caller {
                    io:println("🤖 Sending to ESP32: " + commandJsonString);
                    websocket:Error? err = con->writeMessage(commandJsonString);
                    if err is websocket:Error {
                        io:println("⚠️ Error sending to ESP32: " + err.message());
                    }
                }
            }
        }
    }
}

@http:ServiceConfig {
    cors: {
        allowOrigins: ["http://localhost:5173"],
        allowCredentials: true,
        allowHeaders: ["Content-Type"],
        allowMethods: ["GET", "POST", "OPTIONS", "PUT", "DELETE"]
    }
}
service /api on new http:Listener(7071) {
    final sql:Client dbClient;
    final http:Client geminiClient;
    final http:Client unsplashClient;

    function init() returns error? {
        self.dbClient = check new jdbc:Client(jdbcUrl, username, password);
        self.geminiClient = check new http:Client("https://generativelanguage.googleapis.com");
        self.unsplashClient = check new http:Client("https://api.unsplash.com");
        check initAllTables(self.dbClient);
    }

    // ESP32 endpoint to get greenhouse operational data
    resource function get esp32/greenhouse/data() returns GreenhouseOperationalData|error {
        io:println("🤖 ESP32 requesting greenhouse data");
        
        // Get latest plant data for operational parameters
        PlantData[]|error plants = getPlantData(self.dbClient);
        if plants is error {
            return error("Failed to get plant data: " + plants.message());
        }

        // Get active environmental settings
        EnvironmentalSettings envSettings = check getEnvironmentalSettingsFromDB(self.dbClient);

        // Get active irrigation schedule
        IrrigationSchedule[] irrigation = check getIrrigationSchedulesFromDB(self.dbClient);

        // Get lighting schedule
        LightingSchedule[] lighting = check getLightingSchedulesFromDB(self.dbClient);

        GreenhouseOperationalData operationalData = {
            timestamp: getCurrentTimestamp(),
            environmental: envSettings,
            irrigation: irrigation,
            lighting: lighting,
            plantCount: plants.length(),
            activeAlerts: []
        };

        io:println("✅ Sending operational data to ESP32");
        return operationalData;
    }

    // ESP32 endpoint to post sensor readings
    resource function post esp32/sensors(@http:Payload ESP32SensorData sensorData) returns GreenhouseCommand|error {
        io:println("📊 Received sensor data from ESP32");
        
        // Store sensor data
        check storeSensorData(self.dbClient, sensorData);
        
        // Analyze data and generate commands
        GreenhouseCommand command = check generateGreenhouseCommand(self.dbClient, sensorData);
        
        // Broadcast to ESP32 via WebSocket as well
        broadcastToESP32(command);
        
        io:println("🤖 Sending command back to ESP32");
        return command;
    }

    // Endpoint to update environmental settings (triggers ESP32 update)
    resource function post greenhouse/environmental(@http:Payload EnvironmentalSettings settings) returns http:Ok|error {
        check updateEnvironmentalSettingsInDB(self.dbClient, settings);
        
        // Get current operational data and send to ESP32
        GreenhouseOperationalData|error opData = getGreenhouseOperationalData(self.dbClient);
        if opData is GreenhouseOperationalData {
            GreenhouseCommand command = {
                commandType: "ENVIRONMENTAL_UPDATE",
                timestamp: getCurrentTimestamp(),
                temperature: {
                    target: settings.targetTemperature,
                    tolerance: settings.temperatureTolerance,
                    heatingEnabled: settings.heatingEnabled,
                    coolingEnabled: settings.coolingEnabled
                },
                humidity: {
                    target: settings.targetHumidity,
                    tolerance: settings.humidityTolerance,
                    humidifierEnabled: settings.humidifierEnabled,
                    dehumidifierEnabled: settings.dehumidifierEnabled
                },
                ventilation: {
                    fanSpeed: settings.fanSpeed,
                    autoVentEnabled: settings.autoVentEnabled
                },
                irrigation: (),
                lighting: ()
            };
            broadcastToESP32(command);
        }
        
        return http:OK;
    }

    // Endpoint to update irrigation schedule (triggers ESP32 update)
    resource function post greenhouse/irrigation(@http:Payload IrrigationSchedule schedule) returns http:Ok|error {
        check addIrrigationScheduleToDB(self.dbClient, schedule);
        
        // Send updated irrigation command to ESP32
        GreenhouseCommand command = {
            commandType: "IRRIGATION_UPDATE",
            timestamp: getCurrentTimestamp(),
            temperature: (),
            humidity: (),
            ventilation: (),
            irrigation: {
                zoneId: schedule.zoneId,
                duration: schedule.duration,
                startTime: schedule.startTime,
                frequency: schedule.frequency,
                enabled: schedule.enabled
            },
            lighting: ()
        };
        broadcastToESP32(command);
        
        return http:OK;
    }

    // Endpoint to update lighting schedule (triggers ESP32 update)
    resource function post greenhouse/lighting(@http:Payload LightingSchedule schedule) returns http:Ok|error {
        check addLightingScheduleToDB(self.dbClient, schedule);
        
        // Send updated lighting command to ESP32
        GreenhouseCommand command = {
            commandType: "LIGHTING_UPDATE",
            timestamp: getCurrentTimestamp(),
            temperature: (),
            humidity: (),
            ventilation: (),
            irrigation: (),
            lighting: {
                zoneId: schedule.zoneId,
                intensity: schedule.intensity,
                onTime: schedule.onTime,
                offTime: schedule.offTime,
                enabled: schedule.enabled
            }
        };
        broadcastToESP32(command);
        
        return http:OK;
    }

    // Emergency stop endpoint
    resource function post esp32/emergency/stop() returns http:Ok|error {
        GreenhouseCommand emergencyCommand = {
            commandType: "EMERGENCY_STOP",
            timestamp: getCurrentTimestamp(),
            temperature: (),
            humidity: (),
            ventilation: (),
            irrigation: (),
            lighting: ()
        };
        
        broadcastToESP32(emergencyCommand);
        io:println("🚨 Emergency stop sent to ESP32");
        return http:OK;
    }

    // Get sensor history
    resource function get esp32/sensors/history(int 'limit = 100) returns ESP32SensorData[]|error {
        stream<ESP32SensorData, sql:Error?> sensorStream = self.dbClient->query(`
            SELECT deviceId, temperature, humidity, soilMoisture, lightLevel, 
                   co2Level, phLevel, waterLevel, timestamp 
            FROM SensorData 
            ORDER BY timestamp DESC 
            LIMIT ${'limit}
        `);

        ESP32SensorData[] sensors = [];
        check from ESP32SensorData sensor in sensorStream
            do {
                sensors.push(sensor);
            };

        check sensorStream.close();
        return sensors;
    }

    // Plant analysis endpoint
    resource function post plant/analyze(@http:Payload PlantAnalysisRequest request) returns PlantAnalysisResponse|error {
        io:println("🌱 Analyzing plant: " + request.plantName);

        PlantInfo|error plantInfoResult = getPlantInfoFromGemini(self.geminiClient, request.plantName);
        if plantInfoResult is error {
            io:println("❌ Error getting plant info from Gemini: " + plantInfoResult.message());
            return error("Failed to get plant information: " + plantInfoResult.message());
        }

        string|error imageUrlResult = getPlantImageFromUnsplash(self.unsplashClient, request.plantName);
        if imageUrlResult is error {
            io:println("⚠️ Warning: Could not fetch image from Unsplash: " + imageUrlResult.message());
        }

        PlantAnalysisResponse response = {
            plantInfo: plantInfoResult,
            imageUrl: imageUrlResult is string ? imageUrlResult : "",
            timestamp: getCurrentTimestamp()
        };

        io:println("✅ Plant analysis completed for: " + request.plantName);
        return response;
    }

    // Alert endpoints
    resource function get alerts() returns Alert[]|error {
        stream<Alert, sql:Error?> alertStream = self.dbClient->query(`
            SELECT ID, DESCRIPTION, CATEGORY, TIMESTAMP 
            FROM ALERTS5 
            ORDER BY TIMESTAMP DESC
        `);

        Alert[] alerts = [];
        check from Alert alert in alertStream
            do {
                alerts.push(alert);
            };

        check alertStream.close();
        return alerts;
    }

    resource function get alerts/[int id]() returns Alert|http:NotFound|error {
        Alert|sql:Error result = self.dbClient->queryRow(`
            SELECT ID, DESCRIPTION, CATEGORY, TIMESTAMP 
            FROM ALERTS5 
            WHERE ID = ${id}
        `);

        if result is sql:NoRowsError {
            return http:NOT_FOUND;
        }

        if result is sql:Error {
            return result;
        }

        return result;
    }

    resource function get alerts/category/[string category]() returns Alert[]|error {
        stream<Alert, sql:Error?> alertStream = self.dbClient->query(`
            SELECT ID, DESCRIPTION, CATEGORY, TIMESTAMP 
            FROM ALERTS5 
            WHERE CATEGORY = ${category}
            ORDER BY TIMESTAMP DESC
        `);

        Alert[] alerts = [];
        check from Alert alert in alertStream
            do {
                alerts.push(alert);
            };

        check alertStream.close();
        return alerts;
    }

    resource function post alerts(@http:Payload NewAlert newAlert) returns AlertCreated|error {
        string timestamp = getCurrentTimestamp();

        sql:ExecutionResult result = check self.dbClient->execute(`
            INSERT INTO ALERTS5 (DESCRIPTION, CATEGORY, TIMESTAMP)
            VALUES (${newAlert.description}, ${newAlert.category}, ${timestamp})
        `);

        int|string? alertId = result.lastInsertId;
        if alertId is int {
            Alert alert = {
                id: alertId,
                description: newAlert.description,
                category: newAlert.category,
                timestamp: timestamp
            };

            string msg = string `New Alert: ${newAlert.description} at ${timestamp}`;
            broadcast(msg);
            
            // Send alert to ESP32 if critical
            if newAlert.category == "CRITICAL" {
                GreenhouseCommand alertCommand = {
                    commandType: "ALERT",
                    timestamp: getCurrentTimestamp(),
                    temperature: (),
                    humidity: (),
                    ventilation: (),
                    irrigation: (),
                    lighting: ()
                };
                broadcastToESP32(alertCommand);
            }
            
            return { body: alert };
        }
        return error("Insert failed");
    }

    // Plant data endpoints
    resource function get greenhouse/plants() returns PlantData[]|error {
        return getPlantData(self.dbClient);
    }

    resource function get greenhouse/plants/[int id]() returns PlantData|http:NotFound|error {
        PlantData|sql:Error result = self.dbClient->queryRow(`
            SELECT ID, treeSpecies, purpose, expectedHeight, rootSpread, sunlightNeeds, 
                   wateringFrequency, temperatureRange, humidityPreference, availableSpace,
                   plantingMethod, drainageSystem, supportStructures, supportDescription,
                   soilTypeRequired, currentSoilType, fertilizerPlan, pruningSchedule,
                   pestControl, pollinationMethod, plantingDate, marketPrice
            FROM PlantData 
            WHERE ID = ${id}
        `);

        if result is sql:NoRowsError {
            return http:NOT_FOUND;
        }

        if result is sql:Error {
            return result;
        }

        return result;
    }

    resource function get greenhouse/plants/species/[string species]() returns PlantData[]|error {
        stream<PlantData, sql:Error?> plantStream = self.dbClient->query(`
            SELECT ID, treeSpecies, purpose, expectedHeight, rootSpread, sunlightNeeds, 
                   wateringFrequency, temperatureRange, humidityPreference, availableSpace,
                   plantingMethod, drainageSystem, supportStructures, supportDescription,
                   soilTypeRequired, currentSoilType, fertilizerPlan, pruningSchedule,
                   pestControl, pollinationMethod, plantingDate, marketPrice
            FROM PlantData 
            WHERE treeSpecies LIKE ${string `%${species}%`}
            ORDER BY ID DESC
        `);

        PlantData[] plants = [];
        check from PlantData plant in plantStream
            do {
                plants.push(plant);
            };

        check plantStream.close();
        return plants;
    }

    resource function get greenhouse/plants/purpose/[string purpose]() returns PlantData[]|error {
        stream<PlantData, sql:Error?> plantStream = self.dbClient->query(`
            SELECT ID, treeSpecies, purpose, expectedHeight, rootSpread, sunlightNeeds, 
                   wateringFrequency, temperatureRange, humidityPreference, availableSpace,
                   plantingMethod, drainageSystem, supportStructures, supportDescription,
                   soilTypeRequired, currentSoilType, fertilizerPlan, pruningSchedule,
                   pestControl, pollinationMethod, plantingDate, marketPrice
            FROM PlantData 
            WHERE purpose LIKE ${string `%${purpose}%`}
            ORDER BY ID DESC
        `);

        PlantData[] plants = [];
        check from PlantData plant in plantStream
            do {
                plants.push(plant);
            };

        check plantStream.close();
        return plants;
    }

    resource function post greenhouse/plant(@http:Payload PlantData data) returns http:Ok|error {
        _ = check self.dbClient->execute(`
            INSERT INTO PlantData (
                treeSpecies, purpose, expectedHeight, rootSpread, sunlightNeeds, 
                wateringFrequency, temperatureRange, humidityPreference, availableSpace,
                plantingMethod, drainageSystem, supportStructures, supportDescription,
                soilTypeRequired, currentSoilType, fertilizerPlan, pruningSchedule,
                pestControl, pollinationMethod, plantingDate, marketPrice
            ) VALUES (
                ${data.treeSpecies}, ${data.purpose}, ${data.expectedHeight}, ${data.rootSpread}, 
                ${data.sunlightNeeds}, ${data.wateringFrequency}, ${data.temperatureRange}, 
                ${data.humidityPreference}, ${data.availableSpace}, ${data.plantingMethod}, 
                ${data.drainageSystem}, ${data.supportStructures}, ${data.supportDescription},
                ${data.soilTypeRequired}, ${data.currentSoilType}, ${data.fertilizerPlan}, 
                ${data.pruningSchedule}, ${data.pestControl}, ${data.pollinationMethod}, 
                ${data.plantingDate}, ${data.marketPrice}
            )
        `);

        io:println("✅ Plant data received: " + data.treeSpecies);
        
        // Notify ESP32 of new plant data that might affect operations
        GreenhouseOperationalData|error opData = getGreenhouseOperationalData(self.dbClient);
        if opData is GreenhouseOperationalData {
            GreenhouseCommand command = {
                commandType: "PLANT_DATA_UPDATE",
                timestamp: getCurrentTimestamp(),
                temperature: (),
                humidity: (),
                ventilation: (),
                irrigation: (),
                lighting: ()
            };
            broadcastToESP32(command);
        }
        
        return http:OK;
    }
}

// Helper Functions
function getGreenhouseOperationalData(sql:Client dbClient) returns GreenhouseOperationalData|error {
    // Get latest plant data for operational parameters
    PlantData[] plants = check getPlantData(dbClient);

    // Get active environmental settings
    EnvironmentalSettings envSettings = check getEnvironmentalSettingsFromDB(dbClient);

    // Get active irrigation schedule
    IrrigationSchedule[] irrigation = check getIrrigationSchedulesFromDB(dbClient);

    // Get lighting schedule
    LightingSchedule[] lighting = check getLightingSchedulesFromDB(dbClient);

    GreenhouseOperationalData operationalData = {
        timestamp: getCurrentTimestamp(),
        environmental: envSettings,
        irrigation: irrigation,
        lighting: lighting,
        plantCount: plants.length(),
        activeAlerts: []
    };

    return operationalData;
}

function processSensorDataAsync(ESP32SensorData sensorData) {
    io:println("📊 Processing sensor data from device: " + sensorData.deviceId);
    // Add any additional processing logic here
}

// Database Helper Functions
function getPlantData(sql:Client dbClient) returns PlantData[]|error {
    stream<PlantData, sql:Error?> plantStream = dbClient->query(`
        SELECT ID, treeSpecies, purpose, expectedHeight, rootSpread, sunlightNeeds, 
               wateringFrequency, temperatureRange, humidityPreference, availableSpace,
               plantingMethod, drainageSystem, supportStructures, supportDescription,
               soilTypeRequired, currentSoilType, fertilizerPlan, pruningSchedule,
               pestControl, pollinationMethod, plantingDate, marketPrice
        FROM PlantData 
        ORDER BY ID DESC
    `);

    PlantData[] plants = [];
    check from PlantData plant in plantStream
        do {
            plants.push(plant);
        };

    check plantStream.close();
    return plants;
}

function storeSensorData(sql:Client dbClient, ESP32SensorData sensorData) returns error? {
    _ = check dbClient->execute(`
        INSERT INTO SensorData (
            deviceId, temperature, humidity, soilMoisture, lightLevel, 
            co2Level, phLevel, waterLevel, timestamp
        ) VALUES (
            ${sensorData.deviceId}, ${sensorData.temperature}, ${sensorData.humidity}, 
            ${sensorData.soilMoisture}, ${sensorData.lightLevel}, ${sensorData.co2Level}, 
            ${sensorData.phLevel}, ${sensorData.waterLevel}, ${sensorData.timestamp}
        )
    `);
}

function generateGreenhouseCommand(sql:Client dbClient, ESP32SensorData sensorData) returns GreenhouseCommand|error {
    // Get current environmental settings
    EnvironmentalSettings settings = check getEnvironmentalSettingsFromDB(dbClient);
    
    // Analyze sensor data and create appropriate commands
    TemperatureCommand? tempCommand = ();
    HumidityCommand? humidCommand = ();
    VentilationCommand? ventCommand = ();
    
    // Temperature control logic
    decimal tempTarget = settings.targetTemperature;
    decimal tempTolerance = settings.temperatureTolerance;
    decimal humTarget = settings.targetHumidity;
    decimal humTolerance = settings.humidityTolerance;
    
    if sensorData.temperature < (tempTarget - tempTolerance) {
        tempCommand = {
            target: settings.targetTemperature,
            tolerance: settings.temperatureTolerance,
            heatingEnabled: true,
            coolingEnabled: false
        };
    } else if sensorData.temperature > (tempTarget + tempTolerance) {
        tempCommand = {
            target: settings.targetTemperature,
            tolerance: settings.temperatureTolerance,
            heatingEnabled: false,
            coolingEnabled: true
        };
    }
    
    // Humidity control logic
    if sensorData.humidity < (humTarget - humTolerance) {
        humidCommand = {
            target: settings.targetHumidity,
            tolerance: settings.humidityTolerance,
            humidifierEnabled: true,
            dehumidifierEnabled: false
        };
    } else if sensorData.humidity > (humTarget + humTolerance) {
        humidCommand = {
            target: settings.targetHumidity,
            tolerance: settings.humidityTolerance,
            humidifierEnabled: false,
            dehumidifierEnabled: true
        };
    }
    
    // Ventilation logic
    decimal co2Threshold = 1000.0;
    if sensorData.co2Level > co2Threshold {
        ventCommand = {
            fanSpeed: 80,
            autoVentEnabled: true
        };
    }
    
    return {
        commandType: "SENSOR_RESPONSE",
        timestamp: getCurrentTimestamp(),
        temperature: tempCommand,
        humidity: humidCommand,
        ventilation: ventCommand,
        irrigation: (),
        lighting: ()
    };
}

function getEnvironmentalSettingsFromDB(sql:Client dbClient) returns EnvironmentalSettings|error {
    EnvironmentalSettings|sql:Error result = dbClient->queryRow(`
        SELECT targetTemperature, temperatureTolerance, targetHumidity, humidityTolerance,
               heatingEnabled, coolingEnabled, humidifierEnabled, dehumidifierEnabled,
               fanSpeed, autoVentEnabled
        FROM EnvironmentalSettings 
        WHERE active = true 
        ORDER BY id DESC 
        LIMIT 1
    `);
    
    if result is sql:NoRowsError {
        return getDefaultEnvironmentalSettings();
    }
    
    if result is sql:Error {
        return getDefaultEnvironmentalSettings();
    }
    
    return result;
}

function getDefaultEnvironmentalSettings() returns EnvironmentalSettings {
    return {
        targetTemperature: 24.0,
        temperatureTolerance: 2.0,
        targetHumidity: 65.0,
        humidityTolerance: 10.0,
        heatingEnabled: true,
        coolingEnabled: true,
        humidifierEnabled: true,
        dehumidifierEnabled: true,
        fanSpeed: 50,
        autoVentEnabled: true
    };
}

function updateEnvironmentalSettingsInDB(sql:Client dbClient, EnvironmentalSettings settings) returns error? {
    // Deactivate current settings
    _ = check dbClient->execute(`UPDATE EnvironmentalSettings SET active = false`);
    
    // Insert new settings
    _ = check dbClient->execute(`
        INSERT INTO EnvironmentalSettings (
            targetTemperature, temperatureTolerance, targetHumidity, humidityTolerance,
            heatingEnabled, coolingEnabled, humidifierEnabled, dehumidifierEnabled,
            fanSpeed, autoVentEnabled, active
        ) VALUES (
            ${settings.targetTemperature}, ${settings.temperatureTolerance}, 
            ${settings.targetHumidity}, ${settings.humidityTolerance},
            ${settings.heatingEnabled}, ${settings.coolingEnabled}, 
            ${settings.humidifierEnabled}, ${settings.dehumidifierEnabled},
            ${settings.fanSpeed}, ${settings.autoVentEnabled}, true
        )
    `);
}

function getIrrigationSchedulesFromDB(sql:Client dbClient) returns IrrigationSchedule[]|error {
    stream<IrrigationSchedule, sql:Error?> scheduleStream = dbClient->query(`
        SELECT zoneId, duration, startTime, frequency, enabled 
        FROM IrrigationSchedule 
        WHERE enabled = true
    `);

    IrrigationSchedule[] schedules = [];
    check from IrrigationSchedule schedule in scheduleStream
        do {
            schedules.push(schedule);
        };

    check scheduleStream.close();
    return schedules;
}

function addIrrigationScheduleToDB(sql:Client dbClient, IrrigationSchedule schedule) returns error? {
    _ = check dbClient->execute(`
        INSERT INTO IrrigationSchedule (zoneId, duration, startTime, frequency, enabled)
        VALUES (${schedule.zoneId}, ${schedule.duration}, ${schedule.startTime}, 
                ${schedule.frequency}, ${schedule.enabled})
    `);
}

function getLightingSchedulesFromDB(sql:Client dbClient) returns LightingSchedule[]|error {
    stream<LightingSchedule, sql:Error?> scheduleStream = dbClient->query(`
        SELECT zoneId, intensity, onTime, offTime, enabled 
        FROM LightingSchedule 
        WHERE enabled = true
    `);

    LightingSchedule[] schedules = [];
    check from LightingSchedule schedule in scheduleStream
        do {
            schedules.push(schedule);
        };

    check scheduleStream.close();
    return schedules;
}

function addLightingScheduleToDB(sql:Client dbClient, LightingSchedule schedule) returns error? {
    _ = check dbClient->execute(`
        INSERT INTO LightingSchedule (zoneId, intensity, onTime, offTime, enabled)
        VALUES (${schedule.zoneId}, ${schedule.intensity}, ${schedule.onTime}, 
                ${schedule.offTime}, ${schedule.enabled})
    `);
}

// Initialize all database tables
function initAllTables(sql:Client dbClient) returns error? {
    check initAlertTable(dbClient);
    check initPlantTable(dbClient);
    check initSensorDataTable(dbClient);
    check initEnvironmentalSettingsTable(dbClient);
    check initIrrigationScheduleTable(dbClient);
    check initLightingScheduleTable(dbClient);
}

function initSensorDataTable(sql:Client dbClient) returns error? {
    _ = check dbClient->execute(`CREATE TABLE IF NOT EXISTS SensorData (
        id INT AUTO_INCREMENT PRIMARY KEY,
        deviceId VARCHAR(255) NOT NULL,
        temperature DECIMAL(5,2),
        humidity DECIMAL(5,2),
        soilMoisture DECIMAL(5,2),
        lightLevel DECIMAL(8,2),
        co2Level DECIMAL(8,2),
        phLevel DECIMAL(4,2),
        waterLevel DECIMAL(5,2),
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
}

function initEnvironmentalSettingsTable(sql:Client dbClient) returns error? {
    _ = check dbClient->execute(`CREATE TABLE IF NOT EXISTS EnvironmentalSettings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        targetTemperature DECIMAL(5,2),
        temperatureTolerance DECIMAL(5,2),
        targetHumidity DECIMAL(5,2),
        humidityTolerance DECIMAL(5,2),
        heatingEnabled BOOLEAN DEFAULT true,
        coolingEnabled BOOLEAN DEFAULT true,
        humidifierEnabled BOOLEAN DEFAULT true,
        dehumidifierEnabled BOOLEAN DEFAULT true,
        fanSpeed INT DEFAULT 50,
        autoVentEnabled BOOLEAN DEFAULT true,
        active BOOLEAN DEFAULT true,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
}

function initIrrigationScheduleTable(sql:Client dbClient) returns error? {
    _ = check dbClient->execute(`CREATE TABLE IF NOT EXISTS IrrigationSchedule (
        id INT AUTO_INCREMENT PRIMARY KEY,
        zoneId VARCHAR(255),
        duration INT,
        startTime TIME,
        frequency VARCHAR(255),
        enabled BOOLEAN DEFAULT true,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
}

function initLightingScheduleTable(sql:Client dbClient) returns error? {
    _ = check dbClient->execute(`CREATE TABLE IF NOT EXISTS LightingSchedule (
        id INT AUTO_INCREMENT PRIMARY KEY,
        zoneId VARCHAR(255),
        intensity INT,
        onTime TIME,
        offTime TIME,
        enabled BOOLEAN DEFAULT true,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
}

function initAlertTable(sql:Client dbClient) returns error? {
    _ = check dbClient->execute(`CREATE TABLE IF NOT EXISTS ALERTS5 (
        ID INT AUTO_INCREMENT PRIMARY KEY,
        DESCRIPTION TEXT NOT NULL,
        CATEGORY VARCHAR(255),
        TIMESTAMP DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
}

function initPlantTable(sql:Client dbClient) returns error? {
    _ = check dbClient->execute(`CREATE TABLE IF NOT EXISTS PlantData (
        ID INT AUTO_INCREMENT PRIMARY KEY,
        treeSpecies VARCHAR(255),
        purpose VARCHAR(255),
        expectedHeight VARCHAR(255),
        rootSpread VARCHAR(255),
        sunlightNeeds VARCHAR(255),
        wateringFrequency VARCHAR(255),
        temperatureRange VARCHAR(255),
        humidityPreference VARCHAR(255),
        availableSpace VARCHAR(255),
        plantingMethod VARCHAR(255),
        drainageSystem VARCHAR(255),
        supportStructures VARCHAR(255),
        supportDescription TEXT,
        soilTypeRequired VARCHAR(255),
        currentSoilType VARCHAR(255),
        fertilizerPlan TEXT,
        pruningSchedule TEXT,
        pestControl TEXT,
        pollinationMethod VARCHAR(255),
        plantingDate VARCHAR(255),
        marketPrice VARCHAR(255)
    )`);
}

function getCurrentTimestamp() returns string {
    time:Utc currentTime = time:utcNow();
    time:Civil civil = time:utcToCivil(currentTime);
    return string `${civil.year}-${formatTwoDigits(civil.month)}-${formatTwoDigits(civil.day)} ${formatTwoDigits(civil.hour)}:${formatTwoDigits(civil.minute)}:${formatTwoDigits(getSeconds(civil))}`;
}

function formatTwoDigits(int n) returns string {
    return string `${n < 10 ? "0" : ""}${n}`;
}

function getSeconds(time:Civil civil) returns int {
    return civil.second is time:Seconds ? <int>civil.second : 0;
}

// Existing Gemini and Unsplash functions
function getPlantInfoFromGemini(http:Client geminiClient, string plantName) returns PlantInfo|error {
    GeminiRequest geminiRequest = {
        contents: [
            {
                parts: [
                    {
                        text: string `Provide detailed information about the plant "${plantName}" in JSON format. Please ensure all fields are strings or arrays of strings only. Format:
                        {
                          "scientificName": "scientific name",
                          "commonNames": ["common name 1", "common name 2"],
                          "family": "plant family",
                          "type": "type (tree, shrub, herb, etc.)",
                          "description": "detailed description",
                          "nativeRegion": "native region/habitat",
                          "sunRequirements": "sun requirements",
                          "waterRequirements": "water requirements",
                          "soilType": "preferred soil type",
                          "temperatureRange": "temperature range in Celsius",
                          "bloomingSeason": "blooming season if applicable",
                          "height": "mature height range",
                          "spread": "mature spread range",
                          "careInstructions": ["care tip 1", "care tip 2"],
                          "commonProblems": ["problem 1", "problem 2"],
                          "benefits": ["benefit 1", "benefit 2"],
                          "toxicity": "toxicity information",
                          "propagation": "propagation methods",
                          "fertilizer": "fertilizer requirements",
                          "pruning": "pruning requirements",
                          "companionPlants": ["plant 1", "plant 2"],
                          "greenhouseSuitability": {
                            "suitable": "yes",
                            "reasons": ["reason 1", "reason 2"],
                            "recommendedConditions": {
                              "humidity": "60-80%",
                              "temperature": "18-25°C",
                              "spacing": "2m apart",
                              "containerSize": "50L pot"
                            },
                            "challenges": ["challenge 1", "challenge 2"],
                            "tips": ["tip 1", "tip 2"]
                          },
                          "fruitBearing": {
                            "isFruitBearing": "yes",
                            "timeToFruit": "2-3 years",
                            "estimatedMarketPrice": "$5-10/kg",
                            "harvestSeason": "Summer"
                          }
                        }`
                    }
                ]
            }
        ]
    };

    http:Response geminiResponse = check geminiClient->post(
        string `/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`,
        geminiRequest,
        {
            "Content-Type": "application/json"
        }
    );

    json geminiJson = check geminiResponse.getJsonPayload();
    
    json|error candidatesResult = geminiJson.candidates;
    if candidatesResult is error {
        return error("Invalid Gemini response format: no candidates found");
    }
    
    json[] candidates = <json[]>candidatesResult;
    if candidates.length() == 0 {
        return error("No candidates in Gemini response");
    }
    
    json|error contentResult = candidates[0].content;
    if contentResult is error {
        return error("Invalid Gemini response format: no content found");
    }
    
    json|error partsResult = contentResult.parts;
    if partsResult is error {
        return error("Invalid Gemini response format: no parts found");
    }
    
    json[] parts = <json[]>partsResult;
    if parts.length() == 0 {
        return error("No parts in Gemini response");
    }
    
    json|error textResult = parts[0].text;
    if textResult is error {
        return error("Invalid Gemini response format: no text found");
    }
    
    string responseText = textResult.toString();
    
    string cleanedText = responseText.trim();
    
    if cleanedText.includes("```json") {
        int? startIndex = cleanedText.indexOf("```json");
        if startIndex is int {
            cleanedText = cleanedText.substring(startIndex + 7);
        }
    }
    if cleanedText.includes("```") {
        int? endIndex = cleanedText.indexOf("```");
        if endIndex is int {
            cleanedText = cleanedText.substring(0, endIndex);
        }
    }
    cleanedText = cleanedText.trim();
    
    io:println("📝 Cleaned Gemini response: " + cleanedText);
    
    json|error plantInfoJson = cleanedText.fromJsonString();
    if plantInfoJson is error {
        io:println("❌ JSON Parse Error: " + plantInfoJson.message());
        io:println("📄 Raw text: " + cleanedText);
        return error("Failed to parse plant information JSON: " + plantInfoJson.message());
    }
    
    PlantInfo plantInfo = extractPlantInfo(plantInfoJson);
    return plantInfo;
}

function getPlantImageFromUnsplash(http:Client unsplashClient, string plantName) returns string|error {
    string searchQuery = plantName + " plant";
    
    http:Response unsplashResponse = check unsplashClient->get(
        string `/search/photos?query=${searchQuery}&per_page=1&orientation=landscape`,
        {
            "Authorization": string `Client-ID ${unsplashApiKey}`
        }
    );

    json unsplashJson = check unsplashResponse.getJsonPayload();
    
    json|error resultsResult = unsplashJson.results;
    if resultsResult is error {
        return error("Invalid Unsplash response format: no results found");
    }
    
    json[] results = <json[]>resultsResult;
    if results.length() == 0 {
        return error("No images found for plant: " + plantName);
    }
    
    json|error urlsResult = results[0].urls;
    if urlsResult is error {
        return error("Invalid Unsplash response format: no URLs found");
    }
    
    json|error regularUrlResult = urlsResult.regular;
    if regularUrlResult is error {
        return error("Invalid Unsplash response format: no regular URL found");
    }
    
    return regularUrlResult.toString();
}

function extractPlantInfo(json plantJson) returns PlantInfo {
    return {
        scientificName: getString(plantJson, "scientificName"),
        commonNames: getStringArray(plantJson, "commonNames"),
        family: getString(plantJson, "family"),
        plantType: getString(plantJson, "type"),
        description: getString(plantJson, "description"),
        nativeRegion: getString(plantJson, "nativeRegion"),
        sunRequirements: getString(plantJson, "sunRequirements"),
        waterRequirements: getString(plantJson, "waterRequirements"),
        soilType: getString(plantJson, "soilType"),
        temperatureRange: getString(plantJson, "temperatureRange"),
        bloomingSeason: getString(plantJson, "bloomingSeason"),
        height: getString(plantJson, "height"),
        spread: getString(plantJson, "spread"),
        careInstructions: getStringArray(plantJson, "careInstructions"),
        commonProblems: getStringArray(plantJson, "commonProblems"),
        benefits: getStringArray(plantJson, "benefits"),
        toxicity: getString(plantJson, "toxicity"),
        propagation: getString(plantJson, "propagation"),
        fertilizer: getString(plantJson, "fertilizer"),
        pruning: getString(plantJson, "pruning"),
        companionPlants: getStringArray(plantJson, "companionPlants"),
        greenhouseSuitability: extractGreenhouseSuitability(plantJson),
        fruitBearing: extractFruitBearing(plantJson)
    };
}

function getString(json j, string key) returns string? {
    if j is map<json> {
        json|error value = j[key];
        if value is error || value is () {
            return ();
        }
        return value.toString();
    }
    return ();
}

function getStringArray(json j, string key) returns string[] {
    if j is map<json> {
        json|error value = j[key];
        if value is error || value is () {
            return [];
        }
        
        if value is json[] {
            string[] result = [];
            foreach json item in value {
                result.push(item.toString());
            }
            return result;
        }
    }
    return [];
}

function extractGreenhouseSuitability(json plantJson) returns GreenhouseSuitability? {
    if plantJson is map<json> {
        json|error ghValue = plantJson["greenhouseSuitability"];
        if ghValue is error || ghValue is () {
            return ();
        }
        
        return {
            suitable: getString(ghValue, "suitable"),
            reasons: getStringArray(ghValue, "reasons"),
            recommendedConditions: extractRecommendedConditions(ghValue),
            challenges: getStringArray(ghValue, "challenges"),
            tips: getStringArray(ghValue, "tips")
        };
    }
    return ();
}

function extractRecommendedConditions(json ghJson) returns RecommendedConditions? {
    if ghJson is map<json> {
        json|error rcValue = ghJson["recommendedConditions"];
        if rcValue is error || rcValue is () {
            return ();
        }
        
        return {
            humidity: getString(rcValue, "humidity"),
            temperature: getString(rcValue, "temperature"),
            spacing: getString(rcValue, "spacing"),
            containerSize: getString(rcValue, "containerSize")
        };
    }
    return ();
}

function extractFruitBearing(json plantJson) returns FruitBearing? {
    if plantJson is map<json> {
        json|error fbValue = plantJson["fruitBearing"];
        if fbValue is error || fbValue is () {
            return ();
        }
        
        return {
            isFruitBearing: getString(fbValue, "isFruitBearing"),
            timeToFruit: getString(fbValue, "timeToFruit"),
            estimatedMarketPrice: getString(fbValue, "estimatedMarketPrice"),
            harvestSeason: getString(fbValue, "harvestSeason"),
            peakValueMonth: getString(fbValue, "peakValueMonth"),
            monthlyMarketData: [],
            marketInsights: ()
        };
    }
    return ();
}

// TYPE DEFINITIONS

// Existing Types
type Alert record {
    int id;
    string description;
    string category;
    string timestamp;
};

type NewAlert record {
    string description;
    string category;
};

type AlertCreated record {
    Alert body;
};

type PlantData record {
    int? id = ();
    string treeSpecies;
    string purpose;
    string expectedHeight;
    string rootSpread;
    string sunlightNeeds;
    string wateringFrequency;
    string? temperatureRange;
    string humidityPreference;
    string availableSpace;
    string plantingMethod;
    string drainageSystem;
    string supportStructures;
    string supportDescription;
    string? soilTypeRequired;
    string? currentSoilType;
    string fertilizerPlan;
    string pruningSchedule;
    string pestControl;
    string pollinationMethod;
    string plantingDate;
    string marketPrice;
};

// ESP32 Communication Types
type ESP32SensorData record {
    string deviceId;
    decimal temperature;
    decimal humidity;
    decimal soilMoisture;
    decimal lightLevel;
    decimal co2Level;
    decimal phLevel;
    decimal waterLevel;
    string timestamp;
};

type GreenhouseCommand record {
    string commandType; // "SENSOR_RESPONSE", "ENVIRONMENTAL_UPDATE", "IRRIGATION_UPDATE", etc.
    string timestamp;
    TemperatureCommand? temperature;
    HumidityCommand? humidity;
    VentilationCommand? ventilation;
    IrrigationCommand? irrigation;
    LightingCommand? lighting;
};

type TemperatureCommand record {
    decimal target;
    decimal tolerance;
    boolean heatingEnabled;
    boolean coolingEnabled;
};

type HumidityCommand record {
    decimal target;
    decimal tolerance;
    boolean humidifierEnabled;
    boolean dehumidifierEnabled;
};

type VentilationCommand record {
    int fanSpeed; // 0-100
    boolean autoVentEnabled;
};

type IrrigationCommand record {
    string zoneId;
    int duration; // minutes
    string startTime;
    string frequency; // "daily", "weekly", "custom"
    boolean enabled;
};

type LightingCommand record {
    string zoneId;
    int intensity; // 0-100
    string onTime;
    string offTime;
    boolean enabled;
};

// Greenhouse Operational Data
type GreenhouseOperationalData record {
    string timestamp;
    EnvironmentalSettings environmental;
    IrrigationSchedule[] irrigation;
    LightingSchedule[] lighting;
    int plantCount;
    string[] activeAlerts;
};

type EnvironmentalSettings record {
    decimal targetTemperature;
    decimal temperatureTolerance;
    decimal targetHumidity;
    decimal humidityTolerance;
    boolean heatingEnabled;
    boolean coolingEnabled;
    boolean humidifierEnabled;
    boolean dehumidifierEnabled;
    int fanSpeed;
    boolean autoVentEnabled;
};

type IrrigationSchedule record {
    string zoneId;
    int duration;
    string startTime;
    string frequency;
    boolean enabled;
};

type LightingSchedule record {
    string zoneId;
    int intensity;
    string onTime;
    string offTime;
    boolean enabled;
};

// Plant Analysis Types
type PlantAnalysisRequest record {
    string plantName;
};

type PlantAnalysisResponse record {
    PlantInfo plantInfo;
    string imageUrl;
    string timestamp;
};

type PlantInfo record {
    string? scientificName;
    string[] commonNames;
    string? family;
    string? plantType;
    string? description;
    string? nativeRegion;
    string? sunRequirements;
    string? waterRequirements;
    string? soilType;
    string? temperatureRange;
    string? bloomingSeason;
    string? height;
    string? spread;
    string[] careInstructions;
    string[] commonProblems;
    string[] benefits;
    string? toxicity;
    string? propagation;
    string? fertilizer;
    string? pruning;
    string[] companionPlants;
    GreenhouseSuitability? greenhouseSuitability;
    FruitBearing? fruitBearing;
};

type GreenhouseSuitability record {
    string? suitable;
    string[] reasons;
    RecommendedConditions? recommendedConditions;
    string[] challenges;
    string[] tips;
};

type RecommendedConditions record {
    string? humidity;
    string? temperature;
    string? spacing;
    string? containerSize;
};

type FruitBearing record {
    string? isFruitBearing;
    string? timeToFruit;
    string? estimatedMarketPrice;
    string? harvestSeason;
    string? peakValueMonth;
    MonthlyMarketData[] monthlyMarketData;
    MarketInsights? marketInsights;
};

type MonthlyMarketData record {
    string month;
    string priceRange;
    string availability;
    string demandLevel;
    string trend;
};

type MarketInsights record {
    BestSellingMonth[] bestSellingMonths;
    string[] strategyTips;
    RevenueEstimates? revenueEstimates;
};

type BestSellingMonth record {
    string month;
    string priceRange;
};

type RevenueEstimates record {
    string? conservative;
    string? optimal;
    string? premium;
};

// Gemini API Types
type GeminiRequest record {
    GeminiContent[] contents;
};

type GeminiContent record {
    GeminiPart[] parts;
};

type GeminiPart record {
    string text;
};