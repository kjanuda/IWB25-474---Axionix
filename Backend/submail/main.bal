import ballerina/http;
import ballerina/io;
import ballerina/log;
import ballerina/uuid;
import ballerina/time;
import ballerina/email;
import ballerinax/mongodb;
import ballerina/regex;

// Email subscriber record types
type EmailSubscriber record {
    string id;
    string email;
    string subscribedAt;
    boolean isActive;
};

type SubscriberInput record {
    string email;
};

type BulkEmailRequest record {
    string subject;
    string htmlContent;
    string? textContent = ();
};

// Email configuration - Use proper environment variables in production
configurable string smtpHost = "smtp.gmail.com";
configurable int smtpPort = 465;
configurable string adminEmail = "ecogreen.newsletter@gmail.com";
configurable string adminPassword = "xewjikxfbjjswpdj"; // Use app passwords for Gmail
configurable boolean useSSL = true;

// MongoDB configuration
configurable string mongoHost = "localhost";
configurable int mongoPort = 27017;
configurable string databaseName = "ecosub";
configurable string collectionName = "emailSubscribers";

// Initialize MongoDB client
final mongodb:Client mongoDb = check new ({
    connection: {
        serverAddress: {
            host: mongoHost,
            port: mongoPort
        }
    }
});

// Initialize SMTP client with proper SSL configuration
final email:SmtpClient smtpClient = check new (
    smtpHost,
    adminEmail,
    adminPassword,
    port = smtpPort
);

