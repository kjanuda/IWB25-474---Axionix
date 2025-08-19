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

// Configuration
configurable string host = "localhost";
configurable string port = "3306";
configurable string username = "root";
configurable string password = "J3007426@Januda";
configurable string database = "blog_db3";
configurable string geminiApiKey = "AIzaSyDhuxepfjXMcu_I8Lf6cUtvzVa-nyGidF0";
configurable string awsRegion = "us-east-1";
configurable string bucketName = "blogecogreen";
configurable string uploadDirectory = "./uploads";
configurable int serverPort = 8085;

// MySQL client
mysql:Client mysqlClient = check new (
    host = host,
    port = check int:fromString(port),
    user = username,
    password = password,
    database = database
);

// HTTP client for Google Gemini API
http:Client geminiClient = check new ("https://generativelanguage.googleapis.com");

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
        
        log:printInfo("Blog System Backend initialized on port " + serverPort.toString());
        log:printInfo("Database: " + database + " | S3 Bucket: " + bucketName);
        log:printInfo("MySQL Status: Connected successfully");
    }
    
    // Health check endpoint
    resource function get health() returns json {
        string awsStatus = testAWSCLI();
        
        return {
            "status": "healthy",
            "service": "Blog System API",
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
            }
        };
    }

    // Create new blog post
    resource function post blogs(http:Request request) returns json|http:InternalServerError|http:BadRequest {
        log:printInfo("=== NEW BLOG POST CREATION REQUEST ===");
        
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
        string title = "";
        string content = "";
        string author = "";
        string category = "";
        string tags = "";
        byte[]? imageBytes = ();
        string? imageContentType = ();
        
        foreach mime:Entity part in bodyParts {
            mime:ContentDisposition|mime:HeaderUnavailableError cd = part.getContentDisposition();
            if cd is mime:ContentDisposition {
                string fieldName = cd.name;
                
                match fieldName {
                    "title" => {
                        string|mime:Error titleData = part.getText();
                        if titleData is string {
                            title = titleData;
                        }
                    }
                    "content" => {
                        string|mime:Error contentData = part.getText();
                        if contentData is string {
                            content = contentData;
                        }
                    }
                    "author" => {
                        string|mime:Error authorData = part.getText();
                        if authorData is string {
                            author = authorData;
                        }
                    }
                    "category" => {
                        string|mime:Error categoryData = part.getText();
                        if categoryData is string {
                            category = categoryData;
                        }
                    }
                    "tags" => {
                        string|mime:Error tagsData = part.getText();
                        if tagsData is string {
                            tags = tagsData;
                        }
                    }
                    "image" => {
                        byte[]|mime:Error imgData = part.getByteArray();
                        if imgData is byte[] {
                            imageBytes = imgData;
                            string|mime:HeaderUnavailableError imgContentType = part.getContentType();
                            if imgContentType is string {
                                imageContentType = imgContentType;
                            }
                            log:printInfo("Image received: " + imgData.length().toString() + " bytes");
                        }
                    }
                }
            }
        }

        // Validate required fields
        if title.trim() == "" || content.trim() == "" || author.trim() == "" {
            http:BadRequest badRequestResponse = {
                body: {"error": "Title, content, and author are required fields"}
            };
            return badRequestResponse;
        }

        // Handle image upload to S3 if present
        string? imageUrl = ();
        string? imageS3Key = ();
        
        if imageBytes is byte[] {
            [string, string]|error imgResult = saveImageToS3(imageBytes, imageContentType ?: "image/jpeg");
            if imgResult is [string, string] {
                [imageUrl, imageS3Key] = imgResult;
                log:printInfo("✅ Image uploaded to S3: " + (imageUrl ?: ""));
            } else {
                log:printError("❌ Failed to upload image to S3: " + imgResult.message());
                http:InternalServerError errorResponse = {
                    body: {"error": "Failed to upload image: " + imgResult.message()}
                };
                return errorResponse;
            }
        }

        // Insert blog post into database
        string blogId = uuid:createType1AsString();
        string currentTime = getMySQLDateTime(); // FIXED: Use MySQL-compatible datetime format
        
        sql:ExecutionResult|sql:Error insertResult = mysqlClient->execute(`
            INSERT INTO blog_posts (id, title, content, author, category, tags, image_url, image_s3_key, created_at, updated_at, status)
            VALUES (${blogId}, ${title}, ${content}, ${author}, ${category}, ${tags}, ${imageUrl}, ${imageS3Key}, ${currentTime}, ${currentTime}, 'published')
        `);

        if insertResult is sql:Error {
            log:printError("Failed to insert blog post: " + insertResult.message());
            http:InternalServerError errorResponse = {
                body: {"error": "Failed to save blog post: " + insertResult.message()}
            };
            return errorResponse;
        }

        log:printInfo("✅ Blog post created successfully with ID: " + blogId);

        json response = {
            "success": true,
            "blogId": blogId,
            "title": title,
            "author": author,
            "category": category,
            "imageUrl": imageUrl,
            "createdAt": currentTime,
            "message": "Blog post created successfully"
        };
        return response;
    }

    // Get all blog posts with pagination
    resource function get blogs(string? page, string? pageLimit, string? category, string? author) returns json|http:InternalServerError {
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

        // Get total count first
        sql:ParameterizedQuery countQuery;
        if category is string && category.trim() != "" {
            if author is string && author.trim() != "" {
                countQuery = `SELECT COUNT(*) as total FROM blog_posts WHERE status = 'published' AND category = ${category} AND author LIKE ${"%" + author + "%"}`;
            } else {
                countQuery = `SELECT COUNT(*) as total FROM blog_posts WHERE status = 'published' AND category = ${category}`;
            }
        } else if author is string && author.trim() != "" {
            countQuery = `SELECT COUNT(*) as total FROM blog_posts WHERE status = 'published' AND author LIKE ${"%" + author + "%"}`;
        } else {
            countQuery = `SELECT COUNT(*) as total FROM blog_posts WHERE status = 'published'`;
        }

        stream<record {int total;}, sql:Error?> countResult = mysqlClient->query(countQuery);
        
        int totalPosts = 0;
        error? countError = countResult.forEach(function(record {int total;} row) {
            totalPosts = row.total;
        });
        
        if countError is error {
            http:InternalServerError errorResponse = {
                body: {"error": "Failed to count blog posts: " + countError.message()}
            };
            return errorResponse;
        }

        // Get blog posts with proper parameterized query
        sql:ParameterizedQuery blogQuery;
        if category is string && category.trim() != "" {
            if author is string && author.trim() != "" {
                blogQuery = `SELECT * FROM blog_posts WHERE status = 'published' AND category = ${category} AND author LIKE ${"%" + author + "%"} ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offset}`;
            } else {
                blogQuery = `SELECT * FROM blog_posts WHERE status = 'published' AND category = ${category} ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offset}`;
            }
        } else if author is string && author.trim() != "" {
            blogQuery = `SELECT * FROM blog_posts WHERE status = 'published' AND author LIKE ${"%" + author + "%"} ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offset}`;
        } else {
            blogQuery = `SELECT * FROM blog_posts WHERE status = 'published' ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offset}`;
        }

        stream<BlogPost, sql:Error?> blogStream = mysqlClient->query(blogQuery);

        BlogPost[] blogs = [];
        error? collectError = blogStream.forEach(function(BlogPost blog) {
            blogs.push(blog);
        });

        if collectError is error {
            http:InternalServerError errorResponse = {
                body: {"error": "Failed to fetch blog posts: " + collectError.message()}
            };
            return errorResponse;
        }

        int totalPages = (totalPosts + limitNum - 1) / limitNum;

        json response = {
            "success": true,
            "blogs": blogs.toJson(),
            "pagination": {
                "currentPage": pageNum,
                "totalPages": totalPages,
                "totalPosts": totalPosts,
                "pageLimit": limitNum,
                "hasNext": pageNum < totalPages,
                "hasPrev": pageNum > 1
            }
        };
        return response;
    }

    // Get single blog post by ID
    resource function get blogs/[string blogId]() returns json|http:NotFound|http:InternalServerError {
        stream<BlogPost, sql:Error?> blogStream = mysqlClient->query(`
            SELECT * FROM blog_posts WHERE id = ${blogId} AND status = 'published'
        `);

        BlogPost? blog = ();
        error? collectError = blogStream.forEach(function(BlogPost b) {
            blog = b;
        });

        if collectError is error {
            http:InternalServerError errorResponse = {
                body: {"error": "Failed to fetch blog post: " + collectError.message()}
            };
            return errorResponse;
        }

        if blog is () {
            http:NotFound notFoundResponse = {
                body: {"error": "Blog post not found"}
            };
            return notFoundResponse;
        }

        // Increment view count
        sql:ExecutionResult|sql:Error updateResult = mysqlClient->execute(`
            UPDATE blog_posts SET views = views + 1 WHERE id = ${blogId}
        `);

        if updateResult is sql:Error {
            log:printWarn("Failed to update view count: " + updateResult.message());
        }

        json response = {
            "success": true,
            "blog": blog.toJson()
        };
        return response;
    }

    // Update blog post
    resource function put blogs/[string blogId](http:Request request) returns json|http:NotFound|http:InternalServerError|http:BadRequest {
        json|error payload = request.getJsonPayload();
        if payload is error {
            http:BadRequest badRequestResponse = {
                body: {"error": "Invalid JSON payload"}
            };
            return badRequestResponse;
        }

        // Check if blog exists
        stream<BlogPost, sql:Error?> existingBlog = mysqlClient->query(`
            SELECT id FROM blog_posts WHERE id = ${blogId}
        `);

        boolean blogExists = false;
        error? checkError = existingBlog.forEach(function(BlogPost blog) {
            blogExists = true;
        });

        if checkError is error {
            http:InternalServerError errorResponse = {
                body: {"error": "Failed to check blog existence: " + checkError.message()}
            };
            return errorResponse;
        }

        if !blogExists {
            http:NotFound notFoundResponse = {
                body: {"error": "Blog post not found"}
            };
            return notFoundResponse;
        }

        // Extract fields from payload
        string? title = ();
        string? content = ();
        string? category = ();
        string? tags = ();
        
        json|error titleJson = payload.title;
        if titleJson is json && titleJson is string {
            title = titleJson;
        }
        
        json|error contentJson = payload.content;
        if contentJson is json && contentJson is string {
            content = contentJson;
        }
        
        json|error categoryJson = payload.category;
        if categoryJson is json && categoryJson is string {
            category = categoryJson;
        }
        
        json|error tagsJson = payload.tags;
        if tagsJson is json && tagsJson is string {
            tags = tagsJson;
        }
        
        string currentTime = getMySQLDateTime(); // FIXED: Use MySQL-compatible datetime format

        // Update with parameterized query
        sql:ExecutionResult|sql:Error updateResult;
        if title is string && content is string && category is string && tags is string {
            updateResult = mysqlClient->execute(`
                UPDATE blog_posts SET title = ${title}, content = ${content}, category = ${category}, tags = ${tags}, updated_at = ${currentTime}
                WHERE id = ${blogId}
            `);
        } else {
            updateResult = mysqlClient->execute(`
                UPDATE blog_posts SET updated_at = ${currentTime} WHERE id = ${blogId}
            `);
        }

        if updateResult is sql:Error {
            http:InternalServerError errorResponse = {
                body: {"error": "Failed to update blog post: " + updateResult.message()}
            };
            return errorResponse;
        }

        return {
            "success": true,
            "blogId": blogId,
            "updatedAt": currentTime,
            "message": "Blog post updated successfully"
        };
    }

    // Delete blog post
    resource function delete blogs/[string blogId]() returns json|http:NotFound|http:InternalServerError {
        sql:ExecutionResult|sql:Error deleteResult = mysqlClient->execute(`
            UPDATE blog_posts SET status = 'deleted', updated_at = ${getMySQLDateTime()} 
            WHERE id = ${blogId}
        `);

        if deleteResult is sql:Error {
            http:InternalServerError errorResponse = {
                body: {"error": "Failed to delete blog post: " + deleteResult.message()}
            };
            return errorResponse;
        }

        sql:ExecutionResult result = <sql:ExecutionResult>deleteResult;
        if result.affectedRowCount == 0 {
            http:NotFound notFoundResponse = {
                body: {"error": "Blog post not found"}
            };
            return notFoundResponse;
        }

        json response = {
            "success": true,
            "blogId": blogId,
            "message": "Blog post deleted successfully"
        };
        return response;
    }

    // Get categories
    resource function get categories() returns json|http:InternalServerError {
        stream<record {string category; int count;}, sql:Error?> categoryStream = mysqlClient->query(`
            SELECT category, COUNT(*) as count FROM blog_posts 
            WHERE status = 'published' AND category IS NOT NULL AND category != ''
            GROUP BY category ORDER BY count DESC
        `);

        json[] categories = [];
        error? collectError = categoryStream.forEach(function(record {string category; int count;} cat) {
            categories.push({"category": cat.category, "count": cat.count});
        });

        if collectError is error {
            http:InternalServerError errorResponse = {
                body: {"error": "Failed to fetch categories: " + collectError.message()}
            };
            return errorResponse;
        }

        json response = {
            "success": true,
            "categories": categories
        };
        return response;
    }

    // Search blogs
    resource function get search(string? q, string? category) returns json|http:InternalServerError {
        if q is () || q.trim() == "" {
            return {"success": true, "blogs": [], "message": "Please provide search query"};
        }

        sql:ParameterizedQuery searchQuery;
        string searchTerm = "%" + q + "%";
        
        if category is string && category.trim() != "" {
            searchQuery = `SELECT * FROM blog_posts WHERE status = 'published' AND category = ${category} AND (title LIKE ${searchTerm} OR content LIKE ${searchTerm} OR tags LIKE ${searchTerm}) ORDER BY created_at DESC LIMIT 20`;
        } else {
            searchQuery = `SELECT * FROM blog_posts WHERE status = 'published' AND (title LIKE ${searchTerm} OR content LIKE ${searchTerm} OR tags LIKE ${searchTerm}) ORDER BY created_at DESC LIMIT 20`;
        }

        stream<BlogPost, sql:Error?> blogStream = mysqlClient->query(searchQuery);

        BlogPost[] blogs = [];
        error? collectError = blogStream.forEach(function(BlogPost blog) {
            blogs.push(blog);
        });

        if collectError is error {
            http:InternalServerError errorResponse = {
                body: {"error": "Failed to search blog posts: " + collectError.message()}
            };
            return errorResponse;
        }

        json response = {
            "success": true,
            "blogs": blogs.toJson(),
            "searchQuery": q,
            "resultsCount": blogs.length()
        };
        return response;
    }

    // Serve images from S3 (redirect)
    resource function get images/[string fileName]() returns http:Response {
        string s3Url = string `https://${bucketName}.s3.${awsRegion}.amazonaws.com/blog-images/${fileName}`;
        
        http:Response response = new;
        response.statusCode = 302;
        response.setHeader("Location", s3Url);
        response.setHeader("Cache-Control", "public, max-age=3600");
        
        return response;
    }

    // Upload image endpoint (standalone)
    resource function post upload\-image(http:Request request) returns json|http:InternalServerError|http:BadRequest {
        mime:Entity[]|http:ClientError bodyParts = request.getBodyParts();
        if bodyParts is http:ClientError {
            http:BadRequest badRequestResponse = {
                body: {"error": "Failed to parse multipart data"}
            };
            return badRequestResponse;
        }

        byte[]? imageBytes = ();
        string? imageContentType = ();
        
        foreach mime:Entity part in bodyParts {
            mime:ContentDisposition|mime:HeaderUnavailableError cd = part.getContentDisposition();
            if cd is mime:ContentDisposition && cd.name == "image" {
                byte[]|mime:Error imgData = part.getByteArray();
                if imgData is byte[] {
                    imageBytes = imgData;
                    string|mime:HeaderUnavailableError imgContentType = part.getContentType();
                    if imgContentType is string {
                        imageContentType = imgContentType;
                    }
                }
            }
        }

        if imageBytes is () {
            http:BadRequest badRequestResponse = {
                body: {"error": "No image provided"}
            };
            return badRequestResponse;
        }

        [string, string]|error uploadResult = saveImageToS3(<byte[]>imageBytes, imageContentType ?: "image/jpeg");
        if uploadResult is error {
            http:InternalServerError errorResponse = {
                body: {"error": "Failed to upload image: " + uploadResult.message()}
            };
            return errorResponse;
        }

        [string, string] [imageUrl, imageS3Key] = uploadResult;

        json response = {
            "success": true,
            "imageUrl": imageUrl,
            "s3Key": imageS3Key,
            "message": "Image uploaded successfully"
        };
        return response;
    }
}

