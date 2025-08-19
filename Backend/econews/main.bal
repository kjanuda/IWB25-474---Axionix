import ballerina/http;
import ballerina/mime;
import ballerina/uuid;
import ballerina/log;
import ballerina/io;
import ballerina/file;
import ballerina/os;
import ballerina/time;
import ballerinax/mysql;
import ballerina/sql;
import ballerina/email;

// Configuration
configurable string host = "localhost";
configurable string port = "3306";
configurable string username = "root";
configurable string password = "J3007426@Januda";
configurable string database = "job_portal_db";
configurable string awsRegion = "eu-north-1";
configurable string bucketName = "jobportal-uploads1";
configurable string uploadDirectory = "./uploads";
configurable int serverPort = 8086;

// Email Configuration
configurable string smtpHost = "smtp.gmail.com";
configurable int smtpPort = 465;
configurable string adminEmail = "ecogreen.newsletter@gmail.com";
configurable string adminPassword = "xewjikxfbjjswpdj";
configurable string companyName = "JobPortal Inc.";
configurable boolean useSSL = true;

// Initialize SMTP client
final email:SmtpClient smtpClient = check new (
    smtpHost,
    adminEmail,
    adminPassword,
    port = smtpPort
);

// MySQL client
mysql:Client mysqlClient = check new (
    host = host,
    port = check int:fromString(port),
    user = username,
    password = password,
    database = database
);

// CORS Configuration
@http:ServiceConfig {
    cors: {
        allowOrigins: ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"],
        allowCredentials: false,
        allowHeaders: ["CORRELATION_ID", "Authorization", "Content-Type"],
        allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"]
    }
}

