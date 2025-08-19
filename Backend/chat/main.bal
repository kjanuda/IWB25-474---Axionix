import ballerina/http;
import ballerina/log;
import ballerina/email;
import ballerina/time;

// Email configuration
configurable string smtpHost = "smtp.gmail.com";
configurable int smtpPort = 465;
configurable string adminEmail = "ecogreen360.careers@gmail.com";
configurable string adminPassword = "ipvvyfblikmlaqnn";
configurable string fromEmail = "ecogreen360.careers@gmail.com";

// OpenAI configuration
configurable string openaiEndpointUrl = ?;
configurable string openaiDeploymentName = ?;
configurable string openaiApiKey = ?;

// In-memory storage for pending emails (session-based)
map<json> pendingEmails = {};

// Generate session ID for tracking pending emails
function generateSessionId() returns string {
    return "session_" + time:utcNow()[0].toString();
}

// Check if message is a confirmation response
function isConfirmationResponse(string content) returns boolean {
    string lowerContent = content.toLowerAscii().trim();
    string[] confirmationWords = ["send", "submit", "yes", "y", "ok", "confirm", "cancel", "no", "n"];
    
    foreach string word in confirmationWords {
        if lowerContent == word {
            return true;
        }
    }
    return false;
}

// Check if user message contains email sending request
function checkForEmailRequest(string content) returns boolean {
    string lowerContent = content.toLowerAscii();
    string[] emailKeywords = ["send", "mail", "email", "send it", "send this", "can you send", "send to", "email to", "mail to"];
    
    foreach string keyword in emailKeywords {
        if lowerContent.includes(keyword) {
            return true;
        }
    }
    return false;
}

// Extract email address from user message
function extractEmailAddress(string content) returns string? {
    log:printInfo("Extracting email from content", content = content);
    
    // Simple approach - look for @ symbol and extract around it
    int? atIndex = content.indexOf("@");
    if atIndex == () {
        log:printInfo("No @ symbol found");
        return ();
    }
    
    log:printInfo("Found @ at index", atIndex = atIndex);
    
    // Find start of email (look backwards for space or start of string)
    int startIndex = 0;
    int i = atIndex - 1;
    while i >= 0 {
        string char = content.substring(i, i + 1);
        if char == " " || char == "\t" || char == "\n" || char == "," || char == ";" {
            startIndex = i + 1;
            break;
        }
        i = i - 1;
    }
    
    // Find end of email (look forwards for space or end of string)
    int endIndex = content.length();
    i = atIndex + 1;
    while i < content.length() {
        string char = content.substring(i, i + 1);
        if char == " " || char == "\t" || char == "\n" || char == "," || char == ";" {
            endIndex = i;
            break;
        }
        i = i + 1;
    }
    
    string potentialEmail = content.substring(startIndex, endIndex);
    log:printInfo("Extracted potential email", 
        email = potentialEmail, 
        startIndex = startIndex, 
        endIndex = endIndex
    );
    
    // Basic validation - must contain @ and a dot after @
    int? dotIndex = potentialEmail.indexOf(".");
    int? emailAtIndex = potentialEmail.indexOf("@");
    
    if emailAtIndex != () && dotIndex != () && dotIndex > emailAtIndex {
        log:printInfo("Email validation passed", email = potentialEmail);
        return potentialEmail;
    }
    
    log:printInfo("Email validation failed", 
        email = potentialEmail,
        hasAt = emailAtIndex != (),
        hasDot = dotIndex != (),
        dotAfterAt = dotIndex != () && emailAtIndex != () && dotIndex > emailAtIndex
    );
    return ();
}

// Generate email content based on user request
function generateEmailContent(string userRequest) returns string {
    return string `Dear Recipient,

I hope this email finds you well.

${userRequest}

This information has been automatically generated and sent through the ECOGREEN360 chatbot system.

If you have any questions or need further assistance, please don't hesitate to contact us.

Best regards,
ECOGREEN360 Team
CEO: Januda J Kodithuwakku

--
ECOGREEN360 - Greenhouse Development & IoT Systems
This email was sent via our automated chatbot system.`;
}

