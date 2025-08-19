import ballerina/http;
import ballerina/sql;
import ballerinax/java.jdbc as jdbc;
import ballerinax/mysql.driver as _;
import ballerina/websocket;
import ballerina/io;
import ballerina/time;

// Database configuration
configurable string host = ?;
configurable string port = ?;
configurable string username = ?;
configurable string password = ?;
configurable string database = ?;

string jdbcUrl = string `jdbc:mysql://${host}:${port}/${database}`;

listener websocket:Listener alertListener = new websocket:Listener(9292);
isolated map<websocket:Caller> clientsMap = {}; // Global map for connected clients

// WebSocket service for alert subscription
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
        string welcomeMsg = "Hi " + self.userName + "! You have successfully connected to the alert service.";
        io:println(welcomeMsg);

        lock {
            clientsMap[caller.getConnectionId()] = caller;
        }
    }

    remote isolated function onClose(websocket:Caller caller, int statusCode, string reason) {
        lock {
            _ = clientsMap.remove(caller.getConnectionId());
            io:println(self.userName + " disconnected from the alert service.");
        }
    }
}

// Broadcast message to all connected WebSocket clients
isolated function broadcast(string msg) {
    lock {
        foreach string connectionId in clientsMap.keys() {
            websocket:Caller? con = clientsMap[connectionId];
            if con is websocket:Caller {
                io:println("Broadcasting message: " + msg);
                websocket:Error? err = con->writeMessage(msg);
                if err is websocket:Error {
                    io:println("Error sending message: " + err.message());
                }
            }
        }
    }
}

// Create alert table if not exists
function initDatabase(sql:Client dbClient) returns error? {
    _ = check dbClient->execute(`CREATE TABLE IF NOT EXISTS ALERTS5 (
        ID INT AUTO_INCREMENT PRIMARY KEY,
        DESCRIPTION TEXT NOT NULL,
        CATEGORY VARCHAR(255),
        TIMESTAMP DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
}

// RESTful API with CORS
@http:ServiceConfig {
    cors: {
        allowOrigins: ["http://localhost:5173"],
        allowCredentials: true,
        allowHeaders: ["Content-Type", "Authorization"],
        allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        exposeHeaders: ["Content-Length", "Content-Type"]
    }
}
service /api on new http:Listener(8071) {
    final sql:Client dbClient;

    function init() returns error? {
        self.dbClient = check new jdbc:Client(jdbcUrl, username, password);
        check initDatabase(self.dbClient);
    }

    resource function get alerts(string? category) returns Alert[]|error {
        sql:ParameterizedQuery query;
        if category is string {
            query = `SELECT * FROM ALERTS5 WHERE CATEGORY = ${category}`;
        } else {
            query = `SELECT * FROM ALERTS5`;
        }
        stream<Alert, sql:Error?> alertStream = self.dbClient->query(query);
        return from Alert alert in alertStream
               select alert;
    }

    resource function get alerts/[int id]() returns Alert|http:NotFound|error {
        Alert|error alert = self.dbClient->queryRow(`SELECT * FROM ALERTS5 WHERE ID = ${id}`);
        if alert is Alert {
            return alert;
        }
        return http:NOT_FOUND;
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

            string broadcastMessage = string `New Alert: ${newAlert.description} at ${timestamp}`;
            io:println("Broadcasting post message: " + broadcastMessage);
            broadcast(broadcastMessage);

            return {body: alert};
        }
        return error("Error occurred while inserting the alert");
    }

    resource function put alerts/[int id](@http:Payload NewAlert updatedAlert) returns Alert|http:NotFound|error {
        string timestamp = getCurrentTimestamp();

        sql:ExecutionResult result = check self.dbClient->execute(`
            UPDATE ALERTS5 
            SET DESCRIPTION = ${updatedAlert.description}, 
                CATEGORY = ${updatedAlert.category},
                TIMESTAMP = ${timestamp} 
            WHERE ID = ${id}
        `);

        if result.affectedRowCount > 0 {
            string broadcastMessage = "Updated Alert: " + updatedAlert.description + " at " + timestamp;
            broadcast(broadcastMessage);

            return {
                id: id,
                description: updatedAlert.description,
                category: updatedAlert.category,
                timestamp: timestamp
            };
        }
        return http:NOT_FOUND;
    }

    resource function delete alerts/[int id]() returns http:Ok|http:NotFound|error {
        sql:ExecutionResult result = check self.dbClient->execute(`DELETE FROM ALERTS5 WHERE ID = ${id}`);
        if result.affectedRowCount > 0 {
            return http:OK;
        }
        return http:NOT_FOUND;
    }
}

// Timestamp formatting helpers
function getCurrentTimestamp() returns string {
    time:Utc currentTime = time:utcNow();
    time:Civil civil = time:utcToCivil(currentTime);

    string formattedDate = string `${civil.year}-${formatTwoDigits(civil.month)}-${formatTwoDigits(civil.day)}`;
    string formattedTime = string `${formatTwoDigits(civil.hour)}:${formatTwoDigits(civil.minute)}:${formatTwoDigits(getSeconds(civil))}`;

    return formattedDate + " " + formattedTime;
}

function formatTwoDigits(int n) returns string {
    return string `${n < 10 ? "0" : ""}${n}`;
}

function getSeconds(time:Civil civil) returns int {
    return civil.second is time:Seconds ? <int>civil.second : 0;
}

// Type definitions
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