service / on new http:Listener(serverPort) {
    
    function init() returns error? {
        // Create uploads directory if it doesn't exist
        boolean|file:Error dirExists = file:test(uploadDirectory, file:EXISTS);
        if dirExists is boolean && !dirExists {
            check file:createDir(uploadDirectory);
            log:printInfo("Created uploads directory: " + uploadDirectory);
        }
        
        // Initialize database tables
        error? dbInitResult = initializeDatabase();
        if dbInitResult is error {
            log:printError("Failed to initialize database: " + dbInitResult.message());
            return dbInitResult;
        }
        
        // Test AWS CLI availability
        string awsStatus = testAWSCLI();
        log:printInfo("AWS CLI Status: " + awsStatus);
        
        // Test email configuration
        log:printInfo("Email Configuration:");
        log:printInfo("SMTP Host: " + smtpHost + ":" + smtpPort.toString());
        log:printInfo("Admin Email: " + adminEmail);
        
        log:printInfo("Job Portal Backend initialized on port " + serverPort.toString());
        log:printInfo("Database: " + database + " | S3 Bucket: " + bucketName);
        log:printInfo("MySQL Status: Connected successfully");
    }
    
    // Health check endpoint
    resource function get health() returns json {
        string awsStatus = testAWSCLI();
        
        return {
            "status": "healthy",
            "service": "Job Portal API",
            "timestamp": getMySQLDateTime(),
            "port": serverPort,
            "database": {
                "host": host,
                "database": database,
                "status": "connected"
            },
            "aws": {
                "bucket": bucketName,
                "region": awsRegion,
                "cli_status": awsStatus
            },
            "email": {
                "smtp_host": smtpHost,
                "smtp_port": smtpPort,
                "admin_email": adminEmail
            }
        };
    }

    // Create new job posting
    resource function post jobs(http:Request request) returns json|http:InternalServerError|http:BadRequest {
        log:printInfo("=== NEW JOB POSTING CREATION REQUEST ===");
        
        // Check content type
        string|http:HeaderNotFoundError contentType = request.getContentType();
        if contentType is http:HeaderNotFoundError {
            http:BadRequest badRequestResponse = {
                body: {"error": "Content-Type header is required"}
            };
            return badRequestResponse;
        }

        // Handle multipart form data
        if !contentType.startsWith("multipart/form-data") {
            http:BadRequest badRequestResponse = {
                body: {"error": "Content-Type must be multipart/form-data"}
            };
            return badRequestResponse;
        }

        // Extract multipart data
        mime:Entity[]|http:ClientError bodyParts = request.getBodyParts();
        if bodyParts is http:ClientError {
            http:BadRequest badRequestResponse = {
                body: {"error": "Failed to parse multipart data: " + bodyParts.message()}
            };
            return badRequestResponse;
        }

        // Parse form data
        string positionName = "";
        string companyName = "";
        string roleOverview = "";
        string keyResponsibilities = "";
        string requiredQualifications = "";
        string location = "";
        string employmentType = "full-time";
        string salaryRange = "";
        byte[]? companyLogoBytes = ();
        string? logoContentType = ();
        
        foreach mime:Entity part in bodyParts {
            mime:ContentDisposition|mime:HeaderUnavailableError cd = part.getContentDisposition();
            if cd is mime:ContentDisposition {
                string fieldName = cd.name;
                
                match fieldName {
                    "positionName" => {
                        string|mime:Error data = part.getText();
                        if data is string {
                            positionName = data;
                        }
                    }
                    "companyName" => {
                        string|mime:Error data = part.getText();
                        if data is string {
                            companyName = data;
                        }
                    }
                    "roleOverview" => {
                        string|mime:Error data = part.getText();
                        if data is string {
                            roleOverview = data;
                        }
                    }
                    "keyResponsibilities" => {
                        string|mime:Error data = part.getText();
                        if data is string {
                            keyResponsibilities = data;
                        }
                    }
                    "requiredQualifications" => {
                        string|mime:Error data = part.getText();
                        if data is string {
                            requiredQualifications = data;
                        }
                    }
                    "location" => {
                        string|mime:Error data = part.getText();
                        if data is string {
                            location = data;
                        }
                    }
                    "employmentType" => {
                        string|mime:Error data = part.getText();
                        if data is string {
                            employmentType = data;
                        }
                    }
                    "salaryRange" => {
                        string|mime:Error data = part.getText();
                        if data is string {
                            salaryRange = data;
                        }
                    }
                    "companyLogo" => {
                        byte[]|mime:Error logoData = part.getByteArray();
                        if logoData is byte[] {
                            companyLogoBytes = logoData;
                            string|mime:HeaderUnavailableError logoType = part.getContentType();
                            if logoType is string {
                                logoContentType = logoType;
                            }
                            log:printInfo("Company logo received: " + logoData.length().toString() + " bytes");
                        }
                    }
                }
            }
        }

        // Validate required fields
        if positionName.trim() == "" || companyName.trim() == "" || roleOverview.trim() == "" {
            http:BadRequest badRequestResponse = {
                body: {"error": "Position name, company name, and role overview are required fields"}
            };
            return badRequestResponse;
        }

        // Handle company logo upload to S3 if present
        string? logoUrl = ();
        string? logoS3Key = ();
        
        if companyLogoBytes is byte[] {
            [string, string]|error logoResult = saveFileToS3(companyLogoBytes, logoContentType ?: "image/jpeg", "company-logos");
            if logoResult is [string, string] {
                [logoUrl, logoS3Key] = logoResult;
                log:printInfo("✅ Company logo uploaded to S3: " + (logoUrl ?: ""));
            } else {
                log:printError("❌ Failed to upload company logo to S3: " + logoResult.message());
                http:InternalServerError errorResponse = {
                    body: {"error": "Failed to upload company logo: " + logoResult.message()}
                };
                return errorResponse;
            }
        }

        // Insert job posting into database
        string jobId = uuid:createType1AsString();
        string currentTime = getMySQLDateTime();
        
        sql:ExecutionResult|sql:Error insertResult = mysqlClient->execute(`
            INSERT INTO job_postings (id, position_name, company_name, role_overview, key_responsibilities, 
                                     required_qualifications, location, employment_type, salary_range, 
                                     company_logo_url, company_logo_s3_key, created_at, updated_at, status)
            VALUES (${jobId}, ${positionName}, ${companyName}, ${roleOverview}, ${keyResponsibilities}, 
                    ${requiredQualifications}, ${location}, ${employmentType}, ${salaryRange}, 
                    ${logoUrl}, ${logoS3Key}, ${currentTime}, ${currentTime}, 'active')
        `);

        if insertResult is sql:Error {
            log:printError("Failed to insert job posting: " + insertResult.message());
            http:InternalServerError errorResponse = {
                body: {"error": "Failed to save job posting: " + insertResult.message()}
            };
            return errorResponse;
        }

        log:printInfo("✅ Job posting created successfully with ID: " + jobId);

        json response = {
            "success": true,
            "jobId": jobId,
            "positionName": positionName,
            "companyName": companyName,
            "location": location,
            "logoUrl": logoUrl,
            "createdAt": currentTime,
            "message": "Job posting created successfully"
        };
        return response;
    }

    // Get all job postings with pagination
    resource function get jobs(string? page, string? pageLimit, string? location, string? employmentType) returns json|http:InternalServerError {
        int pageNum = 1;
        int limitNum = 10;
        
        if page is string {
            int|error pageResult = int:fromString(page);
            if pageResult is int {
                pageNum = pageResult;
            }
        }
        
        if pageLimit is string {
            int|error limitResult = int:fromString(pageLimit);
            if limitResult is int {
                limitNum = limitResult;
            }
        }
        
        int offset = (pageNum - 1) * limitNum;

        // Build dynamic query based on filters
        sql:ParameterizedQuery countQuery;
        sql:ParameterizedQuery jobQuery;
        
        if location is string && location.trim() != "" && employmentType is string && employmentType.trim() != "" {
            countQuery = `SELECT COUNT(*) as total FROM job_postings WHERE status = 'active' AND location LIKE ${"%" + location + "%"} AND employment_type = ${employmentType}`;
            jobQuery = `SELECT * FROM job_postings WHERE status = 'active' AND location LIKE ${"%" + location + "%"} AND employment_type = ${employmentType} ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offset}`;
        } else if location is string && location.trim() != "" {
            countQuery = `SELECT COUNT(*) as total FROM job_postings WHERE status = 'active' AND location LIKE ${"%" + location + "%"}`;
            jobQuery = `SELECT * FROM job_postings WHERE status = 'active' AND location LIKE ${"%" + location + "%"} ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offset}`;
        } else if employmentType is string && employmentType.trim() != "" {
            countQuery = `SELECT COUNT(*) as total FROM job_postings WHERE status = 'active' AND employment_type = ${employmentType}`;
            jobQuery = `SELECT * FROM job_postings WHERE status = 'active' AND employment_type = ${employmentType} ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offset}`;
        } else {
            countQuery = `SELECT COUNT(*) as total FROM job_postings WHERE status = 'active'`;
            jobQuery = `SELECT * FROM job_postings WHERE status = 'active' ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offset}`;
        }

        // Get total count
        stream<record {int total;}, sql:Error?> countResult = mysqlClient->query(countQuery);
        
        int totalJobs = 0;
        error? countError = countResult.forEach(function(record {int total;} row) {
            totalJobs = row.total;
        });
        
        if countError is error {
            http:InternalServerError errorResponse = {
                body: {"error": "Failed to count job postings: " + countError.message()}
            };
            return errorResponse;
        }

        // Get job postings
        stream<JobPosting, sql:Error?> jobStream = mysqlClient->query(jobQuery);

        JobPosting[] jobs = [];
        error? collectError = jobStream.forEach(function(JobPosting job) {
            jobs.push(job);
        });

        if collectError is error {
            http:InternalServerError errorResponse = {
                body: {"error": "Failed to fetch job postings: " + collectError.message()}
            };
            return errorResponse;
        }

        int totalPages = (totalJobs + limitNum - 1) / limitNum;

        json response = {
            "success": true,
            "jobs": jobs.toJson(),
            "pagination": {
                "currentPage": pageNum,
                "totalPages": totalPages,
                "totalJobs": totalJobs,
                "pageLimit": limitNum,
                "hasNext": pageNum < totalPages,
                "hasPrev": pageNum > 1
            }
        };
        return response;
    }

    // Get single job posting by ID
    resource function get jobs/[string jobId]() returns json|http:NotFound|http:InternalServerError {
        stream<JobPosting, sql:Error?> jobStream = mysqlClient->query(`
            SELECT * FROM job_postings WHERE id = ${jobId} AND status = 'active'
        `);

        JobPosting? job = ();
        error? collectError = jobStream.forEach(function(JobPosting j) {
            job = j;
        });

        if collectError is error {
            http:InternalServerError errorResponse = {
                body: {"error": "Failed to fetch job posting: " + collectError.message()}
            };
            return errorResponse;
        }

        if job is () {
            http:NotFound notFoundResponse = {
                body: {"error": "Job posting not found"}
            };
            return notFoundResponse;
        }

        // Increment view count
        sql:ExecutionResult|sql:Error updateResult = mysqlClient->execute(`
            UPDATE job_postings SET views = views + 1 WHERE id = ${jobId}
        `);

        if updateResult is sql:Error {
            log:printWarn("Failed to update view count: " + updateResult.message());
        }

        json response = {
            "success": true,
            "job": job.toJson()
        };
        return response;
    }

    // Apply for a job - MODIFIED TO INCLUDE CONFIRMATION EMAIL
    resource function post jobs/[string jobId]/apply(http:Request request) returns json|http:InternalServerError|http:BadRequest|http:NotFound {
        log:printInfo("=== NEW JOB APPLICATION REQUEST ===");
        log:printInfo("Job ID: " + jobId);
        
        // Check if job exists and is active and get job details
        stream<JobPosting, sql:Error?> jobCheck = mysqlClient->query(`
            SELECT * FROM job_postings WHERE id = ${jobId} AND status = 'active'
        `);

        JobPosting? jobDetails = ();
        error? checkError = jobCheck.forEach(function(JobPosting job) {
            jobDetails = job;
        });

        if checkError is error {
            http:InternalServerError errorResponse = {
                body: {"error": "Failed to verify job posting: " + checkError.message()}
            };
            return errorResponse;
        }

        if jobDetails is () {
            http:NotFound notFoundResponse = {
                body: {"error": "Job posting not found or inactive"}
            };
            return notFoundResponse;
        }

        // Now we know jobDetails is not null
        JobPosting job = <JobPosting>jobDetails;

        // Check content type
        string|http:HeaderNotFoundError contentType = request.getContentType();
        if contentType is http:HeaderNotFoundError {
            http:BadRequest badRequestResponse = {
                body: {"error": "Content-Type header is required"}
            };
            return badRequestResponse;
        }

        // Handle multipart form data
        if !contentType.startsWith("multipart/form-data") {
            http:BadRequest badRequestResponse = {
                body: {"error": "Content-Type must be multipart/form-data"}
            };
            return badRequestResponse;
        }

        // Extract multipart data
        mime:Entity[]|http:ClientError bodyParts = request.getBodyParts();
        if bodyParts is http:ClientError {
            http:BadRequest badRequestResponse = {
                body: {"error": "Failed to parse multipart data: " + bodyParts.message()}
            };
            return badRequestResponse;
        }

        // Parse form data
        string firstName = "";
        string lastName = "";
        string email = "";
        string phoneNumber = "";
        byte[]? resumeBytes = ();
        string? resumeContentType = ();
        string? originalFileName = ();
        
        foreach mime:Entity part in bodyParts {
            mime:ContentDisposition|mime:HeaderUnavailableError cd = part.getContentDisposition();
            if cd is mime:ContentDisposition {
                string fieldName = cd.name;
                
                match fieldName {
                    "firstName" => {
                        string|mime:Error data = part.getText();
                        if data is string {
                            firstName = data;
                        }
                    }
                    "lastName" => {
                        string|mime:Error data = part.getText();
                        if data is string {
                            lastName = data;
                        }
                    }
                    "email" => {
                        string|mime:Error data = part.getText();
                        if data is string {
                            email = data;
                        }
                    }
                    "phoneNumber" => {
                        string|mime:Error data = part.getText();
                        if data is string {
                            phoneNumber = data;
                        }
                    }
                    "resume" => {
                        byte[]|mime:Error resumeData = part.getByteArray();
                        if resumeData is byte[] {
                            resumeBytes = resumeData;
                            string|mime:HeaderUnavailableError resumeType = part.getContentType();
                            if resumeType is string {
                                resumeContentType = resumeType;
                            }
                            // Get original filename if available
                            if cd.fileName is string {
                                originalFileName = cd.fileName;
                            }
                            log:printInfo("Resume received: " + resumeData.length().toString() + " bytes");
                        }
                    }
                }
            }
        }

        // Validate required fields
        if firstName.trim() == "" || lastName.trim() == "" || email.trim() == "" || phoneNumber.trim() == "" {
            http:BadRequest badRequestResponse = {
                body: {"error": "First name, last name, email, and phone number are required fields"}
            };
            return badRequestResponse;
        }

        if resumeBytes is () {
            http:BadRequest badRequestResponse = {
                body: {"error": "Resume/CV is required"}
            };
            return badRequestResponse;
        }

        // Validate email format (basic validation)
        if !email.includes("@") || email.trim().length() < 5 {
            http:BadRequest badRequestResponse = {
                body: {"error": "Please provide a valid email address"}
            };
            return badRequestResponse;
        }

        // Handle resume upload to S3
        string? resumeUrl = ();
        string? resumeS3Key = ();
        
        [string, string]|error resumeResult = saveFileToS3(<byte[]>resumeBytes, resumeContentType ?: "application/pdf", "resumes");
        if resumeResult is [string, string] {
            [resumeUrl, resumeS3Key] = resumeResult;
            log:printInfo("✅ Resume uploaded to S3: " + (resumeUrl ?: ""));
        } else {
            log:printError("❌ Failed to upload resume to S3: " + resumeResult.message());
            http:InternalServerError errorResponse = {
                body: {"error": "Failed to upload resume: " + resumeResult.message()}
            };
            return errorResponse;
        }

        // Check for duplicate applications
        stream<JobApplication, sql:Error?> duplicateCheck = mysqlClient->query(`
            SELECT id FROM job_applications WHERE job_id = ${jobId} AND email = ${email}
        `);

        boolean alreadyApplied = false;
        error? dupError = duplicateCheck.forEach(function(JobApplication app) {
            alreadyApplied = true;
        });

        if dupError is error {
            log:printWarn("Failed to check for duplicate applications: " + dupError.message());
        }

        if alreadyApplied {
            http:BadRequest badRequestResponse = {
                body: {"error": "You have already applied for this position"}
            };
            return badRequestResponse;
        }

        // Insert job application into database
        string applicationId = uuid:createType1AsString();
        string currentTime = getMySQLDateTime();
        
        sql:ExecutionResult|sql:Error insertResult = mysqlClient->execute(`
            INSERT INTO job_applications (id, job_id, first_name, last_name, email, phone_number, 
                                         resume_url, resume_s3_key, original_filename, applied_at, status)
            VALUES (${applicationId}, ${jobId}, ${firstName}, ${lastName}, ${email}, ${phoneNumber}, 
                    ${resumeUrl}, ${resumeS3Key}, ${originalFileName}, ${currentTime}, 'submitted')
        `);

        if insertResult is sql:Error {
            log:printError("Failed to insert job application: " + insertResult.message());
            http:InternalServerError errorResponse = {
                body: {"error": "Failed to save job application: " + insertResult.message()}
            };
            return errorResponse;
        }

        log:printInfo("✅ Job application submitted successfully with ID: " + applicationId);

        // ✨ NEW: Send confirmation email to the applicant
        string applicantName = firstName + " " + lastName;
        error? confirmationEmailResult = sendApplicationConfirmationEmail(
            email,
            applicantName,
            job.position_name,
            job.company_name,
            applicationId,
            currentTime
        );
        
        boolean emailSent = false;
        if confirmationEmailResult is error {
            log:printWarn("Failed to send confirmation email: " + confirmationEmailResult.message());
            // Don't fail the application if email fails
        } else {
            log:printInfo("✅ Confirmation email sent to: " + email);
            emailSent = true;
        }

        json response = {
            "success": true,
            "applicationId": applicationId,
            "jobId": jobId,
            "applicantName": applicantName,
            "email": email,
            "resumeUrl": resumeUrl,
            "appliedAt": currentTime,
            "emailSent": emailSent,
            "message": "Job application submitted successfully" + (emailSent ? " and confirmation email sent!" : "")
        };
        return response;
    }

    // ✨ NEW: Schedule a call for a job
    resource function post jobs/[string jobId]/schedule\-call(http:Request request) returns json|http:InternalServerError|http:BadRequest|http:NotFound {
        log:printInfo("=== NEW SCHEDULE CALL REQUEST ===");
        log:printInfo("Job ID: " + jobId);
        
        // Check if job exists and is active
        stream<JobPosting, sql:Error?> jobCheck = mysqlClient->query(`
            SELECT * FROM job_postings WHERE id = ${jobId} AND status = 'active'
        `);

        JobPosting? jobDetails = ();
        error? checkError = jobCheck.forEach(function(JobPosting job) {
            jobDetails = job;
        });

        if checkError is error {
            http:InternalServerError errorResponse = {
                body: {"error": "Failed to verify job posting: " + checkError.message()}
            };
            return errorResponse;
        }

        if jobDetails is () {
            http:NotFound notFoundResponse = {
                body: {"error": "Job posting not found or inactive"}
            };
            return notFoundResponse;
        }

        JobPosting job = <JobPosting>jobDetails;

        // Parse JSON payload
        json|error payload = request.getJsonPayload();
        if payload is error {
            http:BadRequest badRequestResponse = {
                body: {"error": "Invalid JSON payload"}
            };
            return badRequestResponse;
        }

        // Extract required fields
        json|error nameJson = payload.name;
        json|error emailJson = payload.email;
        json|error jobTitleJson = payload.jobTitle;
        json|error industryJson = payload.industry;

        if !(nameJson is string) || !(emailJson is string) || !(jobTitleJson is string) || !(industryJson is string) {
            http:BadRequest badRequestResponse = {
                body: {"error": "Name, email, job title, and industry are required fields"}
            };
            return badRequestResponse;
        }

        string name = nameJson is string ? nameJson : "";
        string email = emailJson is string ? emailJson : "";
        string jobTitle = jobTitleJson is string ? jobTitleJson : "";
        string industry = industryJson is string ? industryJson : "";

        // Extract optional fields
        json|error preferredTimeJson = payload.preferredTime;
        json|error phoneNumberJson = payload.phoneNumber;
        json|error messageJson = payload.message;
        
        string? preferredTime = preferredTimeJson is string ? preferredTimeJson : ();
        string? phoneNumber = phoneNumberJson is string ? phoneNumberJson : ();
        string? message = messageJson is string ? messageJson : ();

        // Validate required fields
        if name.trim() == "" || email.trim() == "" || jobTitle.trim() == "" || industry.trim() == "" {
            http:BadRequest badRequestResponse = {
                body: {"error": "Name, email, job title, and industry cannot be empty"}
            };
            return badRequestResponse;
        }

        // Basic email validation
        if !email.includes("@") || email.trim().length() < 5 {
            http:BadRequest badRequestResponse = {
                body: {"error": "Please provide a valid email address"}
            };
            return badRequestResponse;
        }

        // Check for duplicate schedule call requests
        stream<ScheduleCallRequest, sql:Error?> duplicateCheck = mysqlClient->query(`
            SELECT id FROM schedule_call_requests WHERE job_id = ${jobId} AND email = ${email} AND status = 'pending'
        `);

        boolean alreadyRequested = false;
        error? dupError = duplicateCheck.forEach(function(ScheduleCallRequest req) {
            alreadyRequested = true;
        });

        if dupError is error {
            log:printWarn("Failed to check for duplicate schedule call requests: " + dupError.message());
        }

        if alreadyRequested {
            http:BadRequest badRequestResponse = {
                body: {"error": "You already have a pending call request for this position"}
            };
            return badRequestResponse;
        }

        // Insert schedule call request into database
        string requestId = uuid:createType1AsString();
        string currentTime = getMySQLDateTime();
        
        sql:ExecutionResult|sql:Error insertResult = mysqlClient->execute(`
            INSERT INTO schedule_call_requests (id, job_id, name, email, job_title, industry, 
                                              preferred_time, phone_number, message, requested_at, status)
            VALUES (${requestId}, ${jobId}, ${name}, ${email}, ${jobTitle}, ${industry}, 
                    ${preferredTime}, ${phoneNumber}, ${message}, ${currentTime}, 'pending')
        `);

        if insertResult is sql:Error {
            log:printError("Failed to insert schedule call request: " + insertResult.message());
            http:InternalServerError errorResponse = {
                body: {"error": "Failed to save schedule call request: " + insertResult.message()}
            };
            return errorResponse;
        }

        log:printInfo("✅ Schedule call request created successfully with ID: " + requestId);

        // Send confirmation email to user
        error? userEmailResult = sendScheduleCallConfirmationEmail(
            email,
            name,
            job.position_name,
            job.company_name,
            requestId,
            currentTime,
            preferredTime
        );
        
        boolean userEmailSent = false;
        if userEmailResult is error {
            log:printWarn("Failed to send user confirmation email: " + userEmailResult.message());
        } else {
            log:printInfo("✅ Confirmation email sent to user: " + email);
            userEmailSent = true;
        }

        // Send alert email to admin
        error? adminEmailResult = sendScheduleCallAdminAlert(
            name,
            email,
            jobTitle,
            industry,
            job.position_name,
            job.company_name,
            requestId,
            currentTime,
            preferredTime,
            phoneNumber,
            message
        );
        
        boolean adminEmailSent = false;
        if adminEmailResult is error {
            log:printWarn("Failed to send admin alert email: " + adminEmailResult.message());
        } else {
            log:printInfo("✅ Admin alert email sent");
            adminEmailSent = true;
        }

        json response = {
            "success": true,
            "requestId": requestId,
            "jobId": jobId,
            "name": name,
            "email": email,
            "jobTitle": jobTitle,
            "industry": industry,
            "requestedAt": currentTime,
            "userEmailSent": userEmailSent,
            "adminEmailSent": adminEmailSent,
            "message": "Schedule call request submitted successfully" + 
                      (userEmailSent ? " and confirmation email sent!" : "")
        };
        return response;
    }

    // ✨ NEW: Get schedule call requests for a job (for admin)
    resource function get jobs/[string jobId]/schedule\-calls(string? page, string? pageLimit) returns json|http:InternalServerError|http:NotFound {
        // Check if job exists
        stream<JobPosting, sql:Error?> jobCheck = mysqlClient->query(`
            SELECT id FROM job_postings WHERE id = ${jobId}
        `);

        boolean jobExists = false;
        error? checkError = jobCheck.forEach(function(JobPosting job) {
            jobExists = true;
        });

        if checkError is error {
            http:InternalServerError errorResponse = {
                body: {"error": "Failed to verify job posting: " + checkError.message()}
            };
            return errorResponse;
        }

        if !jobExists {
            http:NotFound notFoundResponse = {
                body: {"error": "Job posting not found"}
            };
            return notFoundResponse;
        }

        int pageNum = 1;
        int limitNum = 10;
        
        if page is string {
            int|error pageResult = int:fromString(page);
            if pageResult is int {
                pageNum = pageResult;
            }
        }
        
        if pageLimit is string {
            int|error limitResult = int:fromString(pageLimit);
            if limitResult is int {
                limitNum = limitResult;
            }
        }
        
        int offset = (pageNum - 1) * limitNum;

        // Get total count
        stream<record {int total;}, sql:Error?> countResult = mysqlClient->query(`
            SELECT COUNT(*) as total FROM schedule_call_requests WHERE job_id = ${jobId}
        `);
        
        int totalRequests = 0;
        error? countError = countResult.forEach(function(record {int total;} row) {
            totalRequests = row.total;
        });
        
        if countError is error {
            http:InternalServerError errorResponse = {
                body: {"error": "Failed to count schedule call requests: " + countError.message()}
            };
            return errorResponse;
        }

        // Get schedule call requests
        stream<ScheduleCallRequest, sql:Error?> requestStream = mysqlClient->query(`
            SELECT * FROM schedule_call_requests WHERE job_id = ${jobId} ORDER BY requested_at DESC LIMIT ${limitNum} OFFSET ${offset}
        `);

        ScheduleCallRequest[] requests = [];
        error? collectError = requestStream.forEach(function(ScheduleCallRequest req) {
            requests.push(req);
        });

        if collectError is error {
            http:InternalServerError errorResponse = {
                body: {"error": "Failed to fetch schedule call requests: " + collectError.message()}
            };
            return errorResponse;
        }

        int totalPages = (totalRequests + limitNum - 1) / limitNum;

        json response = {
            "success": true,
            "jobId": jobId,
            "scheduleCallRequests": requests.toJson(),
            "pagination": {
                "currentPage": pageNum,
                "totalPages": totalPages,
                "totalRequests": totalRequests,
                "pageLimit": limitNum,
                "hasNext": pageNum < totalPages,
                "hasPrev": pageNum > 1
            }
        };
        return response;
    }

    // ✨ NEW: Update schedule call request status
    resource function put schedule\-calls/[string requestId]/status(http:Request request) returns json|http:NotFound|http:InternalServerError|http:BadRequest {
        json|error payload = request.getJsonPayload();
        if payload is error {
            http:BadRequest badRequestResponse = {
                body: {"error": "Invalid JSON payload"}
            };
            return badRequestResponse;
        }

        json|error statusJson = payload.status;
        if !(statusJson is json && statusJson is string) {
            http:BadRequest badRequestResponse = {
                body: {"error": "Status field is required"}
            };
            return badRequestResponse;
        }

        string status = statusJson is string ? statusJson : "";
        if status != "pending" && status != "scheduled" && status != "completed" && status != "cancelled" {
            http:BadRequest badRequestResponse = {
                body: {"error": "Invalid status. Must be 'pending', 'scheduled', 'completed', or 'cancelled'"}
            };
            return badRequestResponse;
        }

        // Check if request exists
        stream<ScheduleCallRequest, sql:Error?> existingRequest = mysqlClient->query(`
            SELECT id FROM schedule_call_requests WHERE id = ${requestId}
        `);

        boolean requestExists = false;
        error? checkError = existingRequest.forEach(function(ScheduleCallRequest req) {
            requestExists = true;
        });

        if checkError is error {
            http:InternalServerError errorResponse = {
                body: {"error": "Failed to check request existence: " + checkError.message()}
            };
            return errorResponse;
        }

        if !requestExists {
            http:NotFound notFoundResponse = {
                body: {"error": "Schedule call request not found"}
            };
            return notFoundResponse;
        }

        sql:ExecutionResult|sql:Error updateResult = mysqlClient->execute(`
            UPDATE schedule_call_requests SET status = ${status} WHERE id = ${requestId}
        `);

        if updateResult is sql:Error {
            http:InternalServerError errorResponse = {
                body: {"error": "Failed to update request status: " + updateResult.message()}
            };
            return errorResponse;
        }

        return {
            "success": true,
            "requestId": requestId,
            "status": status,
            "message": "Schedule call request status updated successfully"
        };
    }

    // Get applications for a job (for employers)
    resource function get jobs/[string jobId]/applications(string? page, string? pageLimit) returns json|http:InternalServerError|http:NotFound {
        // Check if job exists
        stream<JobPosting, sql:Error?> jobCheck = mysqlClient->query(`
            SELECT id FROM job_postings WHERE id = ${jobId}
        `);

        boolean jobExists = false;
        error? checkError = jobCheck.forEach(function(JobPosting job) {
            jobExists = true;
        });

        if checkError is error {
            http:InternalServerError errorResponse = {
                body: {"error": "Failed to verify job posting: " + checkError.message()}
            };
            return errorResponse;
        }

        if !jobExists {
            http:NotFound notFoundResponse = {
                body: {"error": "Job posting not found"}
            };
            return notFoundResponse;
        }

        int pageNum = 1;
        int limitNum = 10;
        
        if page is string {
            int|error pageResult = int:fromString(page);
            if pageResult is int {
                pageNum = pageResult;
            }
        }
        
        if pageLimit is string {
            int|error limitResult = int:fromString(pageLimit);
            if limitResult is int {
                limitNum = limitResult;
            }
        }
        
        int offset = (pageNum - 1) * limitNum;

        // Get total count
        stream<record {int total;}, sql:Error?> countResult = mysqlClient->query(`
            SELECT COUNT(*) as total FROM job_applications WHERE job_id = ${jobId}
        `);
        
        int totalApplications = 0;
        error? countError = countResult.forEach(function(record {int total;} row) {
            totalApplications = row.total;
        });
        
        if countError is error {
            http:InternalServerError errorResponse = {
                body: {"error": "Failed to count applications: " + countError.message()}
            };
            return errorResponse;
        }

        // Get applications
        stream<JobApplication, sql:Error?> appStream = mysqlClient->query(`
            SELECT * FROM job_applications WHERE job_id = ${jobId} ORDER BY applied_at DESC LIMIT ${limitNum} OFFSET ${offset}
        `);

        JobApplication[] applications = [];
        error? collectError = appStream.forEach(function(JobApplication app) {
            applications.push(app);
        });

        if collectError is error {
            http:InternalServerError errorResponse = {
                body: {"error": "Failed to fetch applications: " + collectError.message()}
            };
            return errorResponse;
        }

        int totalPages = (totalApplications + limitNum - 1) / limitNum;

        json response = {
            "success": true,
            "jobId": jobId,
            "applications": applications.toJson(),
            "pagination": {
                "currentPage": pageNum,
                "totalPages": totalPages,
                "totalApplications": totalApplications,
                "pageLimit": limitNum,
                "hasNext": pageNum < totalPages,
                "hasPrev": pageNum > 1
            }
        };
        return response;
    }

    // Search jobs
    resource function get search(string? q, string? location, string? employmentType) returns json|http:InternalServerError {
        if q is () || q.trim() == "" {
            return {"success": true, "jobs": [], "message": "Please provide search query"};
        }

        sql:ParameterizedQuery searchQuery;
        string searchTerm = "%" + q + "%";
        
        if location is string && location.trim() != "" && employmentType is string && employmentType.trim() != "" {
            searchQuery = `SELECT * FROM job_postings WHERE status = 'active' AND location LIKE ${"%" + location + "%"} AND employment_type = ${employmentType} AND (position_name LIKE ${searchTerm} OR company_name LIKE ${searchTerm} OR role_overview LIKE ${searchTerm}) ORDER BY created_at DESC LIMIT 20`;
        } else if location is string && location.trim() != "" {
            searchQuery = `SELECT * FROM job_postings WHERE status = 'active' AND location LIKE ${"%" + location + "%"} AND (position_name LIKE ${searchTerm} OR company_name LIKE ${searchTerm} OR role_overview LIKE ${searchTerm}) ORDER BY created_at DESC LIMIT 20`;
        } else if employmentType is string && employmentType.trim() != "" {
            searchQuery = `SELECT * FROM job_postings WHERE status = 'active' AND employment_type = ${employmentType} AND (position_name LIKE ${searchTerm} OR company_name LIKE ${searchTerm} OR role_overview LIKE ${searchTerm}) ORDER BY created_at DESC LIMIT 20`;
        } else {
            searchQuery = `SELECT * FROM job_postings WHERE status = 'active' AND (position_name LIKE ${searchTerm} OR company_name LIKE ${searchTerm} OR role_overview LIKE ${searchTerm}) ORDER BY created_at DESC LIMIT 20`;
        }

        stream<JobPosting, sql:Error?> jobStream = mysqlClient->query(searchQuery);

        JobPosting[] jobs = [];
        error? collectError = jobStream.forEach(function(JobPosting job) {
            jobs.push(job);
        });

        if collectError is error {
            http:InternalServerError errorResponse = {
                body: {"error": "Failed to search job postings: " + collectError.message()}
            };
            return errorResponse;
        }

        json response = {
            "success": true,
            "jobs": jobs.toJson(),
            "searchQuery": q,
            "resultsCount": jobs.length()
        };
        return response;
    }

    // Serve files from S3 (redirect)
    resource function get files/[string folder]/[string fileName]() returns http:Response {
        string s3Url = string `https://${bucketName}.s3.${awsRegion}.amazonaws.com/${folder}/${fileName}`;
        
        http:Response response = new;
        response.statusCode = 302;
        response.setHeader("Location", s3Url);
        response.setHeader("Cache-Control", "public, max-age=3600");
        
        return response;
    }

    // Update application status
    resource function put applications/[string applicationId]/status(http:Request request) returns json|http:NotFound|http:InternalServerError|http:BadRequest {
        json|error payload = request.getJsonPayload();
        if payload is error {
            http:BadRequest badRequestResponse = {
                body: {"error": "Invalid JSON payload"}
            };
            return badRequestResponse;
        }

        json|error statusJson = payload.status;
        if !(statusJson is json && statusJson is string) {
            http:BadRequest badRequestResponse = {
                body: {"error": "Status field is required"}
            };
            return badRequestResponse;
        }

        string status = statusJson is string ? statusJson : "";
        if status != "submitted" && status != "reviewed" && status != "shortlisted" && status != "rejected" && status != "hired" {
            http:BadRequest badRequestResponse = {
                body: {"error": "Invalid status. Must be 'submitted', 'reviewed', 'shortlisted', 'rejected', or 'hired'"}
            };
            return badRequestResponse;
        }

        // Get application and job details for email
        stream<ApplicationRecord, sql:Error?> appStream = mysqlClient->query(`
            SELECT id, job_id, first_name, last_name, email, status FROM job_applications WHERE id = ${applicationId}
        `);

        ApplicationRecord? application = ();

        error? appError = appStream.forEach(function(ApplicationRecord app) {
            application = app;
        });

        if appError is error {
            http:InternalServerError errorResponse = {
                body: {"error": "Failed to fetch application: " + appError.message()}
            };
            return errorResponse;
        }

        if application is () {
            http:NotFound notFoundResponse = {
                body: {"error": "Application not found"}
            };
            return notFoundResponse;
        }

        // Now we know application is not null, so we can safely access its fields
        ApplicationRecord app = <ApplicationRecord>application;

        // Get job details
        stream<record {
            string position_name;
            string company_name;
        }, sql:Error?> jobStream = mysqlClient->query(`
            SELECT position_name, company_name FROM job_postings WHERE id = ${app.job_id}
        `);

        record {
            string position_name;
            string company_name;
        }? jobDetails = ();

        error? jobError = jobStream.forEach(function(record {
            string position_name;
            string company_name;
        } job) {
            jobDetails = job;
        });

        if jobError is error {
            log:printWarn("Failed to fetch job details for email: " + jobError.message());
        }

        // Update application status
        sql:ExecutionResult|sql:Error updateResult = mysqlClient->execute(`
            UPDATE job_applications SET status = ${status} WHERE id = ${applicationId}
        `);

        if updateResult is sql:Error {
            http:InternalServerError errorResponse = {
                body: {"error": "Failed to update application status: " + updateResult.message()}
            };
            return errorResponse;
        }

        // Send email notification if status changed
        boolean emailSent = false;
        if app.status != status {
            string applicantName = app.first_name + " " + app.last_name;
            string positionName = jobDetails?.position_name ?: "Position";
            string companyNameForEmail = jobDetails?.company_name ?: "Company";
            
            error? emailResult = sendStatusUpdateEmail(
                app.email,
                applicantName,
                positionName,
                companyNameForEmail,
                status
            );
            
            if emailResult is error {
                log:printWarn("Failed to send email notification: " + emailResult.message());
            } else {
                log:printInfo("✅ Status update email sent to: " + app.email);
                emailSent = true;
            }
        }

        return {
            "success": true,
            "applicationId": applicationId,
            "status": status,
            "emailSent": emailSent,
            "message": "Application status updated successfully"
        };
    }
    
    resource function put jobs/[string jobId]/status(http:Request request) returns json|http:NotFound|http:InternalServerError|http:BadRequest {
        json|error payload = request.getJsonPayload();
        if payload is error {
            http:BadRequest badRequestResponse = {
                body: {"error": "Invalid JSON payload"}
            };
            return badRequestResponse;
        }

        json|error statusJson = payload.status;
        if !(statusJson is json && statusJson is string) {
            http:BadRequest badRequestResponse = {
                body: {"error": "Status field is required"}
            };
            return badRequestResponse;
        }

        string status = statusJson is string ? statusJson : "";
        if status != "active" && status != "closed" && status != "draft" {
            http:BadRequest badRequestResponse = {
                body: {"error": "Invalid status. Must be 'active', 'closed', or 'draft'"}
            };
            return badRequestResponse;
        }

        // Check if job exists
        stream<JobPosting, sql:Error?> existingJob = mysqlClient->query(`
            SELECT id FROM job_postings WHERE id = ${jobId}
        `);

        boolean jobExists = false;
        error? checkError = existingJob.forEach(function(JobPosting job) {
            jobExists = true;
        });

        if checkError is error {
            http:InternalServerError errorResponse = {
                body: {"error": "Failed to check job existence: " + checkError.message()}
            };
            return errorResponse;
        }

        if !jobExists {
            http:NotFound notFoundResponse = {
                body: {"error": "Job posting not found"}
            };
            return notFoundResponse;
        }

        string currentTime = getMySQLDateTime();

        sql:ExecutionResult|sql:Error updateResult = mysqlClient->execute(`
            UPDATE job_postings SET status = ${status}, updated_at = ${currentTime} WHERE id = ${jobId}
        `);

        if updateResult is sql:Error {
            http:InternalServerError errorResponse = {
                body: {"error": "Failed to update job status: " + updateResult.message()}
            };
            return errorResponse;
        }

        return {
            "success": true,
            "jobId": jobId,
            "status": status,
            "updatedAt": currentTime,
            "message": "Job status updated successfully"
        };
    }

    // Test email endpoint
    resource function post test/email(http:Request request) returns json|http:BadRequest|http:InternalServerError {
        json|error payload = request.getJsonPayload();
        if payload is error {
            http:BadRequest badRequestResponse = {
                body: {"error": "Invalid JSON payload"}
            };
            return badRequestResponse;
        }

        json|error emailJson = payload.email;
        if !(emailJson is json && emailJson is string) {
            http:BadRequest badRequestResponse = {
                body: {"error": "Email field is required"}
            };
            return badRequestResponse;
        }

        string testEmail = emailJson is string ? emailJson : "";

        error? emailResult = sendTestEmail(testEmail);
        
        if emailResult is error {
            log:printError("Failed to send test email: " + emailResult.message());
            http:InternalServerError errorResponse = {
                body: {"error": "Failed to send test email: " + emailResult.message()}
            };
            return errorResponse;
        }

        return {
            "success": true,
            "message": "Test email sent successfully to " + testEmail
        };
    }
}