// Send email function
function sendEmail(string recipient, string subject, string content) returns error? {
    
    email:SmtpConfiguration emailConfig = {
        port: smtpPort,
        security: email:START_TLS_NEVER // Use SSL for port 465
    };
    
    email:SmtpClient smtpClient = check new (smtpHost, adminEmail, adminPassword, emailConfig);
    
    email:Message emailMessage = {
        to: [recipient],
        subject: subject,
        body: content,
        'from: fromEmail
    };
    
    check smtpClient->sendMessage(emailMessage);
    
    log:printInfo("Email sent successfully", recipient = recipient, subject = subject);
    
    return ();
}

// Handle email request
function handleEmailRequest(string userContent, string emailAddress) returns json {
    // Generate email content based on user request
    string subject = "Information from ECOGREEN360 Chatbot";
    string emailContent = generateEmailContent(userContent);
    
    // Generate session ID and store email data
    string sessionId = generateSessionId();
    json emailData = {
        "recipient": emailAddress,
        "subject": subject,
        "content": emailContent
    };
    
    pendingEmails[sessionId] = emailData;
    
    log:printInfo("Email request stored", sessionId = sessionId, recipient = emailAddress);
    
    // Return structured response with email preview
    return {
        "type": "email_request",
        "session_id": sessionId,
        "email_preview": emailData,
        "message": "I've prepared an email for you. Please review the content below and type 'SEND', 'SUBMIT', or 'YES' to send the email, or 'CANCEL'/'NO' to abort:",
        "action_required": "send_confirmation"
    };
}

