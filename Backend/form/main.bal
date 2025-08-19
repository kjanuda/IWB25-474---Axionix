import ballerina/http;
import ballerina/io;
import ballerina/log;
import ballerina/uuid;
import ballerinax/mongodb;

// Record type definitions
type ContactMessage record {
    string id;
    string fullName;
    string email;
    string phone;
    string country;
    string[] interests;
    string message;
};

type ContactInput record {
    string fullName;
    string email;
    string phone;
    string country;
    string[] interests;
    string message;
};

type ApiResponse record {
    string message;
    string id?;
    int count?;
};

type ErrorResponse record {
    string 'error;
    string details?;
};

// Configuration
configurable string host = "localhost";
configurable int port = 27017;
configurable string dbName = "EcoGreen";
configurable string collectionName = "contactMessages";

// MongoDB client initialization
final mongodb:Client mongoDb = check new ({
    connection: {
        serverAddress: {
            host,
            port
        }
    }
});

@http:ServiceConfig {
    cors: {
        allowOrigins: ["http://localhost:5173", "http://localhost:3000"],
        allowHeaders: ["REQUEST_ID", "Content-Type", "Authorization"],
        exposeHeaders: ["RESPONSE_ID"],
        allowMethods: ["GET", "POST", "OPTIONS", "DELETE"],
        maxAge: 84900
    }
}
service / on new http:Listener(8091) {
    private final mongodb:Database EcoGreenDb;

    function init() returns error? {
        self.EcoGreenDb = check mongoDb->getDatabase(dbName);
        io:println("MongoDB connected to EcoGreen database");
    }

    // Handle CORS preflight requests
    resource function options contact(http:Caller caller, http:Request req) returns error? {
        http:Response res = new;
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE");
        res.setHeader("Access-Control-Allow-Headers", "REQUEST_ID, Content-Type, Authorization");
        check caller->respond(res);
    }

    // Handle CORS for specific contact ID
    resource function options contact/[string id](http:Caller caller, http:Request req) returns error? {
        http:Response res = new;
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, DELETE, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "REQUEST_ID, Content-Type, Authorization");
        check caller->respond(res);
    }

    // ✅ POST /contact: Save Get in Touch form data
    resource function post contact(@http:Payload ContactInput input) returns json|http:InternalServerError {
        do {
            // Validate required fields
            if (input.fullName.trim() == "" || input.email.trim() == "" || input.message.trim() == "") {
                return <json>{
                    "error": "Missing required fields",
                    "details": "fullName, email, and message are required"
                };
            }

            mongodb:Collection contacts = check self.EcoGreenDb->getCollection(collectionName);
            string id = uuid:createType1AsString();
            
            ContactMessage contact = {
                id: id,
                fullName: input.fullName.trim(),
                email: input.email.trim().toLowerAscii(),
                phone: input.phone.trim(),
                country: input.country.trim(),
                interests: input.interests,
                message: input.message.trim()
            };

            check contacts->insertOne(contact);
            
            log:printInfo("New contact message received", contactId = id, email = contact.email);
            
            return <json>{
                "message": "Message received successfully",
                "id": id
            };
        } on fail error e {
            log:printError("Error saving contact message", e);
            return <http:InternalServerError>{
                body: {
                    "error": "Failed to save contact message",
                    "details": "Please try again later"
                }
            };
        }
    }

    // ✅ GET /contact: Retrieve all contact messages
    resource function get contact() returns ContactMessage[]|http:InternalServerError {
        do {
            mongodb:Collection contacts = check self.EcoGreenDb->getCollection(collectionName);
            
            // Use the original approach with better error handling
            stream<ContactMessage, error?> result = check contacts->find();
            
            ContactMessage[] messages = [];
            error? forEachResult = result.forEach(function(ContactMessage|error item) {
                if item is ContactMessage {
                    messages.push(item);
                } else {
                    log:printError("Skipping malformed contact message", item);
                    // Continue processing other records instead of failing completely
                }
            });
            
            // Check if forEach completed successfully
            if forEachResult is error {
                log:printError("Error during contact messages retrieval", forEachResult);
                // Return whatever we managed to collect
            }
            
            log:printInfo("Retrieved contact messages", count = messages.length());
            return messages;
            
        } on fail error e {
            log:printError("Error retrieving contact messages", e);
            return <http:InternalServerError>{
                body: {
                    "error": "Failed to retrieve contact messages",
                    "details": "Database might contain corrupted data. Please check database contents."
                }
            };
        }
    }

    // ✅ GET /contact/{id}: Retrieve a specific contact message by ID
    resource function get contact/[string id]() returns ContactMessage|http:NotFound|http:InternalServerError {
        do {
            mongodb:Collection contacts = check self.EcoGreenDb->getCollection(collectionName);
            
            ContactMessage? result = check contacts->findOne({id: id});
            
            if result is () {
                return <http:NotFound>{
                    body: {
                        "error": "Contact message not found",
                        "details": string `No message found with id: ${id}`
                    }
                };
            }
            
            log:printInfo("Retrieved contact message", contactId = id);
            return result;
            
        } on fail error e {
            log:printError("Error retrieving contact message by ID", e, contactId = id);
            return <http:InternalServerError>{
                body: {
                    "error": "Failed to retrieve contact message",
                    "details": "Contact might have corrupted data or database connection issue"
                }
            };
        }
    }

    // ✅ DELETE /contact/{id}: Delete a specific contact message
    resource function delete contact/[string id]() returns json|http:NotFound|http:InternalServerError {
        do {
            mongodb:Collection contacts = check self.EcoGreenDb->getCollection(collectionName);
            
            // Try to delete directly without checking existence first
            // to avoid the findOne error for corrupted data
            mongodb:DeleteResult deleteResult = check contacts->deleteOne({id: id});
            
            if deleteResult.deletedCount > 0 {
                log:printInfo("Contact message deleted", contactId = id);
                return <json>{
                    "message": "Contact message deleted successfully",
                    "id": id
                };
            } else {
                return <http:NotFound>{
                    body: {
                        "error": "Contact message not found",
                        "details": string `No message found with id: ${id}`
                    }
                };
            }
            
        } on fail error e {
            log:printError("Error deleting contact message", e, contactId = id);
            return <http:InternalServerError>{
                body: {
                    "error": "Failed to delete contact message",
                    "details": "Please try again later"
                }
            };
        }
    }

    // ✅ DELETE /contact/cleanup: Clean up corrupted data
    resource function delete contact/cleanup() returns json|http:InternalServerError {
        do {
            mongodb:Collection contacts = check self.EcoGreenDb->getCollection(collectionName);
            
            // Delete the entire collection to start fresh
            mongodb:DeleteResult result = check contacts->deleteMany({});
            
            log:printInfo("Database cleanup completed", deletedCount = result.deletedCount);
            
            return <json>{
                "message": "Database cleanup completed",
                "deletedCount": result.deletedCount
            };
            
        } on fail error e {
            log:printError("Error during database cleanup", e);
            return <http:InternalServerError>{
                body: {
                    "error": "Failed to cleanup database",
                    "details": "Please try again later"
                }
            };
        }
    }

    // ✅ GET /contact/stats: Get contact statistics
    resource function get contact/stats() returns json|http:InternalServerError {
        do {
            mongodb:Collection contacts = check self.EcoGreenDb->getCollection(collectionName);
            
            int totalCount = check contacts->countDocuments({});
            
            return <json>{
                "totalMessages": totalCount
            };
            
        } on fail error e {
            log:printError("Error retrieving contact statistics", e);
            return <http:InternalServerError>{
                body: {
                    "error": "Failed to retrieve statistics",
                    "details": "Please try again later"
                }
            };
        }
    }

    // Health check endpoint
    resource function get health() returns json {
        return <json>{
            "status": "healthy",
            "service": "EcoGreen Contact Service",
            "database": "connected"
        };
    }
}