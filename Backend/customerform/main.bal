import ballerina/http;
import ballerina/io;
import ballerina/log;
import ballerina/uuid;
import ballerinax/mongodb;
import ballerina/email;
import ballerina/time;
import ballerina/mime;

const CONST = "message";

// Record type definitions for customer info
type CustomerInfo record {
    string id;
    string name;
    string customerId;
    string phone;
    string email;
    string date;
    string address;
    string plantId;
    string plantName?; // Added plant name field
    string submissionTimestamp;
    string status;
};

type CustomerInput record {
    string name;
    string id; // This is customerId
    string phone;
    string email;
    string date;
    string address;
    string plantId;
};

type Plant record {
    string id;
    string name;
    string category?;
    string description?;
};

// Updated ESP32DisplayData to include email
type ESP32DisplayData record {
    string customerName;
    string email;
    string plantId;
    string plantName;
    string timestamp;
    string submissionId;
};

// Sensor data types
type SensorData record {
    float temperature;
    float humidity;
    int soilMoisture;
    string timestamp;
    string plantId?;
};

type SensorRecord record {
    string id;
    float temperature;
    float humidity;
    int soilMoisture;
    string timestamp;
    string plantId;
};

type EmailResponse record {
    boolean emailSent;
    string message;
    string errorDetails;
};

type DualEmailResponse record {
    boolean submissionEmailSent;
    boolean welcomeEmailSent;
    string submissionMessage;
    string welcomeMessage;
    string submissionErrorDetails;
    string welcomeErrorDetails;
};

configurable string host = "localhost";
configurable int port = 27017;

// Email configuration
configurable string smtpHost = "smtp.gmail.com";
configurable string smtpUsername = "ecogreen360.contact@gmail.com";
configurable string smtpPassword = "pxjbnzgmourjwkvt";
configurable int smtpPort = 465;

// ESP32 configuration
configurable string esp32Endpoint = "http://192.168.8.161"; // Change to your ESP32 IP
configurable int esp32Port = 80;

// PDF file path configuration
configurable string welcomePdfPath = "Greenhouse_Welcome_Guide.pdf";

final mongodb:Client mongoDb = check new ({
    connection: {
        serverAddress: {
            host,
            port
        }
    }
});

final email:SmtpClient smtpClient = check new (
    smtpHost,
    smtpUsername,
    smtpPassword,
    port = smtpPort,
    security = email:SSL
);

final http:Client esp32Client = check new (esp32Endpoint + ":" + esp32Port.toString());

@http:ServiceConfig {
    cors: {
        allowOrigins: ["http://localhost:5173", "http://localhost:3000"],
        allowHeaders: ["REQUEST_ID", "Content-Type"],
        exposeHeaders: ["RESPONSE_ID"],
        allowMethods: ["GET", "POST", "OPTIONS"],
        maxAge: 84900
    }
}

