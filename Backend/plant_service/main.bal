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

// WebSocket Config
listener websocket:Listener alertListener = new websocket:Listener(9095);
isolated map<websocket:Caller> clientsMap = {};

service /subscribe on alertListener {
    resource function get [string name](http:Request req) returns websocket:Service|websocket:UpgradeError {
        return new UserService(name);
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

    remote isolated function onClose(websocket:Caller caller, int statusCode, string reason) {
        lock {
            _ = clientsMap.remove(caller.getConnectionId());
            io:println("❌ " + self.userName + " disconnected.");
        }
    }
}

isolated function broadcast(string msg) {
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

@http:ServiceConfig {
    cors: {
        allowOrigins: ["http://localhost:5173"],
        allowCredentials: true,
        allowHeaders: ["Content-Type"],
        allowMethods: ["GET", "POST", "OPTIONS"]
    }
}
service /api on new http:Listener(8071) {
    final sql:Client dbClient;
    final http:Client geminiClient;
    final http:Client unsplashClient;

    function init() returns error? {
        self.dbClient = check new jdbc:Client(jdbcUrl, username, password);
        self.geminiClient = check new http:Client("https://generativelanguage.googleapis.com");
        self.unsplashClient = check new http:Client("https://api.unsplash.com");
        check initAlertTable(self.dbClient);
        check initPlantTable(self.dbClient);
    }

    // NEW: Get plant info from Gemini Pro and Unsplash
    resource function post plant/analyze(@http:Payload PlantAnalysisRequest request) returns PlantAnalysisResponse|error {
        io:println("🌱 Analyzing plant: " + request.plantName);

        // Call Gemini Pro for plant description
        PlantInfo|error plantInfoResult = getPlantInfoFromGemini(self.geminiClient, request.plantName);
        if plantInfoResult is error {
            io:println("❌ Error getting plant info from Gemini: " + plantInfoResult.message());
            return error("Failed to get plant information: " + plantInfoResult.message());
        }

        // Call Unsplash for plant image
        string|error imageUrlResult = getPlantImageFromUnsplash(self.unsplashClient, request.plantName);
        if imageUrlResult is error {
            io:println("⚠️ Warning: Could not fetch image from Unsplash: " + imageUrlResult.message());
            // Continue without image rather than failing completely
        }

        PlantAnalysisResponse response = {
            plantInfo: plantInfoResult,
            imageUrl: imageUrlResult is string ? imageUrlResult : "",
            timestamp: getCurrentTimestamp()
        };

        io:println("✅ Plant analysis completed for: " + request.plantName);
        return response;
    }

    // GET all alerts
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

    // GET single alert by ID
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

    // GET alerts by category
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

    // POST new alert
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
            return { body: alert };
        }
        return error("Insert failed");
    }

    // GET all plants
    resource function get greenhouse/plants() returns PlantData[]|error {
        stream<PlantData, sql:Error?> plantStream = self.dbClient->query(`
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

    // GET single plant by ID
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

    // GET plants by species
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

    // GET plants by purpose
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

    // POST new plant
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
        return http:OK;
    }
}

// Function to get plant information from Gemini Pro
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
    
    // Extract the text content from Gemini response
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
    
    // Clean the response text to extract JSON
    string cleanedText = responseText.trim();
    
    // Remove markdown code blocks if present
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
    
    // Log the cleaned text for debugging
    io:println("📝 Cleaned Gemini response: " + cleanedText);
    
    // Parse the cleaned JSON
    json|error plantInfoJson = cleanedText.fromJsonString();
    if plantInfoJson is error {
        io:println("❌ JSON Parse Error: " + plantInfoJson.message());
        io:println("📄 Raw text: " + cleanedText);
        return error("Failed to parse plant information JSON: " + plantInfoJson.message());
    }
    
    // Convert JSON to PlantInfo record with safe extraction
    PlantInfo plantInfo = extractPlantInfo(plantInfoJson);
    
    return plantInfo;
}

// Function to get plant image from Unsplash
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

// Safe function to extract PlantInfo from JSON
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

// Helper function to safely get string from JSON
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

// Helper function to safely get string array from JSON
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

// Helper function to extract greenhouse suitability
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

// Helper function to extract recommended conditions
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

// Helper function to extract fruit bearing information
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

// New Types for Plant Analysis Feature
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