// Job Posting record type
type JobPosting record {
    string id;
    string position_name;
    string company_name;
    string role_overview;
    string key_responsibilities;
    string required_qualifications;
    string? location;
    string employment_type;
    string? salary_range;
    string? company_logo_url;
    string? company_logo_s3_key;
    string created_at;
    string updated_at;
    string status;
    int views = 0;
};

// Job Application record type
type JobApplication record {
    string id;
    string job_id;
    string first_name;
    string last_name;
    string email;
    string phone_number;
    string? resume_url;
    string? resume_s3_key;
    string? original_filename;
    string applied_at;
    string status;
};

// ✨ NEW: Schedule Call record type
type ScheduleCallRequest record {
    string id;
    string job_id;
    string name;
    string email;
    string job_title;
    string industry;
    string? preferred_time;
    string? phone_number;
    string? message;
    string requested_at;
    string status; // pending, scheduled, completed, cancelled
};

// Application record type for status updates
type ApplicationRecord record {
    string id;
    string job_id;
    string first_name;
    string last_name;
    string email;
    string status;
};

// Initialize database tables
function initializeDatabase() returns error? {
    // Create job_postings table
    sql:ExecutionResult|sql:Error createJobsTable = mysqlClient->execute(`
        CREATE TABLE IF NOT EXISTS job_postings (
            id VARCHAR(255) PRIMARY KEY,
            position_name VARCHAR(500) NOT NULL,
            company_name VARCHAR(255) NOT NULL,
            role_overview TEXT NOT NULL,
            key_responsibilities TEXT,
            required_qualifications TEXT,
            location VARCHAR(255),
            employment_type ENUM('full-time', 'part-time', 'contract', 'internship', 'remote') DEFAULT 'full-time',
            salary_range VARCHAR(100),
            company_logo_url VARCHAR(1000),
            company_logo_s3_key VARCHAR(500),
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            status ENUM('draft', 'active', 'closed') DEFAULT 'active',
            views INT DEFAULT 0,
            INDEX idx_created_at (created_at),
            INDEX idx_company (company_name),
            INDEX idx_location (location),
            INDEX idx_employment_type (employment_type),
            INDEX idx_status (status),
            INDEX idx_position (position_name)
        )
    `);

    if createJobsTable is sql:Error {
        return error("Failed to create job_postings table: " + createJobsTable.message());
    }

    // Create job_applications table
    sql:ExecutionResult|sql:Error createApplicationsTable = mysqlClient->execute(`
        CREATE TABLE IF NOT EXISTS job_applications (
            id VARCHAR(255) PRIMARY KEY,
            job_id VARCHAR(255) NOT NULL,
            first_name VARCHAR(255) NOT NULL,
            last_name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL,
            phone_number VARCHAR(50) NOT NULL,
            resume_url VARCHAR(1000),
            resume_s3_key VARCHAR(500),
            original_filename VARCHAR(500),
            applied_at DATETIME NOT NULL,
            status ENUM('submitted', 'reviewed', 'shortlisted', 'rejected', 'hired') DEFAULT 'submitted',
            INDEX idx_job_id (job_id),
            INDEX idx_email (email),
            INDEX idx_applied_at (applied_at),
            INDEX idx_status (status),
            FOREIGN KEY (job_id) REFERENCES job_postings(id) ON DELETE CASCADE,
            UNIQUE KEY unique_application (job_id, email)
        )
    `);

    if createApplicationsTable is sql:Error {
        return error("Failed to create job_applications table: " + createApplicationsTable.message());
    }

    // ✨ NEW: Create schedule_call_requests table
    sql:ExecutionResult|sql:Error createScheduleCallTable = mysqlClient->execute(`
        CREATE TABLE IF NOT EXISTS schedule_call_requests (
            id VARCHAR(255) PRIMARY KEY,
            job_id VARCHAR(255) NOT NULL,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL,
            job_title VARCHAR(255) NOT NULL,
            industry VARCHAR(255) NOT NULL,
            preferred_time VARCHAR(500),
            phone_number VARCHAR(50),
            message TEXT,
            requested_at DATETIME NOT NULL,
            status ENUM('pending', 'scheduled', 'completed', 'cancelled') DEFAULT 'pending',
            INDEX idx_job_id (job_id),
            INDEX idx_email (email),
            INDEX idx_requested_at (requested_at),
            INDEX idx_status (status),
            FOREIGN KEY (job_id) REFERENCES job_postings(id) ON DELETE CASCADE,
            UNIQUE KEY unique_pending_request (job_id, email, status)
        )
    `);

    if createScheduleCallTable is sql:Error {
        return error("Failed to create schedule_call_requests table: " + createScheduleCallTable.message());
    }

    log:printInfo("✅ Database tables initialized successfully");
    return;
}