@http:ServiceConfig {
    cors: {
        allowOrigins: ["http://localhost:5173", "http://localhost:3000"],
        allowHeaders: ["REQUEST_ID", "Content-Type", "Authorization"],
        exposeHeaders: ["RESPONSE_ID"],
        allowMethods: ["GET", "POST", "OPTIONS", "DELETE", "PUT"],
        maxAge: 84900
    }
}
service / on new http:Listener(9092) {
    private final mongodb:Database ecoGreenDb;

    function init() returns error? {
        self.ecoGreenDb = check mongoDb->getDatabase(databaseName);
        io:println("Email Subscriber Service - MongoDB connected to " + databaseName);
        // Ensure collection exists and create indexes
        mongodb:Collection subscribers = check self.ecoGreenDb->getCollection(collectionName);
        // Create unique index on email field to prevent duplicates
        mongodb:CreateIndexOptions indexOptions = {
            unique: true,
            background: true
        };
        error? indexResult = subscribers->createIndex({"email": 1}, indexOptions);
        if indexResult is error {
            log:printWarn("Could not create email index (may already exist): " + indexResult.message());
        }
    }

    // CORS Options handlers
    resource function options .(http:Caller caller, http:Request req) returns error? {
        return self.handleCorsOptions(caller);
    }

    resource function options subscribers(http:Caller caller, http:Request req) returns error? {
        return self.handleCorsOptions(caller);
    }

    resource function options subscribers/[string subscriberId](http:Caller caller, http:Request req) returns error? {
        return self.handleCorsOptions(caller);
    }

    resource function options subscribers/send\-email(http:Caller caller, http:Request req) returns error? {
        return self.handleCorsOptions(caller);
    }

    resource function options subscribers/count(http:Caller caller, http:Request req) returns error? {
        return self.handleCorsOptions(caller);
    }

    // Helper function for CORS handling
    private function handleCorsOptions(http:Caller caller) returns error? {
        http:Response res = new;
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE, PUT");
        res.setHeader("Access-Control-Allow-Headers", "REQUEST_ID, Content-Type, Authorization");
        res.setHeader("Access-Control-Max-Age", "86400");
        check caller->respond(res);
    }

    // 📧 EMAIL SUBSCRIBER ENDPOINTS

    // POST /subscribers: Subscribe to newsletter
    resource function post subscribers(@http:Payload SubscriberInput input) returns json|http:BadRequest|http:InternalServerError {
        do {
            mongodb:Collection subscribers = check self.ecoGreenDb->getCollection(collectionName);
            // Enhanced email validation
            string email = input.email.trim().toLowerAscii();
            if !self.isValidEmail(email) {
                return <http:BadRequest>{
                    body: {
                        message: "Invalid email format. Please provide a valid email address.",
                        status: "error",
                        code: "INVALID_EMAIL"
                    }
                };
            }
            // Check if email already exists and is active
            EmailSubscriber? existingSubscriber = check subscribers->findOne({
                email: email,
                isActive: true
            });
            if existingSubscriber is EmailSubscriber {
                return {
                    message: "Email is already subscribed to our newsletter",
                    status: "existing",
                    id: existingSubscriber.id,
                    subscribedAt: existingSubscriber.subscribedAt
                };
            }
            // Check if email exists but is inactive (reactivate)
            EmailSubscriber? inactiveSubscriber = check subscribers->findOne({
                email: email,
                isActive: false
            });
            if inactiveSubscriber is EmailSubscriber {
                // Reactivate existing subscriber
                time:Utc currentTime = time:utcNow();
                string resubscribedAt = time:utcToString(currentTime);
                mongodb:UpdateResult updateResult = check subscribers->updateOne(
                    {id: inactiveSubscriber.id},
                    {"$set": {isActive: true, subscribedAt: resubscribedAt}}
                );
                if updateResult.modifiedCount > 0 {
                    log:printInfo("Subscriber reactivated: " + email);
                    // Send welcome email
                    error? welcomeEmailResult = self.sendWelcomeEmail(email);
                    if welcomeEmailResult is error {
                        log:printError("Failed to send welcome email to: " + email, welcomeEmailResult);
                    }
                    return {
                        message: "Welcome back! You have been resubscribed to EcoGreen newsletter.",
                        status: "resubscribed",
                        id: inactiveSubscriber.id
                    };
                }
            }
            // Create new subscriber
            string id = uuid:createType1AsString();
            time:Utc currentTime = time:utcNow();
            string subscribedAt = time:utcToString(currentTime);
            EmailSubscriber newSubscriber = {
                id: id,
                email: email,
                subscribedAt: subscribedAt,
                isActive: true
            };
            check subscribers->insertOne(newSubscriber);
            log:printInfo("New subscriber added: " + email);
            // Send welcome email asynchronously
            error? welcomeEmailResult = self.sendWelcomeEmail(email);
            if welcomeEmailResult is error {
                log:printError("Failed to send welcome email to: " + email, welcomeEmailResult);
                // Don't fail the subscription if email fails
            }
            return {
                message: "Successfully subscribed to EcoGreen newsletter! Check your email for confirmation.",
                status: "subscribed",
                id: id,
                subscribedAt: subscribedAt
            };
        } on fail error e {
            log:printError("Error in subscriber creation", e);
            return <http:InternalServerError>{
                body: {
                    message: "Internal server error. Please try again later.",
                    status: "error",
                    code: "INTERNAL_ERROR"
                }
            };
        }
    }

    // GET /subscribers: Get all active subscribers (Admin endpoint)
    resource function get subscribers() returns EmailSubscriber[]|http:InternalServerError {
        do {
            mongodb:Collection subscribers = check self.ecoGreenDb->getCollection(collectionName);
            stream<EmailSubscriber, error?> result = check subscribers->find(
                {isActive: true}
            );
            EmailSubscriber[] subscriberList = [];
            check result.forEach(function(EmailSubscriber item) {
                subscriberList.push(item);
            });
            log:printInfo("Retrieved " + subscriberList.length().toString() + " active subscribers");
            return subscriberList;
        } on fail error e {
            log:printError("Error retrieving subscribers", e);
            return <http:InternalServerError>{
                body: {
                    message: "Failed to retrieve subscribers",
                    status: "error",
                    code: "DATABASE_ERROR"
                }
            };
        }
    }

    // DELETE /subscribers/{id}: Unsubscribe (via API)
    resource function delete subscribers/[string subscriberId]() returns json|http:NotFound|http:InternalServerError {
        do {
            mongodb:Collection subscribers = check self.ecoGreenDb->getCollection(collectionName);
            // First get the subscriber details for logging
            EmailSubscriber? subscriber = check subscribers->findOne({id: subscriberId});
            if subscriber is () {
                return <http:NotFound>{
                    body: {
                        message: "Subscriber not found",
                        status: "not_found",
                        code: "SUBSCRIBER_NOT_FOUND"
                    }
                };
            }
            if !subscriber.isActive {
                return {
                    message: "Subscriber is already unsubscribed",
                    status: "already_unsubscribed"
                };
            }
            mongodb:UpdateResult result = check subscribers->updateOne(
                {id: subscriberId},
                {"$set": {isActive: false}}
            );
            if result.modifiedCount > 0 {
                log:printInfo("Subscriber unsubscribed: " + subscriber.email);
                return {
                    message: "Successfully unsubscribed from newsletter. We're sorry to see you go!",
                    status: "unsubscribed",
                    email: subscriber.email
                };
            } else {
                return <http:InternalServerError>{
                    body: {
                        message: "Failed to unsubscribe. Please try again.",
                        status: "error",
                        code: "UPDATE_FAILED"
                    }
                };
            }
        } on fail error e {
            log:printError("Error in unsubscribe process", e);
            return <http:InternalServerError>{
                body: {
                    message: "Internal server error during unsubscribe",
                    status: "error",
                    code: "INTERNAL_ERROR"
                }
            };
        }
    }

    // GET /unsubscribe/{subscriberId}: Unsubscribe via Web Link
    // This is the endpoint the unsubscribe link in the email points to
    resource function get unsubscribe/[string subscriberId](http:Caller caller) returns error? {
        do {
            mongodb:Collection subscribers = check self.ecoGreenDb->getCollection(collectionName);
            // Find the subscriber by ID
            EmailSubscriber? subscriber = check subscribers->findOne({id: subscriberId});
            if subscriber is () {
                // Subscriber not found, maybe already unsubscribed or invalid link
                http:Response res = new;
                res.statusCode = 404;
                res.setPayload("<html><body><h2>Unsubscribe Link Invalid</h2><p>The unsubscribe link you clicked is invalid or the subscriber was not found. You might already be unsubscribed.</p></body></html>");
                res.setHeader("Content-Type", "text/html");
                check caller->respond(res);
                return;
            }

            if !subscriber.isActive {
                // Already unsubscribed
                http:Response res = new;
                res.setPayload("<html><body><h2>Already Unsubscribed</h2><p>You have already been unsubscribed from the EcoGreen newsletter.</p></body></html>");
                res.setHeader("Content-Type", "text/html");
                check caller->respond(res);
                return;
            }

            // Perform the unsubscribe
            mongodb:UpdateResult result = check subscribers->updateOne(
                {id: subscriberId},
                {"$set": {isActive: false}}
            );

            if result.modifiedCount > 0 {
                log:printInfo("Subscriber unsubscribed via link: " + subscriber.email);
                http:Response res = new;
                res.setPayload("<html><body><h2>Successfully Unsubscribed</h2><p>You have been successfully unsubscribed from the EcoGreen newsletter. We're sorry to see you go!</p></body></html>");
                res.setHeader("Content-Type", "text/html");
                check caller->respond(res);
            } else {
                // Update failed
                http:Response res = new;
                res.statusCode = 500;
                res.setPayload("<html><body><h2>Error</h2><p>An error occurred while trying to unsubscribe you. Please try again later or contact support.</p></body></html>");
                res.setHeader("Content-Type", "text/html");
                check caller->respond(res);
            }
        } on fail error e {
            log:printError("Error in unsubscribe link process", e);
            http:Response res = new;
            res.statusCode = 500;
            res.setPayload("<html><body><h2>Internal Server Error</h2><p>An internal error occurred while processing your unsubscribe request.</p></body></html>");
            res.setHeader("Content-Type", "text/html");
            check caller->respond(res);
        }
    }


    // POST /subscribers/send-email: Send bulk email to all subscribers (Admin endpoint)
    // *** FIXED VERSION TO USE BCC FOR PRIVACY AND INCLUDE UNUSUBSCRIBE LINK ***
    resource function post subscribers/send\-email(@http:Payload BulkEmailRequest emailData) returns json|http:BadRequest|http:InternalServerError {
        do {
            // Validate input
            if emailData.subject.trim().length() == 0 {
                return <http:BadRequest>{
                    body: {
                        message: "Email subject is required",
                        status: "error",
                        code: "MISSING_SUBJECT"
                    }
                };
            }
            if emailData.htmlContent.trim().length() == 0 {
                return <http:BadRequest>{
                    body: {
                        message: "Email content is required",
                        status: "error",
                        code: "MISSING_CONTENT"
                    }
                };
            }

            mongodb:Collection subscribers = check self.ecoGreenDb->getCollection(collectionName);
            // Get all active subscribers
            stream<EmailSubscriber, error?> result = check subscribers->find({isActive: true});
            EmailSubscriber[] activeSubscribers = [];
            check result.forEach(function(EmailSubscriber item) {
                activeSubscribers.push(item);
            });

            if activeSubscribers.length() == 0 {
                log:printWarn("No active subscribers found for bulk email");
                return {
                    message: "No active subscribers found",
                    status: "no_subscribers",
                    sentCount: 0
                };
            }

            int sentCount = 0;
            // *** FIX: Loop through subscribers and send individual emails using BCC ***
            foreach EmailSubscriber subscriber in activeSubscribers {
                // Generate a unique unsubscribe link for this subscriber
                string unsubscribeLink = "http://localhost:9092/unsubscribe/" + subscriber.id; // Replace with your actual domain

                // Prepare email content with personalized unsubscribe footer
                string unsubscribeFooter = "<br><br>" +
                    "<div style=\"border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px;\">" +
                    "<p style=\"font-size: 12px; color: #666; text-align: center;\">" +
                    "You received this email because you subscribed to the EcoGreen newsletter.<br>" +
                    "If you no longer wish to receive these emails, you can <a href=\"" + unsubscribeLink + "\">unsubscribe here</a>.<br>" +
                    "Alternatively, you can contact us at <a href=\"mailto:" + adminEmail + "\">" + adminEmail + "</a>.<br>" +
                    "&copy; " + time:utcNow()[0].toString() + " EcoGreen. All rights reserved." +
                    "</p>" +
                    "</div>";

                string emailBodyWithFooter = emailData.htmlContent + unsubscribeFooter;

                // Create the email message for each individual subscriber using BCC
                email:Message bulkEmail = {
                    'from: adminEmail,          // Sender's email
                    to: [adminEmail],           // Show admin email in 'To' (common practice for BCC sends)
                    bcc: [subscriber.email],    // Send to the individual subscriber using BCC
                    subject: emailData.subject,
                    body: emailBodyWithFooter,
                    contentType: "text/html"
                    // Note: textContent field removed as it's not a valid field in email:Message
                };

                // Send the email
                error? emailResult = smtpClient->sendMessage(bulkEmail);
                if emailResult is error {
                    log:printError("Failed to send bulk email to: " + subscriber.email, emailResult);
                    // Continue sending to other subscribers even if one fails
                } else {
                    sentCount += 1;
                    log:printInfo("Bulk email sent successfully to: " + subscriber.email);
                }
            }

            log:printInfo("Bulk email sending process completed. Attempted: " + activeSubscribers.length().toString() + ", Sent: " + sentCount.toString());

            if sentCount == 0 && activeSubscribers.length() > 0 {
                return <http:InternalServerError>{
                    body: {
                        message: "Failed to send bulk email to any subscribers.",
                        status: "error",
                        code: "EMAIL_SEND_FAILED",
                        attemptedCount: activeSubscribers.length(),
                        sentCount: 0
                    }
                };
            }

            return {
                message: "Newsletter sending process completed.",
                status: "processed",
                attemptedCount: activeSubscribers.length(),
                sentCount: sentCount,
                subject: emailData.subject,
                timestamp: time:utcToString(time:utcNow())
            };
        } on fail error e {
            log:printError("Error in bulk email sending process", e);
            return <http:InternalServerError>{
                body: {
                    message: "Internal server error while processing bulk email sending",
                    status: "error",
                    code: "INTERNAL_ERROR"
                }
            };
        }
    }
    // *** END OF FIXED RESOURCE ***


    // GET /subscribers/count: Get subscriber statistics
    resource function get subscribers/count() returns json|http:InternalServerError {
        do {
            mongodb:Collection subscribers = check self.ecoGreenDb->getCollection(collectionName);
            int activeCount = check subscribers->countDocuments({isActive: true});
            int totalCount = check subscribers->countDocuments({});
            int unsubscribedCount = totalCount - activeCount;
            return {
                activeSubscribers: activeCount,
                totalSubscribers: totalCount,
                unsubscribed: unsubscribedCount,
                timestamp: time:utcToString(time:utcNow())
            };
        } on fail error e {
            log:printError("Error retrieving subscriber count", e);
            return <http:InternalServerError>{
                body: {
                    message: "Failed to retrieve subscriber statistics",
                    status: "error",
                    code: "DATABASE_ERROR"
                }
            };
        }
    }

    // Enhanced email validation function
    private function isValidEmail(string email) returns boolean {
        if email.length() == 0 || email.length() > 254 {
            return false;
        }
        // Basic regex pattern for email validation
        string emailPattern = "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$";
        return regex:matches(email, emailPattern);
    }

    // Helper function to send welcome email with improved HTML design
    private function sendWelcomeEmail(string email) returns error? {
        // Generate a unique unsubscribe link for the welcome email (though less critical)
        // For welcome emails, you might just link to general preferences or contact info.
        // However, including the link is good practice.
        // Let's find the subscriber's ID first to create the link
        mongodb:Collection subscribers = check self.ecoGreenDb->getCollection(collectionName);
        EmailSubscriber? subscriber = check subscribers->findOne({email: email, isActive: true});

        string unsubscribeLink = "http://localhost:9092/unsubscribe/unknown"; // Default
        if subscriber is EmailSubscriber {
             unsubscribeLink = "http://localhost:9092/unsubscribe/" + subscriber.id;
        }

        string htmlContent = "<!DOCTYPE html>" +
            "<html lang=\"en\">" +
            "<head>" +
            "<meta charset=\"UTF-8\">" +
            "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">" +
            "<title>Welcome to EcoGreen</title>" +
            "<style>" +
            "body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }" +
            ".container { max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 0 20px rgba(0,0,0,0.1); }" +
            ".header { background: linear-gradient(135deg, #4CAF50, #45a049); color: white; padding: 40px 20px; text-align: center; }" +
            ".header h1 { margin: 0; font-size: 28px; font-weight: 300; }" +
            ".content { padding: 40px 30px; }" +
            ".content h2 { color: #4CAF50; margin-top: 0; }" +
            ".features { background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; }" +
            ".features ul { list-style: none; padding: 0; }" +
            ".features li { padding: 8px 0; position: relative; padding-left: 30px; }" +
            ".features li:before { content: '✓'; position: absolute; left: 0; color: #4CAF50; font-weight: bold; }" +
            ".footer { background-color: #f0f0f0; padding: 20px; text-align: center; font-size: 12px; color: #666; }" +
            ".cta-button { display: inline-block; background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }" +
            "</style>" +
            "</head>" +
            "<body>" +
            "<div class=\"container\">" +
            "<div class=\"header\">" +
            "<h1>🌱 Welcome to EcoGreen!</h1>" +
            "</div>" +
            "<div class=\"content\">" +
            "<h2>Thank you for joining our eco-community!</h2>" +
            "<p>We're thrilled to have you as part of our mission to create a more sustainable world. Your subscription helps us grow a community of environmentally conscious individuals.</p>" +
            "<div class=\"features\">" +
            "<h3>What you'll receive:</h3>" +
            "<ul>" +
            "<li>Latest eco-friendly tips and sustainable living guides</li>" +
            "<li>Environmental news and climate action updates</li>" +
            "<li>Green product recommendations and reviews</li>" +
            "<li>Community spotlights and success stories</li>" +
            "<li>Exclusive offers from eco-friendly brands</li>" +
            "</ul>" +
            "</div>" +
            "<p>Together, we can make a meaningful impact on our planet's future. Every small action counts!</p>" +
            "<center>" +
            "<a href=\"#\" class=\"cta-button\">Visit Our Website</a>" +
            "</center>" +
             "<br><br>" + // Add some space before the footer
            "<div style=\"border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px;\">" +
            "<p style=\"font-size: 12px; color: #666; text-align: center;\">" +
            "You received this email because you subscribed to the EcoGreen newsletter.<br>" +
            "If you no longer wish to receive these emails, you can <a href=\"" + unsubscribeLink + "\">unsubscribe here</a>.<br>" +
            "Alternatively, you can contact us at <a href=\"mailto:" + adminEmail + "\">" + adminEmail + "</a>.<br>" +
            "&copy; " + time:utcNow()[0].toString() + " EcoGreen. All rights reserved." +
            "</p>" +
            "</div>" +
            "</div>" + // Close content div
            "</div>" + // Close container div
            "</body>" +
            "</html>";

        email:Message welcomeEmail = {
            to: [email],
            subject: "🌱 Welcome to EcoGreen Newsletter - Let's Go Green Together!",
            'from: adminEmail,
            body: htmlContent,
            contentType: "text/html"
        };
        return smtpClient->sendMessage(welcomeEmail);
    }
}