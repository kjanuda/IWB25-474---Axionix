import ballerina/http;
import ballerina/sql;
import ballerinax/postgresql;
import ballerina/log;
import ballerina/time;
import ballerina/email;

// Database configuration
configurable string DB_HOST = "localhost";
configurable int DB_PORT = 5432;
configurable string DB_NAME = "meeting_scheduler";
configurable string DB_USER = "postgres";
configurable string DB_PASSWORD = "J3007426@Januda";

// Email configuration
configurable string smtpHost = "smtp.gmail.com";
configurable int smtpPort = 465;
configurable string adminEmail = "ecogreen360.careers@gmail.com";
configurable string adminPassword = "ipvvyfblikmlaqnn";

// PostgreSQL client
final postgresql:Client dbClient = check new (
    host = DB_HOST,
    port = DB_PORT,
    database = DB_NAME,
    username = DB_USER,
    password = DB_PASSWORD
);

// Email client
final email:SmtpClient smtpClient = check new (
    host = smtpHost,
    port = smtpPort,
    username = adminEmail,
    password = adminPassword,
    security = email:SSL
);

// Data models
type MeetingRequest record {|
    string id?;
    string userName;
    string email;
    string phoneNumber;
    string interest;
    string textMessage;
    string status?; // pending, approved, rejected
    string createdAt?;
    string updatedAt?;
|};

type MeetingRequestUpdate record {|
    string status;
    string adminNotes?;
    string meetingDateTime?; // For approved meetings - ISO 8601 format
    string meetingLink?; // For approved meetings
|};

type ApiResponse record {|
    boolean success;
    string message;
    anydata data?;
|};