// Helper function to format datetime for MySQL compatibility
isolated function getMySQLDateTime() returns string {
    time:Utc currentTime = time:utcNow();
    time:Civil civilTime = time:utcToCivil(currentTime);
    
    // Format as MySQL datetime: YYYY-MM-DD HH:MM:SS
    int year = civilTime.year;
    int month = civilTime.month;
    int day = civilTime.day;
    int hour = civilTime.hour;
    int minute = civilTime.minute;
    decimal second = civilTime.second ?: 0.0;
    
    string yearStr = year.toString();
    string monthStr = month < 10 ? "0" + month.toString() : month.toString();
    string dayStr = day < 10 ? "0" + day.toString() : day.toString();
    string hourStr = hour < 10 ? "0" + hour.toString() : hour.toString();
    string minuteStr = minute < 10 ? "0" + minute.toString() : minute.toString();
    string secondStr = (<int>second) < 10 ? "0" + (<int>second).toString() : (<int>second).toString();
    
    return yearStr + "-" + monthStr + "-" + dayStr + " " + hourStr + ":" + minuteStr + ":" + secondStr;
}

// Function to save file to S3
function saveFileToS3(byte[] fileBytes, string contentType, string folder) returns [string, string]|error {
    string extension = getFileExtension(contentType);
    string fileName = folder + "_" + uuid:createType1AsString() + extension;
    string filePath = uploadDirectory + "/" + fileName;

    // Save to local storage first (backup)
    io:Error? writeResult = io:fileWriteBytes(filePath, fileBytes);
    if writeResult is io:Error {
        log:printWarn("Failed to save file locally: " + writeResult.message());
    }

    // Upload to S3
    string s3Key = folder + "/" + fileName;
    string|error s3Result = uploadToS3WithCLI(filePath, s3Key, contentType);
    
    if s3Result is string {
        string s3Url = string `https://${bucketName}.s3.${awsRegion}.amazonaws.com/${s3Key}`;
        log:printInfo("File uploaded to S3 successfully: " + s3Url);
        return [s3Url, s3Key];
    } else {
        return error("Failed to upload file to S3: " + s3Result.message());
    }
}