// Regular chatbot response function
function getChatbotResponse(json userMessage) returns json|error {
    // Validate configuration
    if openaiEndpointUrl == "" || openaiDeploymentName == "" || openaiApiKey == "" {
        log:printError("Missing required configuration");
        return error("Server configuration error: Missing OpenAI credentials");
    }
    
    http:Client openAIClient = check new (openaiEndpointUrl, {
        timeout: 30,
        secureSocket: {
            enable: true,
            verifyHostName: true
        }
    });

    json payload = {
        "messages": [
            {
                "role": "system", 
                "content": "ECOGREEN360 is a greenhouse development and build company specializing in IoT-based systems. The company is led by CEO and President Januda J Kodithuwakku. You are an AI assistant for ECOGREEN360. When users request to send emails, you should help them compose professional emails and confirm the sending process."
            },
            {
                "role": "user", 
                "content": check userMessage.content
            }
        ],
        "max_tokens": 800,
        "temperature": 0.7,
        "top_p": 0.95,
        "frequency_penalty": 0,
        "presence_penalty": 0,
        "stop": null
    };

    http:Request req = new;
    req.setHeader("api-key", openaiApiKey);
    req.setHeader("Content-Type", "application/json");
    req.setPayload(payload);

    string path = "/openai/deployments/" + openaiDeploymentName + "/chat/completions?api-version=2024-02-01";
    
    log:printInfo("Making request to OpenAI", 
        endpoint = openaiEndpointUrl,
        deployment = openaiDeploymentName,
        path = path
    );

    http:Response|error res = openAIClient->post(path, req);
    
    if res is error {
        log:printError("Error calling OpenAI", 'error = res);
        return error("Failed to call OpenAI API: " + res.message());
    }

    if res.statusCode == 200 {
        json responsePayload = check res.getJsonPayload();
        log:printInfo("Successful response from OpenAI");
        return responsePayload;
    } else {
        string errorBody = "";
        var bodyResult = res.getTextPayload();
        if bodyResult is string {
            errorBody = bodyResult;
        }
        
        log:printError("OpenAI API error", 
            statusCode = res.statusCode, 
            reasonPhrase = res.reasonPhrase, 
            body = errorBody
        );
        
        if res.statusCode == 404 {
            return error("Configuration error: OpenAI deployment not found.");
        } else if res.statusCode == 401 {
            return error("Authentication error: Invalid API key.");
        } else if res.statusCode == 429 {
            return error("Rate limit exceeded. Please try again later.");
        } else {
            return error("OpenAI API error: " + res.statusCode.toString() + " - " + res.reasonPhrase);
        }
    }
}

@http:ServiceConfig {
    cors: {
        allowOrigins: ["http://localhost:5173"],
        allowCredentials: false,
        allowHeaders: ["Content-Type", "Authorization"],
        allowMethods: ["POST", "OPTIONS", "GET"],
        maxAge: 84900
    }
}
service / on new http:Listener(8090) {
    
    // Health check endpoint
    resource function get health() returns json {
        return {"status": "healthy", "service": "chatbot"};
    }
    
    // Enhanced chat endpoint with email detection and confirmation handling
    resource function post chatbot/chat(@http:Payload json userMessage) returns json|error {
        
        log:printInfo("Received chat request", userMessage = userMessage);
        
        // Validate input
        if userMessage.content is () {
            return error("Missing 'content' field in request body");
        }
        
        string userContent = check userMessage.content;
        
        // Debug logging for email detection
        log:printInfo("Processing message", content = userContent);
        
        // Check if this is a confirmation response for any pending email
        if isConfirmationResponse(userContent) && pendingEmails.length() > 0 {
            // Find the most recent pending email (simple approach for demo)
            string[] sessionIds = pendingEmails.keys();
            if sessionIds.length() > 0 {
                string latestSessionId = sessionIds[sessionIds.length() - 1];
                json? emailData = pendingEmails[latestSessionId];
                
                if emailData != () {
                    log:printInfo("Processing email confirmation", 
                        action = userContent, 
                        sessionId = latestSessionId
                    );
                    
                    string action = userContent.toLowerAscii().trim();
                    
                    if action == "send" || action == "submit" || action == "yes" || action == "y" || action == "ok" || action == "confirm" {
                        // Send the email
                        string recipient = check emailData.recipient;
                        string subject = check emailData.subject;
                        string content = check emailData.content;
                        
                        error? emailResult = sendEmail(recipient, subject, content);
                        
                        // Remove from pending emails
                        _ = pendingEmails.remove(latestSessionId);
                        
                        if emailResult is error {
                            return {
                                "type": "email_error",
                                "message": "Failed to send email: " + emailResult.message()
                            };
                        }
                        
                        return {
                            "type": "email_success",
                            "message": "✅ Email sent successfully to " + recipient + "!"
                        };
                        
                    } else if action == "cancel" || action == "no" || action == "n" {
                        // Cancel the email
                        _ = pendingEmails.remove(latestSessionId);
                        
                        return {
                            "type": "email_cancelled",
                            "message": "❌ Email sending cancelled."
                        };
                    }
                }
            }
        }
        
        // Check if the message contains email sending request
        boolean isEmailRequest = checkForEmailRequest(userContent);
        string? emailAddress = extractEmailAddress(userContent);
        
        log:printInfo("Email detection results", 
            isEmailRequest = isEmailRequest, 
            emailAddress = emailAddress
        );
        
        if isEmailRequest && emailAddress != () {
            log:printInfo("Handling email request", recipient = emailAddress);
            // Handle email request
            return handleEmailRequest(userContent, emailAddress);
        }
        
        if isEmailRequest && emailAddress == () {
            // Email keywords found but no valid email address
            return {
                "type": "email_error",
                "message": "I detected you want to send an email, but I couldn't find a valid email address. Please include the recipient's email address (e.g., user@example.com) in your message."
            };
        }
        
        // Regular chatbot response
        return getChatbotResponse(userMessage);
    }
    
    // Send email endpoint
    resource function post chatbot/send\-email(@http:Payload json emailData) returns json|error {
        
        log:printInfo("Received email send request", emailData = emailData);
        
        // Validate email data
        if emailData.recipient is () || emailData.subject is () || emailData.content is () {
            return {"success": false, "message": "Missing required fields: recipient, subject, or content"};
        }
        
        string recipient = check emailData.recipient;
        string subject = check emailData.subject;
        string content = check emailData.content;
        
        // Send email
        error? emailResult = sendEmail(recipient, subject, content);
        
        if emailResult is error {
            log:printError("Failed to send email", 'error = emailResult);
            return {"success": false, "message": "Failed to send email: " + emailResult.message()};
        }
        
        return {"success": true, "message": "Email sent successfully to " + recipient};
    }
    
    // Confirmation endpoint for email sending
    resource function post chatbot/confirm\-email(@http:Payload json confirmData) returns json|error {
        
        if confirmData.action is () || confirmData.email_data is () {
            return {"success": false, "message": "Missing action or email data"};
        }
        
        string action = check confirmData.action;
        json emailData = check confirmData.email_data;
        
        // Check if user confirmed to send
        string lowerAction = action.toLowerAscii();
        if lowerAction == "send" || lowerAction == "submit" || lowerAction == "yes" {
            
            string recipient = check emailData.recipient;
            string subject = check emailData.subject;
            string content = check emailData.content;
            
            // Send the email
            error? emailResult = sendEmail(recipient, subject, content);
            
            if emailResult is error {
                return {
                    "success": false, 
                    "message": "Failed to send email: " + emailResult.message(),
                    "type": "email_error"
                };
            }
            
            return {
                "success": true, 
                "message": "✅ Email sent successfully to " + recipient + "!",
                "type": "email_sent"
            };
        } else {
            return {
                "success": false, 
                "message": "Email sending cancelled.",
                "type": "email_cancelled"
            };
        }
    }
    
    // Get pending emails status
    resource function get chatbot/pending\-emails() returns json {
        return {
            "pending_count": pendingEmails.length(),
            "session_ids": pendingEmails.keys()
        };
    }
    
    // Clear all pending emails (for testing)
    resource function post chatbot/clear\-pending() returns json {
        pendingEmails.removeAll();
        return {
            "message": "All pending emails cleared",
            "success": true
        };
    }
    resource function get config/'check() returns json {
        return {
            "openai": {
                "endpoint": openaiEndpointUrl != "" ? "configured" : "missing",
                "deployment": openaiDeploymentName != "" ? openaiDeploymentName : "missing",
                "apiKey": openaiApiKey != "" ? "configured" : "missing"
            },
            "email": {
                "smtp_host": smtpHost != "" ? "configured" : "missing",
                "smtp_port": smtpPort != 0 ? smtpPort.toString() : "missing",
                "username": adminEmail != "" ? "configured" : "missing",
                "password": adminPassword != "" ? "configured" : "missing",
                "from_email": fromEmail != "" ? fromEmail : "missing"
            }
        };
    }
    
    // Debug email detection endpoint
    resource function post debug/email\-detection(@http:Payload json testData) returns json|error {
        
        if testData.content is () {
            return {"error": "Missing content field"};
        }
        
        string content = check testData.content;
        boolean isEmailRequest = checkForEmailRequest(content);
        string? emailAddress = extractEmailAddress(content);
        
        return {
            "input": content,
            "isEmailRequest": isEmailRequest,
            "emailAddress": emailAddress,
            "debug": {
                "lowerContent": content.toLowerAscii(),
                "containsSend": content.toLowerAscii().includes("send"),
                "containsMail": content.toLowerAscii().includes("mail"),
                "containsEmail": content.toLowerAscii().includes("email"),
                "containsAt": content.includes("@"),
                "atIndex": content.indexOf("@"),
                "length": content.length()
            }
        };
    }
    resource function post debug/test(@http:Payload json payload) returns json|error {
        http:Client openAIClient = check new (openaiEndpointUrl);
        
        // Test different API versions
        string[] apiVersions = ["2024-02-01", "2023-12-01-preview", "2023-05-15"];
        
        foreach string apiVersion in apiVersions {
            http:Request req = new;
            req.setHeader("api-key", openaiApiKey);
            req.setHeader("Content-Type", "application/json");
            req.setPayload({
                "messages": [{"role": "user", "content": "test"}],
                "max_tokens": 10
            });
            
            string testPath = "/openai/deployments/" + openaiDeploymentName + "/chat/completions?api-version=" + apiVersion;
            
            http:Response|error res = openAIClient->post(testPath, req);
            
            if res is http:Response && res.statusCode == 200 {
                return {"success": true, "working_api_version": apiVersion};
            }
        }
        
        return {"success": false, "message": "No API version worked"};
    }
    
    // Handle root path
    resource function get .() returns string {
        return "ECOGREEN360 Chatbot service with email functionality is running!";
    }
    
    // Handle favicon requests
    resource function get favicon\.ico() returns http:NotFound {
        return {};
    }
}