// Blog Post record type
type BlogPost record {
    string id;
    string title;
    string content;
    string author;
    string? category;
    string? tags;
    string? image_url;
    string? image_s3_key;
    string created_at;
    string updated_at;
    string status;
    int views = 0;
};

// Initialize database tables
function initializeDatabase() returns error? {
    // Create blog_posts table
    sql:ExecutionResult|sql:Error createTable = mysqlClient->execute(`
        CREATE TABLE IF NOT EXISTS blog_posts (
            id VARCHAR(255) PRIMARY KEY,
            title VARCHAR(500) NOT NULL,
            content TEXT NOT NULL,
            author VARCHAR(255) NOT NULL,
            category VARCHAR(100),
            tags TEXT,
            image_url VARCHAR(1000),
            image_s3_key VARCHAR(500),
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            status ENUM('draft', 'published', 'deleted') DEFAULT 'published',
            views INT DEFAULT 0,
            INDEX idx_created_at (created_at),
            INDEX idx_category (category),
            INDEX idx_author (author),
            INDEX idx_status (status)
        )
    `);

    if createTable is sql:Error {
        return error("Failed to create blog_posts table: " + createTable.message());
    }

    log:printInfo("✅ Database tables initialized successfully");
    return;
}

// Helper function to format datetime for MySQL compatibility
function getMySQLDateTime() returns string {
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

// Function to save image to S3
function saveImageToS3(byte[] imageBytes, string contentType) returns [string, string]|error {
    string extension = getFileExtension(contentType);
    string fileName = "blog_img_" + uuid:createType1AsString() + extension;
    string filePath = uploadDirectory + "/" + fileName;

    // Save to local storage first (backup)
    io:Error? writeResult = io:fileWriteBytes(filePath, imageBytes);
    if writeResult is io:Error {
        log:printWarn("Failed to save image locally: " + writeResult.message());
    }

    // Upload to S3
    string s3Key = "blog-images/" + fileName;
    string|error s3Result = uploadToS3WithCLI(filePath, s3Key, contentType);
    
    if s3Result is string {
        string s3Url = string `https://${bucketName}.s3.${awsRegion}.amazonaws.com/${s3Key}`;
        log:printInfo("Image uploaded to S3 successfully: " + s3Url);
        return [s3Url, s3Key];
    } else {
        return error("Failed to upload image to S3: " + s3Result.message());
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

// Helper function to determine file extension
function getFileExtension(string contentType) returns string {
    match contentType {
        "image/jpeg" => { return ".jpg"; }
        "image/png" => { return ".png"; }
        "image/gif" => { return ".gif"; }
        "image/webp" => { return ".webp"; }
        _ => { return ".jpg"; }
    }
}