// Function to upload to S3 using AWS CLI
function uploadToS3WithCLI(string filePath, string s3Key, string contentType) returns string|error {
    string[] awsCommands = ["aws", "aws.exe", "C:\\Program Files\\Amazon\\AWSCLIV2\\aws.exe"];
    
    foreach string awsCmd in awsCommands {
        string[] awsArgs = [
            "s3", "cp", filePath, 
            string `s3://${bucketName}/${s3Key}`,
            "--region", awsRegion,
            "--content-type", contentType
        ];
        
        log:printInfo("Attempting S3 upload with: " + awsCmd);
        
        os:Process|os:Error proc = os:exec({value: awsCmd, arguments: awsArgs});
        
        if proc is os:Process {
            int|os:Error exitCode = proc.waitForExit();
            
            if exitCode is int && exitCode == 0 {
                log:printInfo("AWS CLI upload completed successfully");
                return "Upload successful";
            }
        }
    }
    
    return error("AWS CLI upload failed");
}

// Function to test AWS CLI availability
function testAWSCLI() returns string {
    string[] awsCommands = ["aws", "aws.exe", "C:\\Program Files\\Amazon\\AWSCLIV2\\aws.exe"];
    
    foreach string awsCmd in awsCommands {
        os:Process|os:Error proc = os:exec({value: awsCmd, arguments: ["--version"]});
        if proc is os:Process {
            int|os:Error exitCode = proc.waitForExit();
            if exitCode is int && exitCode == 0 {
                return "AWS CLI found: " + awsCmd;
            }
        }
    }
    
    return "AWS CLI not found";
}

