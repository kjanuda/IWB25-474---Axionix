import ballerina/http;
import ballerina/log;
import ballerina/time;
import ballerinax/aws.dynamodb;

// Configuration
configurable string accessKeyId = ?;
configurable string secretAccessKey = ?;
configurable string aws_region = "eu-north-1";
configurable string table_name = "ecosense";
configurable int server_port = 8081;
configurable string server_host = "0.0.0.0";

// DynamoDB Configuration
dynamodb:ConnectionConfig dynamodbConfig = {
    awsCredentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey
    },
    region: aws_region
};

final dynamodb:Client dynamodbClient = check new (dynamodbConfig);

// Data types
type SensorData record {
    string device_id;
    int timestamp;
    SensorReadings sensors;
};

type SensorReadings record {
    DHT dht1;
    DHT dht2;
    int air_quality;
    int soil_moisture;
};

type DHT record {
    float temperature;
    float humidity;
};

// HTTP Listener Configuration - Bind to all interfaces
http:ListenerConfiguration listenerConfig = {
    host: server_host,
    timeout: 30
};

// HTTP service - Accept POST directly at /ecosense
service /ecosense on new http:Listener(server_port, listenerConfig) {
    
    // CORS preflight for root path
    isolated resource function options .() returns http:Response {
        http:Response response = new;
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
        response.setHeader("Access-Control-Allow-Headers", "Content-Type");
        response.statusCode = 200;
        log:printInfo("CORS preflight request received");
        return response;
    }
    
    // POST endpoint to receive sensor data directly at /ecosense
    isolated resource function post .(@http:Payload SensorData payload) returns http:Response {
        http:Response response = new;
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
        response.setHeader("Access-Control-Allow-Headers", "Content-Type");
        
        log:printInfo("📡 Received POST request from ESP32");
        log:printInfo("🔍 Device ID: " + payload.device_id);
        log:printInfo("⏰ Timestamp: " + payload.timestamp.toString());
        
        do {
            log:printInfo("Received sensor data from device: " + payload.device_id);
            
            // Generate unique ID
            time:Utc currentTime = time:utcNow();
            string itemId = payload.device_id + "_" + currentTime[0].toString();
            string currentTimeStr = time:utcToString(currentTime);
            
            // Prepare item for DynamoDB
            map<dynamodb:AttributeValue> item = {
                "id": {"S": itemId},
                "device_id": {"S": payload.device_id},
                "timestamp": {"N": payload.timestamp.toString()},
                "created_at": {"S": currentTimeStr},
                "dht1_temperature": {"N": payload.sensors.dht1.temperature.toString()},
                "dht1_humidity": {"N": payload.sensors.dht1.humidity.toString()},
                "dht2_temperature": {"N": payload.sensors.dht2.temperature.toString()},
                "dht2_humidity": {"N": payload.sensors.dht2.humidity.toString()},
                "air_quality": {"N": payload.sensors.air_quality.toString()},
                "soil_moisture": {"N": payload.sensors.soil_moisture.toString()}
            };
            
            // Create ItemCreateInput for createItem method
            dynamodb:ItemCreateInput createItemInput = {
                TableName: table_name,
                Item: item
            };
            
            // Store in DynamoDB using createItem method
            dynamodb:ItemDescription _ = check dynamodbClient->createItem(createItemInput);
            
            log:printInfo("✅ Successfully stored sensor data in DynamoDB");
            
            // Success response as json
            json successResp = {
                "status": "success",
                "message": "Sensor data stored successfully",
                "device_id": payload.device_id,
                "timestamp": currentTimeStr
            };
            
            response.statusCode = 200;
            response.setJsonPayload(successResp);
            
        } on fail error err {
            log:printError("❌ Error storing sensor data: " + err.message());
            
            json errorResp = {
                "status": "error",
                "message": "Failed to store sensor data: " + err.message()
            };
            
            response.statusCode = 500;
            response.setJsonPayload(errorResp);
        }
        
        return response;
    }
    
    // GET endpoint for retrieving data at root path
    isolated resource function get .() returns http:Response {
        http:Response response = new;
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
        response.setHeader("Access-Control-Allow-Headers", "Content-Type");
        
        log:printInfo("📊 GET request received for sensor data");
        
        do {
            log:printInfo("Retrieving sensor data...");
            
            // Create ScanInput
            dynamodb:ScanInput scanInput = {
                TableName: table_name,
                Limit: 20
            };
            
            // Perform scan operation - returns a stream
            stream<dynamodb:ScanOutput, error?> scanStream = check dynamodbClient->scan(scanInput);
            
            // Process the stream results using iterator
            json[] processedItems = [];
            
            record {|dynamodb:ScanOutput value;|}? next = check scanStream.next();
            while next is record {|dynamodb:ScanOutput value;|} {
                dynamodb:ScanOutput scanOutput = next.value;
                
                if scanOutput.hasKey("Item") {
                    map<dynamodb:AttributeValue>? item = scanOutput["Item"];
                    if item is map<dynamodb:AttributeValue> {
                        json processedItem = {
                            "id": item.hasKey("id") && item.get("id").hasKey("S") ? <string>item.get("id").get("S") : "",
                            "device_id": item.hasKey("device_id") && item.get("device_id").hasKey("S") ? <string>item.get("device_id").get("S") : "",
                            "timestamp": item.hasKey("timestamp") && item.get("timestamp").hasKey("N") ? <string>item.get("timestamp").get("N") : "0",
                            "created_at": item.hasKey("created_at") && item.get("created_at").hasKey("S") ? <string>item.get("created_at").get("S") : "",
                            "dht1_temperature": item.hasKey("dht1_temperature") && item.get("dht1_temperature").hasKey("N") ? <string>item.get("dht1_temperature").get("N") : "0",
                            "dht1_humidity": item.hasKey("dht1_humidity") && item.get("dht1_humidity").hasKey("N") ? <string>item.get("dht1_humidity").get("N") : "0",
                            "dht2_temperature": item.hasKey("dht2_temperature") && item.get("dht2_temperature").hasKey("N") ? <string>item.get("dht2_temperature").get("N") : "0",
                            "dht2_humidity": item.hasKey("dht2_humidity") && item.get("dht2_humidity").hasKey("N") ? <string>item.get("dht2_humidity").get("N") : "0",
                            "air_quality": item.hasKey("air_quality") && item.get("air_quality").hasKey("N") ? <string>item.get("air_quality").get("N") : "0",
                            "soil_moisture": item.hasKey("soil_moisture") && item.get("soil_moisture").hasKey("N") ? <string>item.get("soil_moisture").get("N") : "0"
                        };
                        processedItems.push(processedItem);
                    }
                }
                
                next = check scanStream.next();
            }
            
            json responseData = {
                "status": "success",
                "message": "Data retrieved successfully",
                "count": processedItems.length(),
                "data": processedItems
            };
            
            response.statusCode = 200;
            response.setJsonPayload(responseData);
            
        } on fail error err {
            log:printError("Error retrieving sensor data: " + err.message());
            
            json errorResp = {
                "status": "error", 
                "message": "Failed to retrieve sensor data: " + err.message()
            };
            
            response.statusCode = 500;
            response.setJsonPayload(errorResp);
        }
        
        return response;
    }
    
    // Health check at separate path
    isolated resource function get health() returns json {
        log:printInfo("🏥 Health check request received");
        return {
            "status": "healthy",
            "service": "iot-sensor-api",
            "timestamp": time:utcToString(time:utcNow()),
            "version": "1.0.0",
            "server_host": server_host,
            "server_port": server_port
        };
    }
    
    // Test endpoint for ESP32 connectivity
    isolated resource function get test() returns json {
        log:printInfo("🧪 Test endpoint accessed");
        return {
            "status": "server_reachable",
            "message": "ESP32 can reach this server",
            "timestamp": time:utcToString(time:utcNow()),
            "server_info": {
                "host": server_host,
                "port": server_port,
                "service_path": "/ecosense"
            }
        };
    }
}

public function main() returns error? {
    log:printInfo("🚀 Starting IoT Sensor Data API Server...");
    log:printInfo("🌐 Server Host: " + server_host + " (0.0.0.0 = all interfaces)");
    log:printInfo("📡 Server Port: " + server_port.toString());
    log:printInfo("🗃️  DynamoDB Table: " + table_name);
    log:printInfo("🌍 AWS Region: " + aws_region);
    log:printInfo("🌐 Service mounted at: /ecosense");
    log:printInfo("✅ Server is ready to receive sensor data from ESP32!");
    log:printInfo("📋 Available endpoints:");
    log:printInfo("   • GET  /ecosense/health (health check)");
    log:printInfo("   • GET  /ecosense/test (ESP32 connectivity test)");
    log:printInfo("   • GET  /ecosense (retrieve sensor data)");
    log:printInfo("   • POST /ecosense (receive sensor data from ESP32)");
    log:printInfo("🔗 ESP32 should POST to: http://192.168.8.106:" + server_port.toString() + "/ecosense");
}