// HTTP service with CORS configuration
@http:ServiceConfig {
    cors: {
        allowOrigins: ["*"],
        allowCredentials: false,
        allowHeaders: ["CORS-Request-Method", "CORS-Request-Headers", "content-type"],
        allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    }
}
service /api/v1 on new http:Listener(5080) {

    // Initialize database tables
    function init() returns error? {
        _ = check self.createTables();
        _ = check self.migrateTables();
        log:printInfo("Meeting Schedule Platform Backend started successfully");
    }

    // Create database tables
    private function createTables() returns sql:Error? {
        // Create meeting_requests table with additional fields for meeting details
        sql:ExecutionResult _ = check dbClient->execute(`
            CREATE TABLE IF NOT EXISTS meeting_requests (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_name VARCHAR(100) NOT NULL,
                email VARCHAR(255) NOT NULL,
                phone_number VARCHAR(20) NOT NULL,
                interest VARCHAR(500) NOT NULL,
                text_message TEXT NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                admin_notes TEXT,
                meeting_datetime TIMESTAMP,
                meeting_link TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create indexes
        sql:ExecutionResult _ = check dbClient->execute(`
            CREATE INDEX IF NOT EXISTS idx_meeting_requests_email 
            ON meeting_requests(email)
        `);

        sql:ExecutionResult _ = check dbClient->execute(`
            CREATE INDEX IF NOT EXISTS idx_meeting_requests_status 
            ON meeting_requests(status)
        `);

        return;
    }

    // Migrate existing tables to add missing columns
    private function migrateTables() returns sql:Error? {
        // Check if meeting_datetime column exists and add if missing
        do {
            _ = check dbClient->execute(`
                ALTER TABLE meeting_requests 
                ADD COLUMN IF NOT EXISTS meeting_datetime TIMESTAMP
            `);
            log:printInfo("Added meeting_datetime column if missing");
        } on fail var e {
            log:printDebug("meeting_datetime column migration: " + e.message());
        }

        // Check if meeting_link column exists and add if missing
        do {
            _ = check dbClient->execute(`
                ALTER TABLE meeting_requests 
                ADD COLUMN IF NOT EXISTS meeting_link TEXT
            `);
            log:printInfo("Added meeting_link column if missing");
        } on fail var e {
            log:printDebug("meeting_link column migration: " + e.message());
        }

        // Check if admin_notes column exists and add if missing
        do {
            _ = check dbClient->execute(`
                ALTER TABLE meeting_requests 
                ADD COLUMN IF NOT EXISTS admin_notes TEXT
            `);
            log:printInfo("Added admin_notes column if missing");
        } on fail var e {
            log:printDebug("admin_notes column migration: " + e.message());
        }

        return;
    }

    // Submit a new meeting request
    resource function post meetings(http:Request req) returns json {
        do {
            json payload = check req.getJsonPayload();
            MeetingRequest meetingReq = check payload.cloneWithType(MeetingRequest);
            
            // Validate required fields
            if (meetingReq.userName.trim() == "" || 
                meetingReq.email.trim() == "" || 
                meetingReq.phoneNumber.trim() == "" ||
                meetingReq.interest.trim() == "" ||
                meetingReq.textMessage.trim() == "") {
                return {
                    success: false,
                    message: "All fields are required"
                };
            }

            // Insert into database
            sql:ExecutionResult result = check dbClient->execute(`
                INSERT INTO meeting_requests 
                (user_name, email, phone_number, interest, text_message, created_at, updated_at)
                VALUES (${meetingReq.userName}, ${meetingReq.email}, 
                        ${meetingReq.phoneNumber}, ${meetingReq.interest}, 
                        ${meetingReq.textMessage}, NOW(), NOW())
            `);

            if (result.affectedRowCount > 0) {
                // Get the inserted record ID
                record {|string id;|} insertedRecord = check dbClient->queryRow(`
                    SELECT id::text as id FROM meeting_requests 
                    WHERE email = ${meetingReq.email} 
                    ORDER BY created_at DESC 
                    LIMIT 1
                `);
                
                log:printInfo("New meeting request created: " + insertedRecord.id);
                return {
                    success: true,
                    message: "Meeting request submitted successfully",
                    data: {
                        requestId: insertedRecord.id,
                        status: "pending"
                    }
                };
            } else {
                return {
                    success: false,
                    message: "Failed to create meeting request"
                };
            }
        } on fail var e {
            log:printError("Error creating meeting request: " + e.message());
            return {
                success: false,
                message: "Internal server error"
            };
        }
    }

    // Get all meeting requests (Admin endpoint)
    resource function get admin/meetings(http:Request req, 
                                        string? status = (), 
                                        int pageLimit = 10, 
                                        int offset = 0) returns json {
        do {
            sql:ParameterizedQuery query;
            
            if (status is string) {
                query = `
                    SELECT id::text as id, user_name, email, phone_number, interest, 
                           text_message, status, admin_notes, meeting_datetime,
                           meeting_link, created_at, updated_at 
                    FROM meeting_requests 
                    WHERE status = ${status}
                    ORDER BY created_at DESC 
                    LIMIT ${pageLimit} OFFSET ${offset}
                `;
            } else {
                query = `
                    SELECT id::text as id, user_name, email, phone_number, interest, 
                           text_message, status, admin_notes, meeting_datetime,
                           meeting_link, created_at, updated_at 
                    FROM meeting_requests 
                    ORDER BY created_at DESC 
                    LIMIT ${pageLimit} OFFSET ${offset}
                `;
            }

            stream<record {}, error?> resultStream = dbClient->query(query);
            record {}[] meetings = check from record {} meeting in resultStream
                                  select meeting;

            // Get total count
            sql:ParameterizedQuery countQuery;
            if (status is string) {
                countQuery = `SELECT COUNT(*) as total FROM meeting_requests WHERE status = ${status}`;
            } else {
                countQuery = `SELECT COUNT(*) as total FROM meeting_requests`;
            }
            
            record {|int total;|} countResult = check dbClient->queryRow(countQuery);

            return {
                success: true,
                message: "Meeting requests retrieved successfully",
                data: {
                    meetings: meetings.toJson(),
                    pagination: {
                        total: countResult.total,
                        "limit": pageLimit,
                        offset: offset,
                        hasMore: countResult.total > (offset + pageLimit)
                    }
                }
            };
        } on fail var e {
            log:printError("Error retrieving meeting requests: " + e.message());
            return {
                success: false,
                message: "Internal server error"
            };
        }
    }

    // Get a specific meeting request by ID
    resource function get admin/meetings/[string id]() returns json {
        do {
            record {} meeting = check dbClient->queryRow(`
                SELECT id::text as id, user_name, email, phone_number, interest, 
                       text_message, status, admin_notes, meeting_datetime,
                       meeting_link, created_at, updated_at 
                FROM meeting_requests 
                WHERE id = ${id}::uuid
            `);

            return {
                success: true,
                message: "Meeting request retrieved successfully",
                data: meeting.toJson()
            };
        } on fail error e {
            if (e is sql:NoRowsError) {
                return {
                    success: false,
                    message: "Meeting request not found"
                };
            } else {
                log:printError("Error retrieving meeting request: " + e.message());
                return {
                    success: false,
                    message: "Internal server error"
                };
            }
        }
    }

    // Update meeting request status (Admin endpoint) - Enhanced with email sending
    resource function put admin/meetings/[string id](http:Request req) returns json {
        do {
            json payload = check req.getJsonPayload();
            MeetingRequestUpdate updateReq = check payload.cloneWithType(MeetingRequestUpdate);
            
            // Validate status
            if (updateReq.status != "approved" && updateReq.status != "rejected" && updateReq.status != "pending") {
                return {
                    success: false,
                    message: "Invalid status. Must be 'pending', 'approved', or 'rejected'"
                };
            }

            // Get the existing meeting request
            record {|
                string user_name;
                string email;
                string interest;
            |} existingMeeting = check dbClient->queryRow(`
                SELECT user_name, email, interest FROM meeting_requests WHERE id = ${id}::uuid
            `);

            string adminNotes = updateReq.adminNotes ?: "";
            string? meetingDateTime = updateReq.meetingDateTime;
            string? meetingLink = updateReq.meetingLink;

            // Update the database
            sql:ExecutionResult result;
            if (updateReq.status == "approved") {
                result = check dbClient->execute(`
                    UPDATE meeting_requests 
                    SET status = ${updateReq.status}, 
                        admin_notes = ${adminNotes}, 
                        meeting_datetime = ${meetingDateTime}::timestamp,
                        meeting_link = ${meetingLink},
                        updated_at = NOW()
                    WHERE id = ${id}::uuid
                `);
            } else {
                result = check dbClient->execute(`
                    UPDATE meeting_requests 
                    SET status = ${updateReq.status}, 
                        admin_notes = ${adminNotes}, 
                        updated_at = NOW()
                    WHERE id = ${id}::uuid
                `);
            }

            if (result.affectedRowCount > 0) {
                // Send email notification
                boolean emailSent = false;
                if (updateReq.status == "approved") {
                    emailSent = self.sendApprovalEmail(
                        existingMeeting.email, 
                        existingMeeting.user_name, 
                        existingMeeting.interest,
                        meetingDateTime ?: "",
                        meetingLink ?: ""
                    );
                } else if (updateReq.status == "rejected") {
                    emailSent = self.sendRejectionEmail(
                        existingMeeting.email, 
                        existingMeeting.user_name, 
                        existingMeeting.interest,
                        adminNotes
                    );
                }

                log:printInfo("Meeting request updated: " + id + " -> " + updateReq.status);
                return {
                    success: true,
                    message: "Meeting request updated successfully" + (emailSent ? " and email sent" : " (email failed to send)"),
                    data: {
                        id: id,
                        status: updateReq.status,
                        emailSent: emailSent
                    }
                };
            } else {
                return {
                    success: false,
                    message: "Meeting request not found"
                };
            }
        } on fail var e {
            log:printError("Error updating meeting request: " + e.message());
            return {
                success: false,
                message: "Internal server error"
            };
        }
    }

    // Send approval email
    private function sendApprovalEmail(string toEmail, string userName, string interest, 
                                     string meetingDateTime, string meetingLink) returns boolean {
        do {
            string subject = "🎉 Meeting Request Approved - EcoGreen360";
            
            // Format the meeting date/time for display
            string formattedDateTime = meetingDateTime;
            if (meetingDateTime != "") {
                // You can add date formatting logic here if needed
                formattedDateTime = meetingDateTime;
            }

            string htmlContent = "<!DOCTYPE html>" +
                "<html>" +
                "<head>" +
                    "<meta charset=\"UTF-8\">" +
                    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">" +
                    "<title>Meeting Approved</title>" +
                    "<style>" +
                        "body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }" +
                        ".container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }" +
                        ".header { background: linear-gradient(135deg, #4CAF50, #45a049); color: white; padding: 30px 20px; text-align: center; }" +
                        ".header h1 { margin: 0; font-size: 28px; font-weight: bold; }" +
                        ".content { padding: 30px; }" +
                        ".greeting { font-size: 18px; color: #2c3e50; margin-bottom: 20px; }" +
                        ".meeting-details { background: linear-gradient(135deg, #e8f5e8, #f0f8f0); padding: 20px; border-radius: 8px; border-left: 5px solid #4CAF50; margin: 25px 0; }" +
                        ".meeting-details h3 { margin-top: 0; color: #2e7d2e; font-size: 20px; }" +
                        ".detail-item { margin: 15px 0; }" +
                        ".detail-label { font-weight: bold; color: #555; }" +
                        ".button { display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #4CAF50, #45a049); color: white; text-decoration: none; border-radius: 25px; margin: 15px 0; font-weight: bold; transition: transform 0.2s; }" +
                        ".button:hover { transform: translateY(-2px); }" +
                        ".instructions { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }" +
                        ".instructions h4 { color: #495057; margin-top: 0; }" +
                        ".instructions ul { padding-left: 20px; }" +
                        ".instructions li { margin: 8px 0; color: #6c757d; }" +
                        ".footer { background-color: #f8f9fa; text-align: center; padding: 20px; color: #6c757d; font-size: 14px; }" +
                        ".emoji { font-size: 24px; }" +
                        ".highlight { background-color: #fff3cd; padding: 10px; border-radius: 5px; border-left: 4px solid #ffc107; margin: 15px 0; }" +
                    "</style>" +
                "</head>" +
                "<body>" +
                    "<div class=\"container\">" +
                        "<div class=\"header\">" +
                            "<div class=\"emoji\">🎉</div>" +
                            "<h1>Meeting Request Approved!</h1>" +
                        "</div>" +
                        "<div class=\"content\">" +
                            "<div class=\"greeting\">Dear <strong>" + userName + "</strong>,</div>" +
                            "<p>Excellent news! Your meeting request has been <strong style=\"color: #4CAF50;\">approved</strong>. We're excited to connect with you!</p>" +
                            "<div class=\"highlight\">" +
                                "<strong>📝 Your Request:</strong> " + interest +
                            "</div>" +
                            "<div class=\"meeting-details\">" +
                                "<h3>📅 Meeting Details</h3>" +
                                "<div class=\"detail-item\">" +
                                    "<div class=\"detail-label\">🕒 Date & Time:</div>" +
                                    "<div>" + formattedDateTime + "</div>" +
                                "</div>" +
                                "<div class=\"detail-item\">" +
                                    "<div class=\"detail-label\">🔗 Meeting Link:</div>" +
                                    "<a href=\"" + meetingLink + "\" class=\"button\" target=\"_blank\">🚀 Join Meeting</a>" +
                                    "<div style=\"font-size: 12px; color: #666; margin-top: 10px;\">" +
                                        "Direct Link: <a href=\"" + meetingLink + "\" style=\"color: #4CAF50;\">" + meetingLink + "</a>" +
                                    "</div>" +
                                "</div>" +
                            "</div>" +
                            "<div class=\"instructions\">" +
                                "<h4>🎯 What's Next?</h4>" +
                                "<ul>" +
                                    "<li>📅 <strong>Add to Calendar:</strong> Save the meeting date and time</li>" +
                                    "<li>🔗 <strong>Test the Link:</strong> Click the meeting link 5 minutes early</li>" +
                                    "<li>🌐 <strong>Check Connection:</strong> Ensure stable internet</li>" +
                                    "<li>📹 <strong>Test Equipment:</strong> Verify camera and microphone</li>" +
                                    "<li>📋 <strong>Prepare:</strong> Review your questions and materials</li>" +
                                "</ul>" +
                            "</div>" +
                            "<div style=\"text-align: center; margin: 30px 0;\">" +
                                "<p style=\"font-size: 18px; color: #2c3e50;\">We look forward to an engaging discussion! 🌱</p>" +
                            "</div>" +
                            "<div style=\"border-top: 2px solid #eee; padding-top: 20px; margin-top: 30px;\">" +
                                "<p><strong>Best regards,</strong></p>" +
                                "<p><strong>EcoGreen360 Team</strong><br>" +
                                "<span style=\"color: #666;\">Making the world greener, one meeting at a time 🌍</span></p>" +
                            "</div>" +
                        "</div>" +
                        "<div class=\"footer\">" +
                            "<p>🤖 This is an automated message. Please do not reply to this email.</p>" +
                            "<p><strong>EcoGreen360</strong> | Sustainable Solutions for a Better Tomorrow</p>" +
                        "</div>" +
                    "</div>" +
                "</body>" +
                "</html>";

            email:Message emailMessage = {
                to: [toEmail],
                subject: subject,
                htmlBody: htmlContent,
                'from: adminEmail
            };

            _ = check smtpClient->sendMessage(emailMessage);
            log:printInfo("✅ Approval email sent successfully to: " + toEmail);
            return true;
        } on fail var e {
            log:printError("❌ Failed to send approval email to " + toEmail + ": " + e.message());
            return false;
        }
    }

    // Send rejection email
    private function sendRejectionEmail(string toEmail, string userName, string interest, string reason) returns boolean {
        do {
            string subject = "Meeting Request Update - EcoGreen360";
            
            string reasonSection = "";
            if (reason.trim() != "") {
                reasonSection = "<div class=\"reason-box\">" +
                    "<h3>💬 Additional Information:</h3>" +
                    "<p>" + reason + "</p>" +
                "</div>";
            }

            string htmlContent = "<!DOCTYPE html>" +
                "<html>" +
                "<head>" +
                    "<meta charset=\"UTF-8\">" +
                    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">" +
                    "<title>Meeting Request Update</title>" +
                    "<style>" +
                        "body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }" +
                        ".container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }" +
                        ".header { background: linear-gradient(135deg, #ff6b6b, #ee5a5a); color: white; padding: 30px 20px; text-align: center; }" +
                        ".header h1 { margin: 0; font-size: 26px; font-weight: bold; }" +
                        ".content { padding: 30px; }" +
                        ".greeting { font-size: 18px; color: #2c3e50; margin-bottom: 20px; }" +
                        ".reason-box { background: linear-gradient(135deg, #ffeaa7, #fdcb6e); padding: 20px; border-radius: 8px; border-left: 5px solid #ff6b6b; margin: 25px 0; }" +
                        ".reason-box h3 { margin-top: 0; color: #d63031; font-size: 18px; }" +
                        ".alternatives { background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 5px solid #2196f3; }" +
                        ".alternatives h4 { color: #1976d2; margin-top: 0; }" +
                        ".alternatives ul { padding-left: 20px; }" +
                        ".alternatives li { margin: 8px 0; color: #424242; }" +
                        ".button { display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #007bff, #0056b3); color: white; text-decoration: none; border-radius: 25px; margin: 15px 0; font-weight: bold; transition: transform 0.2s; }" +
                        ".button:hover { transform: translateY(-2px); }" +
                        ".footer { background-color: #f8f9fa; text-align: center; padding: 20px; color: #6c757d; font-size: 14px; }" +
                        ".emoji { font-size: 24px; }" +
                        ".highlight { background-color: #e1f5fe; padding: 15px; border-radius: 5px; border-left: 4px solid #03a9f4; margin: 15px 0; }" +
                    "</style>" +
                "</head>" +
                "<body>" +
                    "<div class=\"container\">" +
                        "<div class=\"header\">" +
                            "<div class=\"emoji\">📧</div>" +
                            "<h1>Meeting Request Update</h1>" +
                        "</div>" +
                        "<div class=\"content\">" +
                            "<div class=\"greeting\">Dear <strong>" + userName + "</strong>,</div>" +
                            "<p>Thank you for your interest in connecting with EcoGreen360. We truly appreciate you taking the time to reach out to us.</p>" +
                            "<div class=\"highlight\">" +
                                "<strong>📝 Your Request:</strong> " + interest +
                            "</div>" +
                            "<p>After careful consideration of your request, we are unable to accommodate a meeting at this time due to current scheduling constraints and priorities.</p>" +
                            reasonSection +
                            "<div class=\"alternatives\">" +
                                "<h4>🌟 Alternative Ways to Connect:</h4>" +
                                "<ul>" +
                                    "<li>📅 <strong>Resubmit Request:</strong> Try submitting a new request for a different time period</li>" +
                                    "<li>🌐 <strong>Website Resources:</strong> Explore our latest updates and resources online</li>" +
                                    "<li>📧 <strong>Direct Contact:</strong> Reach out through our contact form for specific inquiries</li>" +
                                    "<li>📱 <strong>Social Media:</strong> Follow us for the latest news and opportunities</li>" +
                                    "<li>🎯 <strong>Newsletter:</strong> Subscribe to stay informed about upcoming events</li>" +
                                "</ul>" +
                            "</div>" +
                            "<div style=\"text-align: center; margin: 30px 0;\">" +
                                "<a href=\"http://localhost:3000\" class=\"button\">🏠 Visit Our Website</a>" +
                            "</div>" +
                            "<p>We appreciate your understanding and encourage you to stay connected with EcoGreen360. Your interest in sustainable solutions matters to us! 🌱</p>" +
                            "<div style=\"border-top: 2px solid #eee; padding-top: 20px; margin-top: 30px;\">" +
                                "<p><strong>Best regards,</strong></p>" +
                                "<p><strong>EcoGreen360 Team</strong><br>" +
                                "<span style=\"color: #666;\">Making the world greener, one step at a time 🌍</span></p>" +
                            "</div>" +
                        "</div>" +
                        "<div class=\"footer\">" +
                            "<p>🤖 This is an automated message. Please do not reply to this email.</p>" +
                            "<p><strong>EcoGreen360</strong> | Sustainable Solutions for a Better Tomorrow</p>" +
                        "</div>" +
                    "</div>" +
                "</body>" +
                "</html>";

            email:Message emailMessage = {
                to: [toEmail],
                subject: subject,
                htmlBody: htmlContent,
                'from: adminEmail
            };

            _ = check smtpClient->sendMessage(emailMessage);
            log:printInfo("✅ Rejection email sent successfully to: " + toEmail);
            return true;
        } on fail var e {
            log:printError("❌ Failed to send rejection email to " + toEmail + ": " + e.message());
            return false;
        }
    }

    // Delete meeting request (Admin endpoint)
    resource function delete admin/meetings/[string id]() returns json {
        do {
            sql:ExecutionResult result = check dbClient->execute(`
                DELETE FROM meeting_requests WHERE id = ${id}::uuid
            `);

            if (result.affectedRowCount > 0) {
                log:printInfo("Meeting request deleted: " + id);
                return {
                    success: true,
                    message: "Meeting request deleted successfully"
                };
            } else {
                return {
                    success: false,
                    message: "Meeting request not found"
                };
            }
        } on fail var e {
            log:printError("Error deleting meeting request: " + e.message());
            return {
                success: false,
                message: "Internal server error"
            };
        }
    }

    // Get meeting request statistics (Admin endpoint)
    resource function get admin/stats() returns json {
        do {
            record {|int pending;|} pendingCount = check dbClient->queryRow(`
                SELECT COUNT(*) as pending FROM meeting_requests WHERE status = 'pending'
            `);
            
            record {|int approved;|} approvedCount = check dbClient->queryRow(`
                SELECT COUNT(*) as approved FROM meeting_requests WHERE status = 'approved'
            `);
            
            record {|int rejected;|} rejectedCount = check dbClient->queryRow(`
                SELECT COUNT(*) as rejected FROM meeting_requests WHERE status = 'rejected'
            `);
            
            record {|int total;|} totalCount = check dbClient->queryRow(`
                SELECT COUNT(*) as total FROM meeting_requests
            `);

            return {
                success: true,
                message: "Statistics retrieved successfully",
                data: {
                    pending: pendingCount.pending,
                    approved: approvedCount.approved,
                    rejected: rejectedCount.rejected,
                    total: totalCount.total
                }
            };
        } on fail var e {
            log:printError("Error retrieving statistics: " + e.message());
            return {
                success: false,
                message: "Internal server error"
            };
        }
    }

    // Health check endpoint
    resource function get health() returns json {
        return {
            success: true,
            message: "Service is healthy",
            timestamp: time:utcToString(time:utcNow())
        };
    }
}