// Function to send application confirmation email to applicant
function sendApplicationConfirmationEmail(string recipientEmail, string applicantName, string positionName, string companyNameForEmail, string applicationId, string appliedAt) returns error? {
    log:printInfo("📧 Sending application confirmation email to: " + recipientEmail);
    log:printInfo("Application ID: " + applicationId + " for position: " + positionName);
    
    string subject = "Application Received: " + positionName + " at " + companyNameForEmail;
    string htmlContent = getApplicationConfirmationHTML(applicantName, positionName, companyNameForEmail, applicationId, appliedAt);
    
    email:Message confirmationEmail = {
        to: [recipientEmail],
        subject: subject,
        'from: adminEmail,
        body: htmlContent,
        contentType: "text/html"
    };
    
    error? emailResult = smtpClient->sendMessage(confirmationEmail);
    if emailResult is error {
        log:printError("Failed to send application confirmation email: " + emailResult.message());
        return emailResult;
    }
    
    log:printInfo("✅ Application confirmation email sent successfully to: " + recipientEmail);
    return;
}

// ✨ NEW: Function to send schedule call confirmation email to user
function sendScheduleCallConfirmationEmail(string recipientEmail, string userName, string positionName, string companyNameForEmail, string requestId, string requestedAt, string? preferredTime) returns error? {
    log:printInfo("📧 Sending schedule call confirmation email to: " + recipientEmail);
    log:printInfo("Request ID: " + requestId + " for position: " + positionName);
    
    string subject = "Call Request Received: " + positionName + " at " + companyNameForEmail;
    string htmlContent = getScheduleCallConfirmationHTML(userName, positionName, companyNameForEmail, requestId, requestedAt, preferredTime);
    
    email:Message confirmationEmail = {
        to: [recipientEmail],
        subject: subject,
        'from: adminEmail,
        body: htmlContent,
        contentType: "text/html"
    };
    
    error? emailResult = smtpClient->sendMessage(confirmationEmail);
    if emailResult is error {
        log:printError("Failed to send schedule call confirmation email: " + emailResult.message());
        return emailResult;
    }
    
    log:printInfo("✅ Schedule call confirmation email sent successfully to: " + recipientEmail);
    return;
}

// ✨ NEW: Function to send admin alert email for new schedule call request
function sendScheduleCallAdminAlert(string userName, string userEmail, string jobTitle, string industry, string positionName, string companyNameForEmail, string requestId, string requestedAt, string? preferredTime, string? phoneNumber, string? message) returns error? {
    log:printInfo("📧 Sending schedule call admin alert email");
    log:printInfo("Request ID: " + requestId + " from user: " + userEmail);
    
    string subject = "🔔 New Call Request: " + positionName + " - " + userName;
    string htmlContent = getScheduleCallAdminAlertHTML(userName, userEmail, jobTitle, industry, positionName, companyNameForEmail, requestId, requestedAt, preferredTime, phoneNumber, message);
    
    email:Message alertEmail = {
        to: [adminEmail],
        subject: subject,
        'from: adminEmail,
        body: htmlContent,
        contentType: "text/html"
    };
    
    error? emailResult = smtpClient->sendMessage(alertEmail);
    if emailResult is error {
        log:printError("Failed to send schedule call admin alert email: " + emailResult.message());
        return emailResult;
    }
    
    log:printInfo("✅ Schedule call admin alert email sent successfully");
    return;
}

// FIXED: Actual email sending function using Ballerina Email module
function sendStatusUpdateEmail(string recipientEmail, string applicantName, string positionName, string companyNameForEmail, string newStatus) returns error? {
    log:printInfo("📧 Sending email notification to: " + recipientEmail);
    log:printInfo("Status: " + newStatus + " for position: " + positionName);
    
    string subject = getEmailSubject(newStatus, positionName, companyNameForEmail);
    string htmlContent = getEmailHTMLContent(applicantName, positionName, companyNameForEmail, newStatus);
    
    email:Message statusEmail = {
        to: [recipientEmail],
        subject: subject,
        'from: adminEmail,
        body: htmlContent,
        contentType: "text/html"
    };
    
    error? emailResult = smtpClient->sendMessage(statusEmail);
    if emailResult is error {
        log:printError("Failed to send status update email: " + emailResult.message());
        return emailResult;
    }
    
    log:printInfo("✅ Status update email sent successfully to: " + recipientEmail);
    return;
}

// Function to send test email
function sendTestEmail(string recipientEmail) returns error? {
    log:printInfo("📧 Sending test email to: " + recipientEmail);
    
    string subject = "Job Portal - Test Email";
    string htmlContent = getTestEmailHTML(recipientEmail);
    
    email:Message testEmail = {
        to: [recipientEmail],
        subject: subject,
        'from: adminEmail,
        body: htmlContent,
        contentType: "text/html"
    };
    
    error? emailResult = smtpClient->sendMessage(testEmail);
    if emailResult is error {
        log:printError("Failed to send test email: " + emailResult.message());
        return emailResult;
    }
    
    log:printInfo("✅ Test email sent successfully to: " + recipientEmail);
    return;
}