service /api on new http:Listener(8075) {
    private final mongodb:Database customerinfo;

    function init() returns error? {
        self.customerinfo = check mongoDb->getDatabase("customerinfo");
        io:println("🍃 MongoDB connected to customerinfo on port 8075");
        io:println("📧 Email service initialized with SMTP");
        io:println("🖥️ ESP32 client initialized for: " + esp32Endpoint);
    }

    // Function to get plant name by ID
    function getPlantById(string plantId) returns Plant|error {
        mongodb:Collection plants = check self.customerinfo->getCollection("plants");
        record {}? result = check plants->findOne({id: plantId});
        
        if result is record {} {
            Plant plant = {
                id: result["id"].toString(),
                name: result.hasKey("name") ? result["name"].toString() : "Unknown Plant",
                category: result.hasKey("category") ? result["category"].toString() : (),
                description: result.hasKey("description") ? result["description"].toString() : ()
            };
            return plant;
        } else {
            // Return default plant info if not found in database
            return {
                id: plantId,
                name: "Plant #" + plantId
            };
        }
    }

    // Updated function to send data to ESP32 OLED display (now includes email)
    function sendToESP32Display(ESP32DisplayData displayData) returns boolean {
        json payload = {
            "customerName": displayData.customerName,
            "email": displayData.email,
            "plantId": displayData.plantId,
            "plantName": displayData.plantName,
            "timestamp": displayData.timestamp,
            "submissionId": displayData.submissionId
        };

        http:Response|error result = esp32Client->post("/display", payload, {
            "Content-Type": "application/json"
        });

        if result is http:Response {
            if result.statusCode == 200 {
                io:println("✅ Data sent to ESP32 OLED successfully");
                log:printInfo("ESP32 Display updated: " + displayData.customerName + " (" + displayData.email + ") - " + displayData.plantName);
                return true;
            } else {
                io:println("⚠️ ESP32 responded with status: " + result.statusCode.toString());
                return false;
            }
        } else {
            io:println("❌ Failed to send data to ESP32: " + result.message());
            log:printError("ESP32 communication failed", result);
            return false;
        }
    }

    // Function to send sensor data to ESP32
    function sendSensorDataToESP32(SensorData sensorData) returns boolean {
        json payload = {
            "temperature": sensorData.temperature,
            "humidity": sensorData.humidity,
            "soilMoisture": sensorData.soilMoisture,
            "timestamp": sensorData.timestamp
        };

        http:Response|error result = esp32Client->post("/sensors", payload, {
            "Content-Type": "application/json"
        });

        if result is http:Response {
            if result.statusCode == 200 {
                io:println("✅ Sensor data sent to ESP32 successfully");
                log:printInfo("ESP32 Sensor data updated: Temp=" + sensorData.temperature.toString() + 
                             "°C, Humidity=" + sensorData.humidity.toString() + "%, Soil=" + 
                             sensorData.soilMoisture.toString() + "%");
                return true;
            } else {
                io:println("⚠️ ESP32 sensor endpoint responded with status: " + result.statusCode.toString());
                return false;
            }
        } else {
            io:println("❌ Failed to send sensor data to ESP32: " + result.message());
            log:printError("ESP32 sensor communication failed", result);
            return false;
        }
    }

    // Enhanced function to send project submission confirmation email
    function sendSubmissionConfirmationEmail(CustomerInfo customer) returns EmailResponse {
        string currentDateTime = getCurrentTimestamp();
        string subject = "✅ Project Submission Confirmed - " + customer.name + " | ECOGREEN360";
        
        string customerIdSection = "";
        if customer.customerId.length() > 0 {
            customerIdSection = "<tr><td style=\"padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;\"><span class=\"icon-text\">👤</span>Customer ID:</td><td style=\"padding: 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;\">" + customer.customerId + "</td></tr>";
        }
        
        string plantNameDisplay = customer.plantName ?: ("Plant ID: " + customer.plantId);
        
        string htmlMessage = "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><title>ECOGREEN360 - Submission Confirmed</title></head><body style=\"font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0;\"><div style=\"max-width: 600px; margin: 0 auto; background-color: #ffffff;\"><div style=\"background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: #ffffff; padding: 40px 20px; text-align: center;\"><img src=\"https://ik.imagekit.io/9dtagplxz/ChatGPT%20Image%20Jul%2010,%202025,%2012_04_45%20AM.png?updatedAt=1752086117483\" alt=\"ECOGREEN360\" style=\"width: 80px; height: 80px; border-radius: 50%; border: 3px solid #ffffff; margin-bottom: 20px;\"><h1 style=\"margin: 0; font-size: 28px;\">Project Submission Received</h1><p style=\"margin: 10px 0;\">Your eco-friendly project is now in our system!</p><span style=\"background-color: #10b981; color: #ffffff; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: bold;\">SUBMITTED SUCCESSFULLY</span></div><div style=\"padding: 30px 20px;\"><h2 style=\"color: #1f2937;\">Thank you " + customer.name + "!</h2><p style=\"color: #374151; line-height: 1.6;\">We've successfully received your project submission at ECOGREEN360. Your sustainable initiative is now being processed by our eco-specialists team.</p><div style=\"background-color: #ffffff; border-radius: 8px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);\"><h3 style=\"color: #1f2937;\">📋 Submission Details</h3><table style=\"width: 100%; border-collapse: collapse;\"><tr><td style=\"padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;\">🆔 Submission ID:</td><td style=\"padding: 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;\">" + customer.id + "</td></tr>" + customerIdSection + "<tr><td style=\"padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;\">👤 Full Name:</td><td style=\"padding: 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;\">" + customer.name + "</td></tr><tr><td style=\"padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;\">📱 Phone:</td><td style=\"padding: 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;\">" + customer.phone + "</td></tr><tr><td style=\"padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;\">📧 Email:</td><td style=\"padding: 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;\">" + customer.email + "</td></tr><tr><td style=\"padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;\">📅 Date:</td><td style=\"padding: 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;\">" + customer.date + "</td></tr><tr><td style=\"padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;\">📍 Address:</td><td style=\"padding: 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;\">" + customer.address + "</td></tr><tr><td style=\"padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;\">🌱 Plant:</td><td style=\"padding: 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;\">" + plantNameDisplay + "</td></tr><tr><td style=\"padding: 12px; font-weight: bold; color: #374151;\">⏰ Submitted:</td><td style=\"padding: 12px; color: #6b7280;\">" + customer.submissionTimestamp + "</td></tr></table></div></div><div style=\"background-color: #ffffff; padding: 30px 20px; text-align: center; color: #6b7280;\"><p><strong>🌍 ECOGREEN360</strong></p><p>Building a Sustainable Future Together</p></div></div></body></html>";

        email:Message emailMsg = {
            to: [customer.email],
            subject: subject,
            htmlBody: htmlMessage,
            'from: smtpUsername
        };

        email:Error? result = smtpClient->sendMessage(emailMsg);
        if result is email:Error {
            log:printError("❌ Error sending submission email to " + customer.email, result);
            return {
                emailSent: false,
                message: "Submission email sending failed",
                errorDetails: result.message()
            };
        } else {
            log:printInfo("✅ Submission confirmation email sent successfully to: " + customer.email);
            return {
                emailSent: true,
                message: "Submission email sent successfully",
                errorDetails: ""
            };
        }
    }

    // Function to send welcome email with PDF attachment
    function sendWelcomeEmailWithPdf(CustomerInfo customer) returns EmailResponse {
        string currentDateTime = getCurrentTimestamp();
        string subject = "🎉 Welcome to ECOGREEN360 - " + customer.name;
        
        string plantNameDisplay = customer.plantName ?: ("Plant ID: " + customer.plantId);
        
        string htmlMessage = "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><title>Welcome to ECOGREEN360</title></head><body style=\"font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0;\"><div style=\"max-width: 600px; margin: 0 auto; background-color: #ffffff;\"><div style=\"background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; padding: 40px 20px; text-align: center;\"><img src=\"https://ik.imagekit.io/9dtagplxz/ChatGPT%20Image%20Jul%2010,%202025,%2012_04_45%20AM.png?updatedAt=1752086117483\" alt=\"ECOGREEN360\" style=\"width: 80px; height: 80px; border-radius: 50%; border: 3px solid #ffffff; margin-bottom: 20px;\"><h1 style=\"margin: 0; font-size: 28px;\">Welcome to ECOGREEN360!</h1><p style=\"margin: 10px 0;\">We're excited to have you join our eco-friendly community</p><p style=\"margin: 10px 0; font-size: 14px;\">Plant: " + plantNameDisplay + "</p><span style=\"background-color: #f59e0b; color: #ffffff; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: bold;\">WELCOME ABOARD</span></div><div style=\"padding: 30px 20px;\"><h2 style=\"color: #1f2937;\">Welcome " + customer.name + "! 🌟</h2><p style=\"color: #374151; line-height: 1.6;\">Thank you for joining ECOGREEN360! We're thrilled to welcome you to our community of eco-conscious individuals making a positive impact on our planet.</p><div style=\"background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0;\"><h3 style=\"color: #92400e;\">📎 Your Welcome Guide is Attached!</h3><p style=\"color: #78350f;\"><strong>IMPORTANT:</strong> Please check your email attachments for the comprehensive ECOGREEN360 Welcome Guide PDF!</p><p style=\"color: #78350f;\">This PDF contains:</p><ul style=\"color: #78350f; margin: 10px 0; padding-left: 20px;\"><li>🔧 Essential setup and onboarding tips</li><li>🌱 Sustainable solution implementation guides</li><li>📋 Step-by-step project planning templates</li><li>❓ Troubleshooting and FAQ section</li><li>📞 Contact information for support</li></ul><p style=\"color: #78350f; font-weight: bold;\">📎 Look for: ECOGREEN360_Welcome_Guide.pdf in your email attachments</p></div><div style=\"background-color: #ffffff; border-radius: 8px; padding: 20px; margin: 20px 0;\"><h3 style=\"color: #1f2937;\">✨ What You'll Get:</h3><ul style=\"color: #374151; line-height: 1.8;\"><li>🌿 Expert guidance from sustainability specialists</li><li>📚 Access to eco-friendly guides and resources</li><li>👥 Connect with fellow eco-warriors</li><li>⚡ Priority support for your green initiatives</li><li>🔔 Exclusive updates on sustainable technologies</li></ul></div></div><div style=\"background-color: #ffffff; padding: 30px 20px; text-align: center; color: #6b7280;\"><p><strong>🌍 ECOGREEN360</strong></p><p>Building a Sustainable Future Together</p><p>Customer ID: " + customer.customerId + " | Plant: " + plantNameDisplay + "</p><p>Welcome sent: " + currentDateTime + "</p></div></div></body></html>";

        // Try to create email with PDF attachment
        byte[]|io:Error pdfData = io:fileReadBytes(welcomePdfPath);
        
        if pdfData is byte[] {
            mime:Entity attachment = new;
            mime:InvalidContentTypeError? contentType = attachment.setContentType("application/pdf");
            if contentType is mime:InvalidContentTypeError {
                // Handle error
            }
            attachment.setHeader("Content-Disposition", "attachment; filename=\"ECOGREEN360_Welcome_Guide.pdf\"");
            attachment.setByteArray(pdfData);
            
            log:printInfo("📎 PDF file successfully loaded (" + pdfData.length().toString() + " bytes)");
            
            email:Message emailMsg = {
                to: [customer.email],
                subject: subject,
                htmlBody: htmlMessage,
                'from: smtpUsername,
                attachments: [attachment]
            };
            
            email:Error? result = smtpClient->sendMessage(emailMsg);
            if result is email:Error {
                log:printError("❌ Error sending welcome email with PDF to " + customer.email, result);
                return {
                    emailSent: false,
                    message: "Welcome email with PDF sending failed",
                    errorDetails: result.message()
                };
            } else {
                log:printInfo("✅ Welcome email with PDF attachment sent successfully to: " + customer.email);
                return {
                    emailSent: true,
                    message: "Welcome email with PDF sent successfully",
                    errorDetails: ""
                };
            }
        } else {
            log:printError("⚠️ Failed to read PDF file: " + welcomePdfPath, pdfData);
            log:printInfo("📧 Sending welcome email without PDF attachment");
            
            email:Message emailMsg = {
                to: [customer.email],
                subject: subject,
                htmlBody: htmlMessage,
                'from: smtpUsername
            };
            
            email:Error? result = smtpClient->sendMessage(emailMsg);
            if result is error {
                return {
                    emailSent: false,
                    message: "Welcome email sending failed",
                    errorDetails: result.message()
                };
            } else {
                return {
                    emailSent: true,
                    message: "Welcome email sent successfully (PDF attachment failed)",
                    errorDetails: "PDF file not found: " + welcomePdfPath
                };
            }
        }
    }

    // Enhanced function to send both emails and update ESP32
    function sendDualEmails(CustomerInfo customer) returns DualEmailResponse {
        // Send welcome email first (with PDF)
        EmailResponse welcomeResult = self.sendWelcomeEmailWithPdf(customer);
        
        // Send submission confirmation email second  
        EmailResponse submissionResult = self.sendSubmissionConfirmationEmail(customer);
        
        // Send data to ESP32 OLED display (now with email included)
        ESP32DisplayData displayData = {
            customerName: customer.name,
            email: customer.email,
            plantId: customer.plantId,
            plantName: customer.plantName ?: "Unknown Plant",
            timestamp: customer.submissionTimestamp,
            submissionId: customer.id
        };
        
        boolean esp32Success = self.sendToESP32Display(displayData);
        if !esp32Success {
            log:printWarn("ESP32 display update failed, but emails were processed");
        }
        
        return {
            submissionEmailSent: submissionResult.emailSent,
            welcomeEmailSent: welcomeResult.emailSent,
            submissionMessage: submissionResult.message,
            welcomeMessage: welcomeResult.message,
            submissionErrorDetails: submissionResult.errorDetails,
            welcomeErrorDetails: welcomeResult.errorDetails
        };
    }

    // OPTIONS handler for CORS
    resource function options [string... path](http:Caller caller, http:Request req) returns error? {
        http:Response res = new;
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "REQUEST_ID, Content-Type");
        check caller->respond(res);
    }

    // ✅ POST /api/greenhouse/customer-info: Save customer information and send dual emails + ESP32 update
    resource function post greenhouse/customer\-info(@http:Payload CustomerInput input) returns json|error {
        mongodb:Collection customers = check self.customerinfo->getCollection("customerInfo");

        string submissionId = uuid:createType1AsString();
        string timestamp = getCurrentTimestamp();
        
        // Get plant information
        Plant|error plantInfo = self.getPlantById(input.plantId);
        string plantName = plantInfo is Plant ? plantInfo.name : "Unknown Plant";
        
        CustomerInfo customer = {
            id: submissionId,
            name: input.name,
            customerId: input.id,
            phone: input.phone,
            email: input.email,
            date: input.date,
            address: input.address,
            plantId: input.plantId,
            plantName: plantName,
            submissionTimestamp: timestamp,
            status: "pending_review"
        };

        // Save to MongoDB
        check customers->insertOne(customer);
        io:println("💾 Customer data saved: " + customer.name + " (" + customer.email + ") - Plant: " + plantName);
        
        // Send both emails and update ESP32
        DualEmailResponse emailResults = self.sendDualEmails(customer);
        
        json response = {
            "message": "Customer information saved successfully",
            "id": submissionId,
            "success": true,
            "timestamp": timestamp,
            "plantName": plantName,
            "emailResults": {
                "welcomeEmail": {
                    "sent": emailResults.welcomeEmailSent,
                    "message": emailResults.welcomeMessage,
                    "error": emailResults.welcomeErrorDetails
                },
                "submissionEmail": {
                    "sent": emailResults.submissionEmailSent,
                    "message": emailResults.submissionMessage,
                    "error": emailResults.submissionErrorDetails
                }
            }
        };
        
        return response;
    }

    // ✅ POST /api/greenhouse/sensors: Save sensor data and send to ESP32
    resource function post greenhouse/sensors(@http:Payload SensorData sensorData) returns json|error {
        // Add timestamp if not provided
        if sensorData.timestamp == "" {
            sensorData.timestamp = getCurrentTimestamp();
        }
        
        // Save sensor data to MongoDB
        mongodb:Collection sensors = check self.customerinfo->getCollection("sensorData");
        string sensorId = uuid:createType1AsString();
        
        SensorRecord sensorRecord = {
            id: sensorId,
            temperature: sensorData.temperature,
            humidity: sensorData.humidity,
            soilMoisture: sensorData.soilMoisture,
            timestamp: sensorData.timestamp,
            plantId: sensorData.plantId ?: "unknown"
        };
        
        check sensors->insertOne(sensorRecord);
        io:println("💾 Sensor data saved: Temp=" + sensorData.temperature.toString() + 
                   "°C, Humidity=" + sensorData.humidity.toString() + "%, Soil=" + 
                   sensorData.soilMoisture.toString() + "%");
        
        // Send to ESP32
        boolean esp32Success = self.sendSensorDataToESP32(sensorData);
        
        json response = {
            "message": "Sensor data processed successfully",
            "id": sensorId,
            "success": true,
            "timestamp": sensorData.timestamp,
            "esp32Updated": esp32Success,
            "data": {
                "temperature": sensorData.temperature,
                "humidity": sensorData.humidity,
                "soilMoisture": sensorData.soilMoisture
            }
        };
        
        return response;
    }

    // ✅ GET /api/greenhouse/sensors/latest: Get latest sensor reading
    resource function get greenhouse/sensors/latest() returns json|error {
        mongodb:Collection sensors = check self.customerinfo->getCollection("sensorData");
        
        // Get the most recent sensor reading
        record {}? result = check sensors->findOne({}, {sort: {timestamp: -1}});
        
        if result is record {} {
            json sensorResponse = {
                "success": true,
                "data": {
                    "id": result.get("id").toString(),
                    "temperature": <json>result.get("temperature"),
                    "humidity": <json>result.get("humidity"),
                    "soilMoisture": <json>result.get("soilMoisture"),
                    "timestamp": result.get("timestamp").toString(),
                    "plantId": result.get("plantId").toString()
                }
            };
            return sensorResponse;
        } else {
            return {
                "success": false,
                "message": "No sensor data found"
            };
        }
    }

    // ✅ GET /api/greenhouse/sensors/plant/{plantId}: Get sensor data by plant ID
    resource function get greenhouse/sensors/plant/[string plantId]() returns json|error {
        mongodb:Collection sensors = check self.customerinfo->getCollection("sensorData");
        
        stream<record {}, error?> result = check sensors->find({plantId: plantId}, {sort: {timestamp: -1}, 'limit: 10});
        json[] sensorList = [];
        check result.forEach(function(record {}|error item) {
            if item is record {} {
                sensorList.push(<json>item.cloneReadOnly());
            } else {
                log:printError("Error retrieving sensor data", item);
            }
        });
        
        return {
            "success": true,
            "plantId": plantId,
            "readings": sensorList
        };
    }

    // ✅ POST /api/greenhouse/esp32/display: Manual ESP32 display update (now with email)
    resource function post greenhouse/esp32/display(@http:Payload record {string customerId;} request) returns json|error {
        mongodb:Collection customers = check self.customerinfo->getCollection("customerInfo");
        CustomerInfo? customer = check customers->findOne({id: request.customerId});
        
        if customer is CustomerInfo {
            ESP32DisplayData displayData = {
                customerName: customer.name,
                email: customer.email,
                plantId: customer.plantId,
                plantName: customer.plantName ?: "Unknown Plant",
                timestamp: customer.submissionTimestamp,
                submissionId: customer.id
            };
            
            boolean success = self.sendToESP32Display(displayData);
            
            return {
                "success": success,
                "message": success ? "ESP32 display updated successfully" : "Failed to update ESP32 display",
                "customerName": customer.name,
                "email": customer.email,
                "plantName": displayData.plantName
            };
        } else {
            return error("Customer not found with ID: " + request.customerId);
        }
    }

    // ✅ GET /api/greenhouse/esp32/test: Test ESP32 connection
    resource function get greenhouse/esp32/test() returns json|error {
        http:Response|error result = esp32Client->get("/test");
        
        if result is http:Response {
            json response = {
                "esp32Connected": result.statusCode == 200,
                "statusCode": result.statusCode,
                "message": result.statusCode == 200 ? "ESP32 is connected and responding" : "ESP32 not responding properly"
            };
            return response;
        } else {
            return {
                "esp32Connected": false,
                "error": result.message(),
                "message": "Cannot connect to ESP32"
            };
        }
    }

    // ✅ GET /api/greenhouse/customer-info: View all customer information
    resource function get greenhouse/customer\-info() returns CustomerInfo[]|error {
        mongodb:Collection customers = check self.customerinfo->getCollection("customerInfo");
        stream<CustomerInfo, error?> result = check customers->find();
        CustomerInfo[] customerList = [];
        check result.forEach(function(CustomerInfo|error item) {
            if item is CustomerInfo {
                customerList.push(item);
            } else {
                log:printError("Error retrieving customer info", item);
            }
        });
        io:println("📊 Retrieved " + customerList.length().toString() + " customer records");
        return customerList;
    }

    // ✅ GET /api/greenhouse/customer-info/{customerId}: Get specific customer
    resource function get greenhouse/customer\-info/[string customerId]() returns CustomerInfo|error {
        mongodb:Collection customers = check self.customerinfo->getCollection("customerInfo");
        CustomerInfo? result = check customers->findOne({id: customerId});
        if result is CustomerInfo {
            io:println("👤 Found customer: " + result.name);
            return result;
        } else {
            return error("Customer not found with ID: " + customerId);
        }
    }

    // ✅ GET /api/greenhouse/customer-info/by-email/{email}: Get customers by email
    resource function get greenhouse/customer\-info/by\-email/[string email]() returns CustomerInfo[]|error {
        mongodb:Collection customers = check self.customerinfo->getCollection("customerInfo");
        stream<CustomerInfo, error?> result = check customers->find({email: email});
        CustomerInfo[] customerList = [];
        check result.forEach(function(CustomerInfo|error item) {
            if item is CustomerInfo {
                customerList.push(item);
            }
        });
        return customerList;
    }

    // ✅ PUT /api/greenhouse/customer-info/{customerId}/status: Update customer status
    resource function put greenhouse/customer\-info/[string customerId]/status(@http:Payload record {string status;} statusUpdate) returns json|error {
        mongodb:Collection customers = check self.customerinfo->getCollection("customerInfo");
        
        mongodb:UpdateResult result = check customers->updateOne(
            {id: customerId}, 
            {"$set": {status: statusUpdate.status, lastUpdated: getCurrentTimestamp()}}
        );
        
        if result.modifiedCount > 0 {
            io:println("📝 Updated status for customer " + customerId + " to: " + statusUpdate.status);
            
            json updateResponse = {
                "message": "Customer status updated successfully",
                "customerId": customerId,
                "newStatus": statusUpdate.status,
                "success": true
            };
            
            return updateResponse;
        } else {
            return error("Customer not found or status not updated");
        }
    }

    // ✅ POST /api/greenhouse/customer-info/{customerId}/resend-emails: Resend emails for a customer
    resource function post greenhouse/customer\-info/[string customerId]/resend\-emails() returns json|error {
        mongodb:Collection customers = check self.customerinfo->getCollection("customerInfo");
        CustomerInfo? customer = check customers->findOne({id: customerId});
        
        if customer is CustomerInfo {
            DualEmailResponse emailResults = self.sendDualEmails(customer);
            
            json response = {
                "message": "Email resend attempt completed",
                "customerId": customerId,
                "email": customer.email,
                "success": emailResults.submissionEmailSent || emailResults.welcomeEmailSent,
                "emailResults": {
                    "welcomeEmail": {
                        "sent": emailResults.welcomeEmailSent,
                        "message": emailResults.welcomeMessage,
                        "error": emailResults.welcomeErrorDetails
                    },
                    "submissionEmail": {
                        "sent": emailResults.submissionEmailSent,
                        "message": emailResults.submissionMessage,
                        "error": emailResults.submissionErrorDetails
                    }
                }
            };
            return response;
        } else {
            return error("Customer not found with ID: " + customerId);
        }
    }

    // ✅ GET /api/greenhouse/plants: Get all plants
    resource function get greenhouse/plants() returns json|error {
        mongodb:Collection plants = check self.customerinfo->getCollection("plants");
        stream<record {}, error?> result = check plants->find();
        json[] plantList = [];
        check result.forEach(function(record {}|error item) {
            if item is record {} {
                plantList.push(<json>item.cloneReadOnly());
            } else {
                log:printError("Error retrieving plant data", item);
            }
        });
        return plantList;
    }

    // ✅ GET /api/greenhouse/customer-info/stats: Get customer statistics
    resource function get greenhouse/customer\-info/stats() returns json|error {
        mongodb:Collection customers = check self.customerinfo->getCollection("customerInfo");
        
        int totalCustomers = check customers->countDocuments({});
        int pendingCount = check customers->countDocuments({status: "pending_review"});
        int contactedCount = check customers->countDocuments({status: "contacted"});
        int completedCount = check customers->countDocuments({status: "completed"});
        
        json statsResponse = {
            "totalCustomers": totalCustomers,
            "statusBreakdown": {
                "pending": pendingCount,
                "contacted": contactedCount,
                "completed": completedCount
            },
            "lastUpdated": getCurrentTimestamp()
        };
        
        return statsResponse;
    }

    // ✅ GET /api/greenhouse/sensors/stats: Get sensor data statistics
    resource function get greenhouse/sensors/stats() returns json|error {
        mongodb:Collection sensors = check self.customerinfo->getCollection("sensorData");
        
        int totalReadings = check sensors->countDocuments({});
        
        // Get latest reading for each plant
        stream<record {}, error?> latestReadings = check sensors->find({}, {sort: {timestamp: -1}, 'limit: 10});
        json[] recentReadings = [];
        check latestReadings.forEach(function(record {}|error item) {
            if item is record {} {
                recentReadings.push(<json>item.cloneReadOnly());
            }
        });
        
        json sensorStatsResponse = {
            "totalReadings": totalReadings,
            "recentReadings": recentReadings,
            "lastUpdated": getCurrentTimestamp()
        };
        
        return sensorStatsResponse;
    }

    // ✅ DELETE /api/greenhouse/customer-info/{customerId}: Delete a customer record
    resource function delete greenhouse/customer\-info/[string customerId]() returns json|error {
        mongodb:Collection customers = check self.customerinfo->getCollection("customerInfo");
        
        mongodb:DeleteResult result = check customers->deleteOne({id: customerId});
        
        if result.deletedCount > 0 {
            io:println("🗑️ Deleted customer record: " + customerId);
            return {
                "message": "Customer record deleted successfully",
                "customerId": customerId,
                "success": true
            };
        } else {
            return error("Customer not found with ID: " + customerId);
        }
    }

    // ✅ POST /api/greenhouse/plants: Add a new plant
    resource function post greenhouse/plants(@http:Payload Plant plant) returns json|error {
        mongodb:Collection plants = check self.customerinfo->getCollection("plants");
        
        // Generate plant ID if not provided
        if plant.id == "" {
            plant.id = uuid:createType1AsString();
        }
        
        check plants->insertOne(plant);
        io:println("🌱 New plant added: " + plant.name + " (ID: " + plant.id + ")");
        
        return {
            "message": "Plant added successfully",
            "plantId": plant.id,
            "plantName": plant.name,
            "success": true
        };
    }

    // ✅ PUT /api/greenhouse/plants/{plantId}: Update plant information
    resource function put greenhouse/plants/[string plantId](@http:Payload Plant plantUpdate) returns json|error {
        mongodb:Collection plants = check self.customerinfo->getCollection("plants");
        
        mongodb:UpdateResult result = check plants->updateOne(
            {id: plantId},
            {"$set": <map<json>>plantUpdate.cloneReadOnly()}
        );
        
        if result.modifiedCount > 0 {
            io:println("🌱 Updated plant: " + plantId);
            return {
                "message": "Plant updated successfully",
                "plantId": plantId,
                "success": true
            };
        } else {
            return error("Plant not found with ID: " + plantId);
        }
    }

    // ✅ DELETE /api/greenhouse/plants/{plantId}: Delete a plant
    resource function delete greenhouse/plants/[string plantId]() returns json|error {
        mongodb:Collection plants = check self.customerinfo->getCollection("plants");
        
        mongodb:DeleteResult result = check plants->deleteOne({id: plantId});
        
        if result.deletedCount > 0 {
            io:println("🗑️ Deleted plant: " + plantId);
            return {
                "message": "Plant deleted successfully",
                "plantId": plantId,
                "success": true
            };
        } else {
            return error("Plant not found with ID: " + plantId);
        }
    }

    // ✅ POST /api/greenhouse/sensors/bulk: Bulk insert sensor data
    resource function post greenhouse/sensors/bulk(@http:Payload SensorData[] sensorDataArray) returns json|error {
        mongodb:Collection sensors = check self.customerinfo->getCollection("sensorData");
        
        SensorRecord[] sensorRecords = [];
        string timestamp = getCurrentTimestamp();
        
        foreach SensorData sensorData in sensorDataArray {
            string sensorId = uuid:createType1AsString();
            SensorRecord sensorRecord = {
                id: sensorId,
                temperature: sensorData.temperature,
                humidity: sensorData.humidity,
                soilMoisture: sensorData.soilMoisture,
                timestamp: sensorData.timestamp != "" ? sensorData.timestamp : timestamp,
                plantId: sensorData.plantId ?: "unknown"
            };
            sensorRecords.push(sensorRecord);
        }
        
        // Fixed InsertManyResult to proper mongodb type
        anydata result = check sensors->insertMany(sensorRecords);
        io:println("💾 Bulk inserted " + sensorRecords.length().toString() + " sensor records");
        
        // Send latest sensor data to ESP32 if available
        if sensorRecords.length() > 0 {
            SensorData latestSensor = {
                temperature: sensorRecords[0].temperature,
                humidity: sensorRecords[0].humidity,
                soilMoisture: sensorRecords[0].soilMoisture,
                timestamp: sensorRecords[0].timestamp,
                plantId: sensorRecords[0].plantId
            };
            boolean esp32Success = self.sendSensorDataToESP32(latestSensor);
        }
        
        return {
            CONST: "Bulk sensor data inserted successfully",
            "insertedCount": sensorRecords.length(),
            "success": true,
            "timestamp": timestamp
        };
    }

    // ✅ GET /api/greenhouse/dashboard: Get dashboard overview data
    resource function get greenhouse/dashboard() returns json|error {
        mongodb:Collection customers = check self.customerinfo->getCollection("customerInfo");
        mongodb:Collection sensors = check self.customerinfo->getCollection("sensorData");
        mongodb:Collection plants = check self.customerinfo->getCollection("plants");
        
        // Get counts
        int totalCustomers = check customers->countDocuments({});
        int totalSensorReadings = check sensors->countDocuments({});
        int totalPlants = check plants->countDocuments({});
        
        // Get status breakdown
        int pendingCustomers = check customers->countDocuments({status: "pending_review"});
        int contactedCustomers = check customers->countDocuments({status: "contacted"});
        int completedCustomers = check customers->countDocuments({status: "completed"});
        
        // Get recent customers
        stream<CustomerInfo, error?> recentCustomersStream = check customers->find({}, {sort: {submissionTimestamp: -1}, 'limit: 5});
        CustomerInfo[] recentCustomers = [];
        check recentCustomersStream.forEach(function(CustomerInfo|error item) {
            if item is CustomerInfo {
                recentCustomers.push(item);
            }
        });
        
        // Get latest sensor data
        record {}? latestSensor = check sensors->findOne({}, {sort: {timestamp: -1}});
        
        json dashboardData = {
            "overview": {
                "totalCustomers": totalCustomers,
                "totalSensorReadings": totalSensorReadings,
                "totalPlants": totalPlants
            },
            "customerStatus": {
                "pending": pendingCustomers,
                "contacted": contactedCustomers,
                "completed": completedCustomers
            },
            "recentCustomers": <json>recentCustomers.cloneReadOnly(),
            "latestSensorData": latestSensor is record {} ? <json>latestSensor.cloneReadOnly() : null,
            "lastUpdated": getCurrentTimestamp()
        };
        
        return dashboardData;
    }
}

// Utility functions
isolated function getCurrentTimestamp() returns string {
    time:Utc currentTime = time:utcNow();
    time:Civil civil = time:utcToCivil(currentTime);
    return string `${civil.year}-${formatTwoDigits(civil.month)}-${formatTwoDigits(civil.day)} ${formatTwoDigits(civil.hour)}:${formatTwoDigits(civil.minute)}:${formatTwoDigits(getSeconds(civil))}`;
}

isolated function formatTwoDigits(int n) returns string {
    return string `${n < 10 ? "0" : ""}${n}`;
}

isolated function getSeconds(time:Civil civil) returns int {
    return civil.second is time:Seconds ? <int>civil.second : 0;
}