// Function to generate application confirmation email HTML
function getApplicationConfirmationHTML(string applicantName, string positionName, string companyNameForEmail, string applicationId, string appliedAt) returns string {
    string currentYear = time:utcNow()[0].toString();
    
    return "<!DOCTYPE html>" +
           "<html lang=\"en\">" +
           "<head>" +
           "<meta charset=\"UTF-8\">" +
           "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">" +
           "<title>Application Confirmation</title>" +
           "<style>" +
           "body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }" +
           ".container { max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 0 20px rgba(0,0,0,0.1); }" +
           ".header { background: linear-gradient(135deg, #2c3e50, #3498db); color: white; padding: 40px 20px; text-align: center; }" +
           ".header h1 { margin: 0; font-size: 28px; font-weight: 300; }" +
           ".content { padding: 40px 30px; }" +
           ".success-badge { display: inline-block; background-color: #27ae60; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; text-transform: uppercase; font-size: 12px; }" +
           ".confirmation-section { background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #27ae60; }" +
           ".application-details { background-color: #f9f9f9; padding: 15px; border-radius: 6px; margin: 15px 0; }" +
           ".next-steps { background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 20px 0; }" +
           ".footer { background-color: #f0f0f0; padding: 20px; text-align: center; font-size: 12px; color: #666; }" +
           ".highlight { color: #2980b9; font-weight: bold; }" +
           "</style>" +
           "</head>" +
           "<body>" +
           "<div class=\"container\">" +
           "<div class=\"header\">" +
           "<h1>🎉 " + companyNameForEmail + "</h1>" +
           "<p>Application Confirmation</p>" +
           "</div>" +
           "<div class=\"content\">" +
           "<h2>Dear " + applicantName + ",</h2>" +
           "<div class=\"confirmation-section\">" +
           "<h3>✅ Application Successfully Received!</h3>" +
           "<p>Thank you for your interest in joining our team. We have successfully received your job application.</p>" +
           "</div>" +
           "<div class=\"application-details\">" +
           "<h3>Application Details:</h3>" +
           "<p><strong>Position:</strong> " + positionName + "</p>" +
           "<p><strong>Company:</strong> " + companyNameForEmail + "</p>" +
           "<p><strong>Application ID:</strong> <span class=\"highlight\">" + applicationId + "</span></p>" +
           "<p><strong>Submitted:</strong> " + appliedAt + "</p>" +
           "<p><strong>Status:</strong> <span class=\"success-badge\">Received</span></p>" +
           "</div>" +
           "<div class=\"next-steps\">" +
           "<h3>📋 What Happens Next?</h3>" +
           "<ul>" +
           "<li>Our HR team will review your application and resume</li>" +
           "<li>If your profile matches our requirements, we'll contact you for the next steps</li>" +
           "<li>We typically respond within 5-7 business days</li>" +
           "<li>Please keep your application ID (<strong>" + applicationId + "</strong>) for reference</li>" +
           "</ul>" +
           "</div>" +
           "<p>We appreciate the time and effort you've invested in your application. We're excited to learn more about your qualifications and experience.</p>" +
           "<p>If you have any questions about your application or the position, please don't hesitate to contact our HR team.</p>" +
           "<br>" +
           "<p>Best regards,<br>" +
           "<strong>HR Recruitment Team</strong><br>" +
           companyNameForEmail + "</p>" +
           "</div>" +
           "<div class=\"footer\">" +
           "<p>&copy; " + currentYear + " " + companyNameForEmail + ". All rights reserved.</p>" +
           "<p>This is an automated confirmation from the Job Portal system.</p>" +
           "<p>Please do not reply to this email. For inquiries, contact our HR department.</p>" +
           "</div>" +
           "</div>" +
           "</body>" +
           "</html>";
}

// ✨ NEW: HTML template for user confirmation email
function getScheduleCallConfirmationHTML(string userName, string positionName, string companyNameForEmail, string requestId, string requestedAt, string? preferredTime) returns string {
    string currentYear = time:utcNow()[0].toString();
    string preferredTimeText = preferredTime is string ? preferredTime : "Not specified";
    
    return "<!DOCTYPE html>" +
           "<html lang=\"en\">" +
           "<head>" +
           "<meta charset=\"UTF-8\">" +
           "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">" +
           "<title>Call Request Confirmation</title>" +
           "<style>" +
           "body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }" +
           ".container { max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 0 20px rgba(0,0,0,0.1); }" +
           ".header { background: linear-gradient(135deg, #8e44ad, #3498db); color: white; padding: 40px 20px; text-align: center; }" +
           ".header h1 { margin: 0; font-size: 28px; font-weight: 300; }" +
           ".content { padding: 40px 30px; }" +
           ".success-badge { display: inline-block; background-color: #8e44ad; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; text-transform: uppercase; font-size: 12px; }" +
           ".confirmation-section { background-color: #f3e5f5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #8e44ad; }" +
           ".request-details { background-color: #f9f9f9; padding: 15px; border-radius: 6px; margin: 15px 0; }" +
           ".next-steps { background-color: #e3f2fd; border: 1px solid #bbdefb; border-radius: 8px; padding: 20px; margin: 20px 0; }" +
           ".footer { background-color: #f0f0f0; padding: 20px; text-align: center; font-size: 12px; color: #666; }" +
           ".highlight { color: #8e44ad; font-weight: bold; }" +
           "</style>" +
           "</head>" +
           "<body>" +
           "<div class=\"container\">" +
           "<div class=\"header\">" +
           "<h1>📞 " + companyNameForEmail + "</h1>" +
           "<p>Call Request Confirmation</p>" +
           "</div>" +
           "<div class=\"content\">" +
           "<h2>Dear " + userName + ",</h2>" +
           "<div class=\"confirmation-section\">" +
           "<h3>✅ Call Request Received!</h3>" +
           "<p>Thank you for your interest in scheduling a call with us. We have successfully received your request.</p>" +
           "</div>" +
           "<div class=\"request-details\">" +
           "<h3>Request Details:</h3>" +
           "<p><strong>Position:</strong> " + positionName + "</p>" +
           "<p><strong>Company:</strong> " + companyNameForEmail + "</p>" +
           "<p><strong>Request ID:</strong> <span class=\"highlight\">" + requestId + "</span></p>" +
           "<p><strong>Submitted:</strong> " + requestedAt + "</p>" +
           "<p><strong>Preferred Time:</strong> " + preferredTimeText + "</p>" +
           "<p><strong>Status:</strong> <span class=\"success-badge\">Pending</span></p>" +
           "</div>" +
           "<div class=\"next-steps\">" +
           "<h3>📋 What Happens Next?</h3>" +
           "<ul>" +
           "<li>Our HR team will review your call request</li>" +
           "<li>We'll contact you within 1-2 business days to confirm the call timing</li>" +
           "<li>The call will be scheduled at a mutually convenient time</li>" +
           "<li>Please keep your request ID (<strong>" + requestId + "</strong>) for reference</li>" +
           "</ul>" +
           "</div>" +
           "<p>We're excited to discuss this opportunity with you and learn more about your background and career goals.</p>" +
           "<p>If you need to make any changes to your request or have questions, please contact our HR team.</p>" +
           "<br>" +
           "<p>Best regards,<br>" +
           "<strong>HR Team</strong><br>" +
           companyNameForEmail + "</p>" +
           "</div>" +
           "<div class=\"footer\">" +
           "<p>&copy; " + currentYear + " " + companyNameForEmail + ". All rights reserved.</p>" +
           "<p>This is an automated confirmation from the Job Portal system.</p>" +
           "<p>Please do not reply to this email. For inquiries, contact our HR department.</p>" +
           "</div>" +
           "</div>" +
           "</body>" +
           "</html>";
}

// ✨ NEW: HTML template for admin alert email
function getScheduleCallAdminAlertHTML(string userName, string userEmail, string jobTitle, string industry, string positionName, string companyNameForEmail, string requestId, string requestedAt, string? preferredTime, string? phoneNumber, string? message) returns string {
    string currentYear = time:utcNow()[0].toString();
    string preferredTimeText = preferredTime is string ? preferredTime : "Not specified";
    string phoneText = phoneNumber is string ? phoneNumber : "Not provided";
    string messageText = message is string ? message : "No additional message";
    
    return "<!DOCTYPE html>" +
           "<html lang=\"en\">" +
           "<head>" +
           "<meta charset=\"UTF-8\">" +
           "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">" +
           "<title>New Call Request Alert</title>" +
           "<style>" +
           "body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }" +
           ".container { max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 0 20px rgba(0,0,0,0.1); }" +
           ".header { background: linear-gradient(135deg, #e74c3c, #c0392b); color: white; padding: 40px 20px; text-align: center; }" +
           ".header h1 { margin: 0; font-size: 28px; font-weight: 300; }" +
           ".content { padding: 40px 30px; }" +
           ".alert-badge { display: inline-block; background-color: #e74c3c; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; text-transform: uppercase; font-size: 12px; }" +
           ".alert-section { background-color: #ffebee; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #e74c3c; }" +
           ".user-details { background-color: #f9f9f9; padding: 15px; border-radius: 6px; margin: 15px 0; }" +
           ".action-section { background-color: #fff3e0; border: 1px solid #ffcc02; border-radius: 8px; padding: 20px; margin: 20px 0; }" +
           ".footer { background-color: #f0f0f0; padding: 20px; text-align: center; font-size: 12px; color: #666; }" +
           ".highlight { color: #e74c3c; font-weight: bold; }" +
           ".email-link { color: #3498db; text-decoration: none; }" +
           "</style>" +
           "</head>" +
           "<body>" +
           "<div class=\"container\">" +
           "<div class=\"header\">" +
           "<h1>🔔 New Call Request</h1>" +
           "<p>Job Portal Admin Alert</p>" +
           "</div>" +
           "<div class=\"content\">" +
           "<h2>New Schedule Call Request</h2>" +
           "<div class=\"alert-section\">" +
           "<h3>🚨 Action Required</h3>" +
           "<p>A new call request has been submitted for the <strong>" + positionName + "</strong> position.</p>" +
           "<p><span class=\"alert-badge\">New Request</span></p>" +
           "</div>" +
           "<div class=\"user-details\">" +
           "<h3>👤 Candidate Information:</h3>" +
           "<p><strong>Name:</strong> " + userName + "</p>" +
           "<p><strong>Email:</strong> <a href=\"mailto:" + userEmail + "\" class=\"email-link\">" + userEmail + "</a></p>" +
           "<p><strong>Phone:</strong> " + phoneText + "</p>" +
           "<p><strong>Current Job Title:</strong> " + jobTitle + "</p>" +
           "<p><strong>Industry:</strong> " + industry + "</p>" +
           "</div>" +
           "<div class=\"user-details\">" +
           "<h3>💼 Position Details:</h3>" +
           "<p><strong>Position:</strong> " + positionName + "</p>" +
           "<p><strong>Company:</strong> " + companyNameForEmail + "</p>" +
           "<p><strong>Request ID:</strong> <span class=\"highlight\">" + requestId + "</span></p>" +
           "<p><strong>Requested At:</strong> " + requestedAt + "</p>" +
           "<p><strong>Preferred Time:</strong> " + preferredTimeText + "</p>" +
           "</div>" +
           "<div class=\"user-details\">" +
           "<h3>💬 Additional Message:</h3>" +
           "<p style=\"font-style: italic; background-color: #f5f5f5; padding: 10px; border-radius: 4px;\">" + messageText + "</p>" +
           "</div>" +
           "<div class=\"action-section\">" +
           "<h3>📋 Next Steps:</h3>" +
           "<ul>" +
           "<li>Review the candidate's request and background</li>" +
           "<li>Contact the candidate via email or phone to schedule the call</li>" +
           "<li>Update the request status in the system once scheduled</li>" +
           "<li>Prepare for the call discussion about the " + positionName + " position</li>" +
           "</ul>" +
           "</div>" +
           "<p><strong>Quick Actions:</strong></p>" +
           "<p>📧 <a href=\"mailto:" + userEmail + "?subject=Re: Call Request for " + positionName + " (ID: " + requestId + ")\" class=\"email-link\">Reply to candidate directly</a></p>" +
           "<br>" +
           "<p>Best regards,<br>" +
           "<strong>Job Portal System</strong></p>" +
           "</div>" +
           "<div class=\"footer\">" +
           "<p>&copy; " + currentYear + " " + companyNameForEmail + ". All rights reserved.</p>" +
           "<p>This is an automated alert from the Job Portal system.</p>" +
           "<p>Request ID: " + requestId + " | Generated at: " + requestedAt + "</p>" +
           "</div>" +
           "</div>" +
           "</body>" +
           "</html>";
}

// Get detailed HTML email content for status updates
function getEmailHTMLContent(string applicantName, string positionName, string companyNameForEmail, string newStatus) returns string {
    string statusMessage = getStatusMessage(newStatus);
    string statusColor = getStatusColor(newStatus);
    string currentYear = time:utcNow()[0].toString();
    
    return "<!DOCTYPE html>" +
           "<html lang=\"en\">" +
           "<head>" +
           "<meta charset=\"UTF-8\">" +
           "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">" +
           "<title>Application Status Update</title>" +
           "<style>" +
           "body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }" +
           ".container { max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 0 20px rgba(0,0,0,0.1); }" +
           ".header { background: linear-gradient(135deg, #2c3e50, #3498db); color: white; padding: 40px 20px; text-align: center; }" +
           ".header h1 { margin: 0; font-size: 28px; font-weight: 300; }" +
           ".content { padding: 40px 30px; }" +
           ".status-badge { display: inline-block; background-color: " + statusColor + "; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; text-transform: uppercase; font-size: 12px; }" +
           ".status-section { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid " + statusColor + "; }" +
           ".job-details { background-color: #f9f9f9; padding: 15px; border-radius: 6px; margin: 15px 0; }" +
           ".footer { background-color: #f0f0f0; padding: 20px; text-align: center; font-size: 12px; color: #666; }" +
           "</style>" +
           "</head>" +
           "<body>" +
           "<div class=\"container\">" +
           "<div class=\"header\">" +
           "<h1>🏢 " + companyNameForEmail + "</h1>" +
           "<p>Application Status Update</p>" +
           "</div>" +
           "<div class=\"content\">" +
           "<h2>Dear " + applicantName + ",</h2>" +
           "<p>We wanted to update you on the status of your job application.</p>" +
           "<div class=\"job-details\">" +
           "<strong>Position:</strong> " + positionName + "<br>" +
           "<strong>Company:</strong> " + companyNameForEmail + "<br>" +
           "<strong>Status:</strong> <span class=\"status-badge\">" + newStatus + "</span>" +
           "</div>" +
           "<div class=\"status-section\">" +
           "<h3>Status Update</h3>" +
           "<p>" + statusMessage + "</p>" +
           "</div>" +
           "<p>Thank you for your interest in joining our team. We appreciate the time and effort you've put into your application.</p>" +
           "<p>If you have any questions, please don't hesitate to contact our HR team.</p>" +
           "<br>" +
           "<p>Best regards,<br>" +
           "<strong>HR Team</strong><br>" +
           companyNameForEmail + "</p>" +
           "</div>" +
           "<div class=\"footer\">" +
           "<p>&copy; " + currentYear + " " + companyNameForEmail + ". All rights reserved.</p>" +
           "<p>This is an automated message from the Job Portal system.</p>" +
           "</div>" +
           "</div>" +
           "</body>" +
           "</html>";
}

// Get test email HTML content
function getTestEmailHTML(string recipientEmail) returns string {
    string currentYear = time:utcNow()[0].toString();
    
    return "<!DOCTYPE html>" +
           "<html lang=\"en\">" +
           "<head>" +
           "<meta charset=\"UTF-8\">" +
           "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">" +
           "<title>Job Portal Test Email</title>" +
           "<style>" +
           "body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }" +
           ".container { max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 0 20px rgba(0,0,0,0.1); }" +
           ".header { background: linear-gradient(135deg, #27ae60, #2ecc71); color: white; padding: 40px 20px; text-align: center; }" +
           ".header h1 { margin: 0; font-size: 28px; font-weight: 300; }" +
           ".content { padding: 40px 30px; }" +
           ".success-box { background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 20px; margin: 20px 0; }" +
           ".footer { background-color: #f0f0f0; padding: 20px; text-align: center; font-size: 12px; color: #666; }" +
           "</style>" +
           "</head>" +
           "<body>" +
           "<div class=\"container\">" +
           "<div class=\"header\">" +
           "<h1>✅ Job Portal Test</h1>" +
           "<p>Email Configuration Test</p>" +
           "</div>" +
           "<div class=\"content\">" +
           "<h2>Test Email Successful!</h2>" +
           "<div class=\"success-box\">" +
           "<h3>🎉 Great News!</h3>" +
           "<p>This test email was sent successfully to <strong>" + recipientEmail + "</strong></p>" +
           "<p>Your Job Portal email configuration is working correctly.</p>" +
           "</div>" +
           "<h3>Email System Details:</h3>" +
           "<ul>" +
           "<li><strong>SMTP Host:</strong> " + smtpHost + "</li>" +
           "<li><strong>SMTP Port:</strong> " + smtpPort.toString() + "</li>" +
           "<li><strong>From Address:</strong> " + adminEmail + "</li>" +
           "<li><strong>SSL Enabled:</strong> " + useSSL.toString() + "</li>" +
           "</ul>" +
           "<p>The Job Portal is now ready to send application status updates and notifications to job applicants.</p>" +
           "<br>" +
           "<p>Best regards,<br>" +
           "<strong>Job Portal System</strong></p>" +
           "</div>" +
           "<div class=\"footer\">" +
           "<p>&copy; " + currentYear + " " + companyName + ". All rights reserved.</p>" +
           "<p>This is an automated test message from the Job Portal system.</p>" +
           "</div>" +
           "</div>" +
           "</body>" +
           "</html>";
}

// Get status color for styling
function getStatusColor(string status) returns string {
    match status {
        "reviewed" => { return "#3498db"; }      // Blue
        "shortlisted" => { return "#f39c12"; }   // Orange
        "hired" => { return "#27ae60"; }         // Green
        "rejected" => { return "#e74c3c"; }      // Red
        _ => { return "#95a5a6"; }               // Gray
    }
}

// Generate email subject based on status
isolated function getEmailSubject(string status, string positionName, string companyNameForEmail) returns string {
    match status {
        "reviewed" => { 
            return "Application Update: " + positionName + " at " + companyNameForEmail + " - Under Review"; 
        }
        "shortlisted" => { 
            return "Great News! You're Shortlisted for " + positionName + " at " + companyNameForEmail; 
        }
        "hired" => { 
            return "Congratulations! Job Offer for " + positionName + " at " + companyNameForEmail; 
        }
        "rejected" => { 
            return "Application Status Update: " + positionName + " at " + companyNameForEmail; 
        }
        _ => { 
            return "Application Update: " + positionName + " at " + companyNameForEmail; 
        }
    }
}

// Get status-specific message
isolated function getStatusMessage(string status) returns string {
    match status {
        "reviewed" => { 
            return "Your application has been reviewed by our hiring team and is currently under consideration. We will update you on the next steps soon."; 
        }
        "shortlisted" => { 
            return "Congratulations! Your application has been shortlisted. Our HR team will be in touch with you shortly to discuss the next steps in the interview process."; 
        }
        "hired" => { 
            return "We are thrilled to offer you the position! Congratulations on being selected. Our HR team will contact you with the offer details and next steps."; 
        }
        "rejected" => { 
            return "After careful consideration, we have decided to move forward with other candidates. We appreciate your interest in our company and encourage you to apply for future opportunities."; 
        }
        _ => { 
            return "Your application status has been updated. Thank you for your continued interest in this position."; 
        }
    }
}

// Get file extension based on content type
isolated function getFileExtension(string contentType) returns string {
    match contentType {
        "image/jpeg" => { return ".jpg"; }
        "image/png" => { return ".png"; }
        "image/gif" => { return ".gif"; }
        "image/webp" => { return ".webp"; }
        "application/pdf" => { return ".pdf"; }
        "application/msword" => { return ".doc"; }
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" => { return ".docx"; }
        _ => { return ".pdf"; }
    }
}