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
configurable string database = "news_db";
configurable string awsRegion = "eu-north-1";
configurable string bucketName = "news-api-uploads";
configurable string uploadDirectory = "./uploads";
configurable int serverPort = 7087;

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
        
        log:printInfo("News System Backend initialized on port " + serverPort.toString());
        log:printInfo("Database: " + database + " | S3 Bucket: " + bucketName);
        log:printInfo("MySQL Status: Connected successfully");
    }
    
    // Health check endpoint
    resource function get health() returns json {
        string awsStatus = testAWSCLI();
        
        return {
            "status": "healthy",
            "service": "News System API",
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

    // ==================== NEWS POSTS ENDPOINTS ====================
    
    // Create new news post (Admin)
    resource function post admin/news(http:Request request) returns json|http:InternalServerError|http:BadRequest {
        log:printInfo("=== NEW NEWS POST CREATION REQUEST ===");
        
        // Check content type
        string|http:HeaderNotFoundError contentType = request.getContentType();
        if contentType is http:HeaderNotFoundError {
            return <http:BadRequest>{body: {"error": "Content-Type header is required"}};
        }

        if !contentType.startsWith("multipart/form-data") {
            return <http:BadRequest>{body: {"error": "Content-Type must be multipart/form-data"}};
        }

        // Extract multipart data
        mime:Entity[]|http:ClientError bodyParts = request.getBodyParts();
        if bodyParts is http:ClientError {
            return <http:BadRequest>{body: {"error": "Failed to parse multipart data: " + bodyParts.message()}};
        }

        // Parse form data
        string title = "";
        string content = "";
        string author = "";
        string topic = "";
        string subject = "";
        string priority = "normal"; // low, normal, high, breaking
        string location = "";
        string newsSource = "";
        byte[]? imageBytes = ();
        string? imageContentType = ();
        byte[]? videoBytes = ();
        string? videoContentType = ();
        
        foreach mime:Entity part in bodyParts {
            mime:ContentDisposition|mime:HeaderUnavailableError cd = part.getContentDisposition();
            if cd is mime:ContentDisposition {
                string fieldName = cd.name;
                
                match fieldName {
                    "title" => {
                        string|mime:Error titleData = part.getText();
                        if titleData is string { title = titleData; }
                    }
                    "content" => {
                        string|mime:Error contentData = part.getText();
                        if contentData is string { content = contentData; }
                    }
                    "author" => {
                        string|mime:Error authorData = part.getText();
                        if authorData is string { author = authorData; }
                    }
                    "topic" => {
                        string|mime:Error topicData = part.getText();
                        if topicData is string { topic = topicData; }
                    }
                    "subject" => {
                        string|mime:Error subjectData = part.getText();
                        if subjectData is string { subject = subjectData; }
                    }
                    "priority" => {
                        string|mime:Error priorityData = part.getText();
                        if priorityData is string { priority = priorityData; }
                    }
                    "location" => {
                        string|mime:Error locationData = part.getText();
                        if locationData is string { location = locationData; }
                    }
                    "newsSource" => {
                        string|mime:Error newsSourceData = part.getText();
                        if newsSourceData is string { newsSource = newsSourceData; }
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
                    "video" => {
                        byte[]|mime:Error vidData = part.getByteArray();
                        if vidData is byte[] {
                            videoBytes = vidData;
                            string|mime:HeaderUnavailableError vidContentType = part.getContentType();
                            if vidContentType is string {
                                videoContentType = vidContentType;
                            }
                            log:printInfo("Video received: " + vidData.length().toString() + " bytes");
                        }
                    }
                }
            }
        }

        // Validate required fields
        if title.trim() == "" || content.trim() == "" || author.trim() == "" || topic.trim() == "" {
            return <http:BadRequest>{body: {"error": "Title, content, author, and topic are required fields"}};
        }

        // Handle media uploads to S3
        string? imageUrl = ();
        string? imageS3Key = ();
        string? videoUrl = ();
        string? videoS3Key = ();
        
        // Upload image if present
        if imageBytes is byte[] {
            [string, string]|error imgResult = saveMediaToS3(imageBytes, imageContentType ?: "image/jpeg", "images");
            if imgResult is [string, string] {
                [imageUrl, imageS3Key] = imgResult;
                log:printInfo("✅ Image uploaded to S3: " + (imageUrl ?: ""));
            } else {
                log:printError("❌ Failed to upload image to S3: " + imgResult.message());
                return <http:InternalServerError>{body: {"error": "Failed to upload image: " + imgResult.message()}};
            }
        }
        
        // Upload video if present
        if videoBytes is byte[] {
            [string, string]|error vidResult = saveMediaToS3(videoBytes, videoContentType ?: "video/mp4", "videos");
            if vidResult is [string, string] {
                [videoUrl, videoS3Key] = vidResult;
                log:printInfo("✅ Video uploaded to S3: " + (videoUrl ?: ""));
            } else {
                log:printError("❌ Failed to upload video to S3: " + vidResult.message());
                return <http:InternalServerError>{body: {"error": "Failed to upload video: " + vidResult.message()}};
            }
        }

        // Insert news post into database
        string newsId = uuid:createType1AsString();
        string currentTime = getMySQLDateTime();
        
        sql:ExecutionResult|sql:Error insertResult = mysqlClient->execute(`
            INSERT INTO news_posts (id, title, content, author, topic, subject, priority, location, news_source, 
                                   image_url, image_s3_key, video_url, video_s3_key, created_at, updated_at, status)
            VALUES (${newsId}, ${title}, ${content}, ${author}, ${topic}, ${subject}, ${priority}, ${location}, 
                   ${newsSource}, ${imageUrl}, ${imageS3Key}, ${videoUrl}, ${videoS3Key}, ${currentTime}, ${currentTime}, 'published')
        `);

        if insertResult is sql:Error {
            log:printError("Failed to insert news post: " + insertResult.message());
            return <http:InternalServerError>{body: {"error": "Failed to save news post: " + insertResult.message()}};
        }

        log:printInfo("✅ News post created successfully with ID: " + newsId);

        return {
            "success": true,
            "newsId": newsId,
            "title": title,
            "author": author,
            "topic": topic,
            "subject": subject,
            "priority": priority,
            "imageUrl": imageUrl,
            "videoUrl": videoUrl,
            "createdAt": currentTime,
            "message": "News post created successfully"
        };
    }

    // Get all news posts with pagination (Public)
    resource function get news(string? page, string? pageLimit, string? topic, string? subject, 
                              string? priority, string? author) returns json|http:InternalServerError {
        int pageNum = 1;
        int limitNum = 10;
        
        if page is string {
            int|error pageResult = int:fromString(page);
            if pageResult is int { pageNum = pageResult; }
        }
        
        if pageLimit is string {
            int|error limitResult = int:fromString(pageLimit);
            if limitResult is int { limitNum = limitResult; }
        }
        
        int offset = (pageNum - 1) * limitNum;

        // Build dynamic query based on filters
        sql:ParameterizedQuery countQuery;
        sql:ParameterizedQuery newsQuery;

        if topic is string && topic.trim() != "" {
            if subject is string && subject.trim() != "" {
                if priority is string && priority.trim() != "" {
                    if author is string && author.trim() != "" {
                        countQuery = `SELECT COUNT(*) as total FROM news_posts WHERE status = 'published' AND topic = ${topic} AND subject = ${subject} AND priority = ${priority} AND author LIKE ${"%" + author + "%"}`;
                        newsQuery = `SELECT * FROM news_posts WHERE status = 'published' AND topic = ${topic} AND subject = ${subject} AND priority = ${priority} AND author LIKE ${"%" + author + "%"} ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offset}`;
                    } else {
                        countQuery = `SELECT COUNT(*) as total FROM news_posts WHERE status = 'published' AND topic = ${topic} AND subject = ${subject} AND priority = ${priority}`;
                        newsQuery = `SELECT * FROM news_posts WHERE status = 'published' AND topic = ${topic} AND subject = ${subject} AND priority = ${priority} ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offset}`;
                    }
                } else {
                    if author is string && author.trim() != "" {
                        countQuery = `SELECT COUNT(*) as total FROM news_posts WHERE status = 'published' AND topic = ${topic} AND subject = ${subject} AND author LIKE ${"%" + author + "%"}`;
                        newsQuery = `SELECT * FROM news_posts WHERE status = 'published' AND topic = ${topic} AND subject = ${subject} AND author LIKE ${"%" + author + "%"} ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offset}`;
                    } else {
                        countQuery = `SELECT COUNT(*) as total FROM news_posts WHERE status = 'published' AND topic = ${topic} AND subject = ${subject}`;
                        newsQuery = `SELECT * FROM news_posts WHERE status = 'published' AND topic = ${topic} AND subject = ${subject} ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offset}`;
                    }
                }
            } else {
                if priority is string && priority.trim() != "" {
                    if author is string && author.trim() != "" {
                        countQuery = `SELECT COUNT(*) as total FROM news_posts WHERE status = 'published' AND topic = ${topic} AND priority = ${priority} AND author LIKE ${"%" + author + "%"}`;
                        newsQuery = `SELECT * FROM news_posts WHERE status = 'published' AND topic = ${topic} AND priority = ${priority} AND author LIKE ${"%" + author + "%"} ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offset}`;
                    } else {
                        countQuery = `SELECT COUNT(*) as total FROM news_posts WHERE status = 'published' AND topic = ${topic} AND priority = ${priority}`;
                        newsQuery = `SELECT * FROM news_posts WHERE status = 'published' AND topic = ${topic} AND priority = ${priority} ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offset}`;
                    }
                } else {
                    if author is string && author.trim() != "" {
                        countQuery = `SELECT COUNT(*) as total FROM news_posts WHERE status = 'published' AND topic = ${topic} AND author LIKE ${"%" + author + "%"}`;
                        newsQuery = `SELECT * FROM news_posts WHERE status = 'published' AND topic = ${topic} AND author LIKE ${"%" + author + "%"} ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offset}`;
                    } else {
                        countQuery = `SELECT COUNT(*) as total FROM news_posts WHERE status = 'published' AND topic = ${topic}`;
                        newsQuery = `SELECT * FROM news_posts WHERE status = 'published' AND topic = ${topic} ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offset}`;
                    }
                }
            }
        } else {
            if subject is string && subject.trim() != "" {
                if priority is string && priority.trim() != "" {
                    if author is string && author.trim() != "" {
                        countQuery = `SELECT COUNT(*) as total FROM news_posts WHERE status = 'published' AND subject = ${subject} AND priority = ${priority} AND author LIKE ${"%" + author + "%"}`;
                        newsQuery = `SELECT * FROM news_posts WHERE status = 'published' AND subject = ${subject} AND priority = ${priority} AND author LIKE ${"%" + author + "%"} ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offset}`;
                    } else {
                        countQuery = `SELECT COUNT(*) as total FROM news_posts WHERE status = 'published' AND subject = ${subject} AND priority = ${priority}`;
                        newsQuery = `SELECT * FROM news_posts WHERE status = 'published' AND subject = ${subject} AND priority = ${priority} ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offset}`;
                    }
                } else {
                    if author is string && author.trim() != "" {
                        countQuery = `SELECT COUNT(*) as total FROM news_posts WHERE status = 'published' AND subject = ${subject} AND author LIKE ${"%" + author + "%"}`;
                        newsQuery = `SELECT * FROM news_posts WHERE status = 'published' AND subject = ${subject} AND author LIKE ${"%" + author + "%"} ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offset}`;
                    } else {
                        countQuery = `SELECT COUNT(*) as total FROM news_posts WHERE status = 'published' AND subject = ${subject}`;
                        newsQuery = `SELECT * FROM news_posts WHERE status = 'published' AND subject = ${subject} ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offset}`;
                    }
                }
            } else {
                if priority is string && priority.trim() != "" {
                    if author is string && author.trim() != "" {
                        countQuery = `SELECT COUNT(*) as total FROM news_posts WHERE status = 'published' AND priority = ${priority} AND author LIKE ${"%" + author + "%"}`;
                        newsQuery = `SELECT * FROM news_posts WHERE status = 'published' AND priority = ${priority} AND author LIKE ${"%" + author + "%"} ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offset}`;
                    } else {
                        countQuery = `SELECT COUNT(*) as total FROM news_posts WHERE status = 'published' AND priority = ${priority}`;
                        newsQuery = `SELECT * FROM news_posts WHERE status = 'published' AND priority = ${priority} ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offset}`;
                    }
                } else {
                    if author is string && author.trim() != "" {
                        countQuery = `SELECT COUNT(*) as total FROM news_posts WHERE status = 'published' AND author LIKE ${"%" + author + "%"}`;
                        newsQuery = `SELECT * FROM news_posts WHERE status = 'published' AND author LIKE ${"%" + author + "%"} ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offset}`;
                    } else {
                        countQuery = `SELECT COUNT(*) as total FROM news_posts WHERE status = 'published'`;
                        newsQuery = `SELECT * FROM news_posts WHERE status = 'published' ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offset}`;
                    }
                }
            }
        }
        
        stream<record {int total;}, sql:Error?> countResult = mysqlClient->query(countQuery);
        int totalPosts = 0;
        error? countError = countResult.forEach(function(record {int total;} row) {
            totalPosts = row.total;
        });
        
        if countError is error {
            return <http:InternalServerError>{body: {"error": "Failed to count news posts: " + countError.message()}};
        }

        // Get news posts
        stream<NewsPost, sql:Error?> newsStream = mysqlClient->query(newsQuery);
        NewsPost[] newsPosts = [];
        error? collectError = newsStream.forEach(function(NewsPost news) {
            newsPosts.push(news);
        });

        if collectError is error {
            return <http:InternalServerError>{body: {"error": "Failed to fetch news posts: " + collectError.message()}};
        }

        int totalPages = (totalPosts + limitNum - 1) / limitNum;

        return {
            "success": true,
            "news": newsPosts.toJson(),
            "pagination": {
                "currentPage": pageNum,
                "totalPages": totalPages,
                "totalPosts": totalPosts,
                "pageLimit": limitNum,
                "hasNext": pageNum < totalPages,
                "hasPrev": pageNum > 1
            },
            "filters": {
                "topic": topic,
                "subject": subject,
                "priority": priority,
                "author": author
            }
        };
    }

    // Get single news post by ID (Public)
    resource function get news/[string newsId]() returns json|http:NotFound|http:InternalServerError {
        stream<NewsPost, sql:Error?> newsStream = mysqlClient->query(`
            SELECT * FROM news_posts WHERE id = ${newsId} AND status = 'published'
        `);

        NewsPost? news = ();
        error? collectError = newsStream.forEach(function(NewsPost n) {
            news = n;
        });

        if collectError is error {
            return <http:InternalServerError>{body: {"error": "Failed to fetch news post: " + collectError.message()}};
        }

        if news is () {
            return <http:NotFound>{body: {"error": "News post not found"}};
        }

        // Increment view count
        sql:ExecutionResult|sql:Error updateResult = mysqlClient->execute(`
            UPDATE news_posts SET views = views + 1 WHERE id = ${newsId}
        `);

        if updateResult is sql:Error {
            log:printWarn("Failed to update view count: " + updateResult.message());
        }

        return {
            "success": true,
            "news": news.toJson()
        };
    }

    // Get breaking news (Public)
    resource function get news/breaking() returns json|http:InternalServerError {
        stream<NewsPost, sql:Error?> newsStream = mysqlClient->query(`
            SELECT * FROM news_posts WHERE status = 'published' AND priority = 'breaking' 
            ORDER BY created_at DESC LIMIT 5
        `);

        NewsPost[] breakingNews = [];
        error? collectError = newsStream.forEach(function(NewsPost news) {
            breakingNews.push(news);
        });

        if collectError is error {
            return <http:InternalServerError>{body: {"error": "Failed to fetch breaking news: " + collectError.message()}};
        }

        return {
            "success": true,
            "breakingNews": breakingNews.toJson(),
            "count": breakingNews.length()
        };
    }

    // ==================== ADMIN ENDPOINTS ====================

    // Get all news posts for admin (includes drafts and deleted)
    resource function get admin/news(string? page, string? pageLimit, string? status) returns json|http:InternalServerError {
        int pageNum = 1;
        int limitNum = 20;
        
        if page is string {
            int|error pageResult = int:fromString(page);
            if pageResult is int { pageNum = pageResult; }
        }
        
        if pageLimit is string {
            int|error limitResult = int:fromString(pageLimit);
            if limitResult is int { limitNum = limitResult; }
        }
        
        int offset = (pageNum - 1) * limitNum;

        sql:ParameterizedQuery newsQuery;
        sql:ParameterizedQuery countQuery;
        
        if status is string && status.trim() != "" {
            newsQuery = `SELECT * FROM news_posts WHERE status = ${status} ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offset}`;
            countQuery = `SELECT COUNT(*) as total FROM news_posts WHERE status = ${status}`;
        } else {
            newsQuery = `SELECT * FROM news_posts ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offset}`;
            countQuery = `SELECT COUNT(*) as total FROM news_posts`;
        }

        // Get total count
        stream<record {int total;}, sql:Error?> countResult = mysqlClient->query(countQuery);
        int totalPosts = 0;
        error? countError = countResult.forEach(function(record {int total;} row) {
            totalPosts = row.total;
        });
        
        if countError is error {
            return <http:InternalServerError>{body: {"error": "Failed to count news posts: " + countError.message()}};
        }

        // Get news posts
        stream<NewsPost, sql:Error?> newsStream = mysqlClient->query(newsQuery);
        NewsPost[] newsPosts = [];
        error? collectError = newsStream.forEach(function(NewsPost news) {
            newsPosts.push(news);
        });

        if collectError is error {
            return <http:InternalServerError>{body: {"error": "Failed to fetch news posts: " + collectError.message()}};
        }

        int totalPages = (totalPosts + limitNum - 1) / limitNum;

        return {
            "success": true,
            "news": newsPosts.toJson(),
            "pagination": {
                "currentPage": pageNum,
                "totalPages": totalPages,
                "totalPosts": totalPosts,
                "pageLimit": limitNum,
                "hasNext": pageNum < totalPages,
                "hasPrev": pageNum > 1
            }
        };
    }

    // Update news post (Admin)
    resource function put admin/news/[string newsId](http:Request request) returns json|http:NotFound|http:InternalServerError|http:BadRequest {
        json|error payload = request.getJsonPayload();
        if payload is error {
            return <http:BadRequest>{body: {"error": "Invalid JSON payload"}};
        }

        // Check if news exists
        stream<NewsPost, sql:Error?> existingNews = mysqlClient->query(`
            SELECT id FROM news_posts WHERE id = ${newsId}
        `);

        boolean newsExists = false;
        error? checkError = existingNews.forEach(function(NewsPost news) {
            newsExists = true;
        });

        if checkError is error {
            return <http:InternalServerError>{body: {"error": "Failed to check news existence: " + checkError.message()}};
        }

        if !newsExists {
            return <http:NotFound>{body: {"error": "News post not found"}};
        }

        // Extract fields from payload
        string? title = extractStringFromJson(payload, "title");
        string? content = extractStringFromJson(payload, "content");
        string? topic = extractStringFromJson(payload, "topic");
        string? subject = extractStringFromJson(payload, "subject");
        string? priority = extractStringFromJson(payload, "priority");
        string? location = extractStringFromJson(payload, "location");
        string? newsSource = extractStringFromJson(payload, "newsSource");
        string? status = extractStringFromJson(payload, "status");
        
        string currentTime = getMySQLDateTime();

        // Create a dynamic update based on provided fields
        boolean fieldsUpdated = false;
        
        // Execute update using individual field updates
        if title is string {
            sql:ExecutionResult|sql:Error titleUpdate = mysqlClient->execute(`
                UPDATE news_posts SET title = ${title}, updated_at = ${currentTime} WHERE id = ${newsId}
            `);
            if titleUpdate is sql:Error {
                return <http:InternalServerError>{body: {"error": "Failed to update title: " + titleUpdate.message()}};
            }
            fieldsUpdated = true;
        }
        
        if content is string {
            sql:ExecutionResult|sql:Error contentUpdate = mysqlClient->execute(`
                UPDATE news_posts SET content = ${content}, updated_at = ${currentTime} WHERE id = ${newsId}
            `);
            if contentUpdate is sql:Error {
                return <http:InternalServerError>{body: {"error": "Failed to update content: " + contentUpdate.message()}};
            }
            fieldsUpdated = true;
        }
        
        if topic is string {
            sql:ExecutionResult|sql:Error topicUpdate = mysqlClient->execute(`
                UPDATE news_posts SET topic = ${topic}, updated_at = ${currentTime} WHERE id = ${newsId}
            `);
            if topicUpdate is sql:Error {
                return <http:InternalServerError>{body: {"error": "Failed to update topic: " + topicUpdate.message()}};
            }
            fieldsUpdated = true;
        }
        
        if subject is string {
            sql:ExecutionResult|sql:Error subjectUpdate = mysqlClient->execute(`
                UPDATE news_posts SET subject = ${subject}, updated_at = ${currentTime} WHERE id = ${newsId}
            `);
            if subjectUpdate is sql:Error {
                return <http:InternalServerError>{body: {"error": "Failed to update subject: " + subjectUpdate.message()}};
            }
            fieldsUpdated = true;
        }
        
        if priority is string {
            sql:ExecutionResult|sql:Error priorityUpdate = mysqlClient->execute(`
                UPDATE news_posts SET priority = ${priority}, updated_at = ${currentTime} WHERE id = ${newsId}
            `);
            if priorityUpdate is sql:Error {
                return <http:InternalServerError>{body: {"error": "Failed to update priority: " + priorityUpdate.message()}};
            }
            fieldsUpdated = true;
        }
        
        if location is string {
            sql:ExecutionResult|sql:Error locationUpdate = mysqlClient->execute(`
                UPDATE news_posts SET location = ${location}, updated_at = ${currentTime} WHERE id = ${newsId}
            `);
            if locationUpdate is sql:Error {
                return <http:InternalServerError>{body: {"error": "Failed to update location: " + locationUpdate.message()}};
            }
            fieldsUpdated = true;
        }
        
        if newsSource is string {
            sql:ExecutionResult|sql:Error sourceUpdate = mysqlClient->execute(`
                UPDATE news_posts SET news_source = ${newsSource}, updated_at = ${currentTime} WHERE id = ${newsId}
            `);
            if sourceUpdate is sql:Error {
                return <http:InternalServerError>{body: {"error": "Failed to update news source: " + sourceUpdate.message()}};
            }
            fieldsUpdated = true;
        }
        
        if status is string {
            sql:ExecutionResult|sql:Error statusUpdate = mysqlClient->execute(`
                UPDATE news_posts SET status = ${status}, updated_at = ${currentTime} WHERE id = ${newsId}
            `);
            if statusUpdate is sql:Error {
                return <http:InternalServerError>{body: {"error": "Failed to update status: " + statusUpdate.message()}};
            }
            fieldsUpdated = true;
        }

        // If no specific fields were updated, just update the timestamp
        if !fieldsUpdated {
            sql:ExecutionResult|sql:Error timestampUpdate = mysqlClient->execute(`
                UPDATE news_posts SET updated_at = ${currentTime} WHERE id = ${newsId}
            `);
            if timestampUpdate is sql:Error {
                return <http:InternalServerError>{body: {"error": "Failed to update timestamp: " + timestampUpdate.message()}};
            }
        }

        return {
            "success": true,
            "newsId": newsId,
            "updatedAt": currentTime,
            "message": "News post updated successfully"
        };
    }

    // Delete news post (Admin)
    resource function delete admin/news/[string newsId]() returns json|http:NotFound|http:InternalServerError {
        sql:ExecutionResult|sql:Error deleteResult = mysqlClient->execute(`
            UPDATE news_posts SET status = 'deleted', updated_at = ${getMySQLDateTime()} 
            WHERE id = ${newsId}
        `);

        if deleteResult is sql:Error {
            return <http:InternalServerError>{body: {"error": "Failed to delete news post: " + deleteResult.message()}};
        }

        sql:ExecutionResult result = <sql:ExecutionResult>deleteResult;
        if result.affectedRowCount == 0 {
            return <http:NotFound>{body: {"error": "News post not found"}};
        }

        return {
            "success": true,
            "newsId": newsId,
            "message": "News post deleted successfully"
        };
    }

    // ==================== TOPICS & SUBJECTS ENDPOINTS ====================

    // Get all topics
    resource function get topics() returns json|http:InternalServerError {
        stream<record {string topic; int count;}, sql:Error?> topicStream = mysqlClient->query(`
            SELECT topic, COUNT(*) as count FROM news_posts 
            WHERE status = 'published' AND topic IS NOT NULL AND topic != ''
            GROUP BY topic ORDER BY count DESC
        `);

        json[] topics = [];
        error? collectError = topicStream.forEach(function(record {string topic; int count;} topic) {
            topics.push({"topic": topic.topic, "count": topic.count});
        });

        if collectError is error {
            return <http:InternalServerError>{body: {"error": "Failed to fetch topics: " + collectError.message()}};
        }

        return {
            "success": true,
            "topics": topics
        };
    }

    // Get all subjects
    resource function get subjects() returns json|http:InternalServerError {
        stream<record {string subject; int count;}, sql:Error?> subjectStream = mysqlClient->query(`
            SELECT subject, COUNT(*) as count FROM news_posts 
            WHERE status = 'published' AND subject IS NOT NULL AND subject != ''
            GROUP BY subject ORDER BY count DESC
        `);

        json[] subjects = [];
        error? collectError = subjectStream.forEach(function(record {string subject; int count;} subject) {
            subjects.push({"subject": subject.subject, "count": subject.count});
        });

        if collectError is error {
            return <http:InternalServerError>{body: {"error": "Failed to fetch subjects: " + collectError.message()}};
        }

        return {
            "success": true,
            "subjects": subjects
        };
    }

    // ==================== SEARCH ENDPOINTS ====================

    // Search news posts
    resource function get search(string? q, string? topic, string? subject) returns json|http:InternalServerError {
        if q is () || q.trim() == "" {
            return {"success": true, "news": [], "message": "Please provide search query"};
        }

        string searchTerm = "%" + q + "%";
        sql:ParameterizedQuery searchQuery;
        
        if topic is string && topic.trim() != "" && subject is string && subject.trim() != "" {
            searchQuery = `SELECT * FROM news_posts WHERE status = 'published' AND topic = ${topic} AND subject = ${subject} 
                          AND (title LIKE ${searchTerm} OR content LIKE ${searchTerm}) ORDER BY created_at DESC LIMIT 20`;
        } else if topic is string && topic.trim() != "" {
            searchQuery = `SELECT * FROM news_posts WHERE status = 'published' AND topic = ${topic} 
                          AND (title LIKE ${searchTerm} OR content LIKE ${searchTerm}) ORDER BY created_at DESC LIMIT 20`;
        } else if subject is string && subject.trim() != "" {
            searchQuery = `SELECT * FROM news_posts WHERE status = 'published' AND subject = ${subject} 
                          AND (title LIKE ${searchTerm} OR content LIKE ${searchTerm}) ORDER BY created_at DESC LIMIT 20`;
        } else {
            searchQuery = `SELECT * FROM news_posts WHERE status = 'published' 
                          AND (title LIKE ${searchTerm} OR content LIKE ${searchTerm}) ORDER BY created_at DESC LIMIT 20`;
        }

        stream<NewsPost, sql:Error?> newsStream = mysqlClient->query(searchQuery);
        NewsPost[] newsPosts = [];
        error? collectError = newsStream.forEach(function(NewsPost news) {
            newsPosts.push(news);
        });

        if collectError is error {
            return <http:InternalServerError>{body: {"error": "Failed to search news posts: " + collectError.message()}};
        }

        return {
            "success": true,
            "news": newsPosts.toJson(),
            "searchQuery": q,
            "resultsCount": newsPosts.length(),
            "filters": {
                "topic": topic,
                "subject": subject
            }
        };
    }

    // ==================== MEDIA ENDPOINTS ====================

    // Serve images from S3 (redirect)
    resource function get images/[string fileName]() returns http:Response {
        string s3Url = string `https://${bucketName}.s3.${awsRegion}.amazonaws.com/news-images/${fileName}`;
        
        http:Response response = new;
        response.statusCode = 302;
        response.setHeader("Location", s3Url);
        response.setHeader("Cache-Control", "public, max-age=3600");
        
        return response;
    }

    // Serve videos from S3 (redirect)
    resource function get videos/[string fileName]() returns http:Response {
        string s3Url = string `https://${bucketName}.s3.${awsRegion}.amazonaws.com/news-videos/${fileName}`;
        
        http:Response response = new;
        response.statusCode = 302;
        response.setHeader("Location", s3Url);
        response.setHeader("Cache-Control", "public, max-age=3600");
        
        return response;
    }

    // Upload media endpoint (Admin)
    resource function post admin/upload\-media(http:Request request) returns json|http:InternalServerError|http:BadRequest {
        mime:Entity[]|http:ClientError bodyParts = request.getBodyParts();
        if bodyParts is http:ClientError {
            return <http:BadRequest>{body: {"error": "Failed to parse multipart data"}};
        }

        byte[]? mediaBytes = ();
        string? mediaContentType = ();
        string mediaType = "image";
        
        foreach mime:Entity part in bodyParts {
            mime:ContentDisposition|mime:HeaderUnavailableError cd = part.getContentDisposition();
            if cd is mime:ContentDisposition {
                if cd.name == "media" {
                    byte[]|mime:Error mediaData = part.getByteArray();
                    if mediaData is byte[] {
                        mediaBytes = mediaData;
                        string|mime:HeaderUnavailableError contentType = part.getContentType();
                        if contentType is string {
                            mediaContentType = contentType;
                            if contentType.startsWith("video/") {
                                mediaType = "video";
                            }
                        }
                    }
                }
            }
        }

        if mediaBytes is () {
            return <http:BadRequest>{body: {"error": "No media file provided"}};
        }

        string folderType = mediaType == "video" ? "videos" : "images";
        [string, string]|error uploadResult = saveMediaToS3(<byte[]>mediaBytes, mediaContentType ?: "application/octet-stream", folderType);
        
        if uploadResult is error {
            return <http:InternalServerError>{body: {"error": "Failed to upload media: " + uploadResult.message()}};
        }

        [string, string] [mediaUrl, mediaS3Key] = uploadResult;

        return {
            "success": true,
            "mediaUrl": mediaUrl,
            "s3Key": mediaS3Key,
            "mediaType": mediaType,
            "message": "Media uploaded successfully"
        };
    }

    // ==================== STATISTICS ENDPOINTS ====================

    // Get news statistics (Admin)
    resource function get admin/statistics() returns json|http:InternalServerError {
        // Total news count by status
        stream<record {string status; int count;}, sql:Error?> statusStream = mysqlClient->query(`
            SELECT status, COUNT(*) as count FROM news_posts GROUP BY status
        `);

        json[] statusStats = [];
        error? statusError = statusStream.forEach(function(record {string status; int count;} stat) {
            statusStats.push({"status": stat.status, "count": stat.count});
        });

        if statusError is error {
            return <http:InternalServerError>{body: {"error": "Failed to fetch status statistics: " + statusError.message()}};
        }

        // Top topics
        stream<record {string topic; int count;}, sql:Error?> topicStream = mysqlClient->query(`
            SELECT topic, COUNT(*) as count FROM news_posts 
            WHERE status = 'published' AND topic IS NOT NULL AND topic != ''
            GROUP BY topic ORDER BY count DESC LIMIT 10
        `);

        json[] topTopics = [];
        error? topicError = topicStream.forEach(function(record {string topic; int count;} topic) {
            topTopics.push({"topic": topic.topic, "count": topic.count});
        });

        if topicError is error {
            return <http:InternalServerError>{body: {"error": "Failed to fetch topic statistics: " + topicError.message()}};
        }

        // Recent activity (last 7 days)
        stream<record {string date; int count;}, sql:Error?> activityStream = mysqlClient->query(`
            SELECT DATE(created_at) as date, COUNT(*) as count 
            FROM news_posts 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY DATE(created_at) 
            ORDER BY date DESC
        `);

        json[] recentActivity = [];
        error? activityError = activityStream.forEach(function(record {string date; int count;} activity) {
            recentActivity.push({"date": activity.date, "count": activity.count});
        });

        if activityError is error {
            return <http:InternalServerError>{body: {"error": "Failed to fetch activity statistics: " + activityError.message()}};
        }

        // Total views
        stream<record {int total_views;}, sql:Error?> viewStream = mysqlClient->query(`
            SELECT SUM(views) as total_views FROM news_posts WHERE status = 'published'
        `);

        int totalViews = 0;
        error? viewError = viewStream.forEach(function(record {int total_views;} view) {
            totalViews = view.total_views;
        });

        if viewError is error {
            return <http:InternalServerError>{body: {"error": "Failed to fetch view statistics: " + viewError.message()}};
        }

        return {
            "success": true,
            "statistics": {
                "statusBreakdown": statusStats,
                "topTopics": topTopics,
                "recentActivity": recentActivity,
                "totalViews": totalViews
            }
        };
    }
}

// News Post record type
type NewsPost record {
    string id;
    string title;
    string content;
    string author;
    string? topic;
    string? subject;
    string priority; // low, normal, high, breaking
    string? location;
    string? news_source;
    string? image_url;
    string? image_s3_key;
    string? video_url;
    string? video_s3_key;
    string created_at;
    string updated_at;
    string status; // draft, published, deleted
    int views = 0;
};

// Initialize database tables
function initializeDatabase() returns error? {
    // Create news_posts table
    sql:ExecutionResult|sql:Error createNewsTable = mysqlClient->execute(`
        CREATE TABLE IF NOT EXISTS news_posts (
            id VARCHAR(255) PRIMARY KEY,
            title VARCHAR(500) NOT NULL,
            content TEXT NOT NULL,
            author VARCHAR(255) NOT NULL,
            topic VARCHAR(100),
            subject VARCHAR(100),
            priority ENUM('low', 'normal', 'high', 'breaking') DEFAULT 'normal',
            location VARCHAR(255),
            news_source VARCHAR(255),
            image_url VARCHAR(1000),
            image_s3_key VARCHAR(500),
            video_url VARCHAR(1000),
            video_s3_key VARCHAR(500),
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            status ENUM('draft', 'published', 'deleted') DEFAULT 'published',
            views INT DEFAULT 0,
            INDEX idx_created_at (created_at),
            INDEX idx_topic (topic),
            INDEX idx_subject (subject),
            INDEX idx_priority (priority),
            INDEX idx_author (author),
            INDEX idx_status (status),
            INDEX idx_location (location),
            FULLTEXT(title, content)
        ) ENGINE=InnoDB
    `);

    if createNewsTable is sql:Error {
        return error("Failed to create news_posts table: " + createNewsTable.message());
    }

    // Create news_topics table for predefined topics
    sql:ExecutionResult|sql:Error createTopicsTable = mysqlClient->execute(`
        CREATE TABLE IF NOT EXISTS news_topics (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL UNIQUE,
            description TEXT,
            color VARCHAR(7), -- Hex color code
            icon VARCHAR(50),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            status ENUM('active', 'inactive') DEFAULT 'active',
            INDEX idx_name (name),
            INDEX idx_status (status)
        ) ENGINE=InnoDB
    `);

    if createTopicsTable is sql:Error {
        return error("Failed to create news_topics table: " + createTopicsTable.message());
    }

    // Create news_subjects table for predefined subjects
    sql:ExecutionResult|sql:Error createSubjectsTable = mysqlClient->execute(`
        CREATE TABLE IF NOT EXISTS news_subjects (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL UNIQUE,
            description TEXT,
            topic_id INT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            status ENUM('active', 'inactive') DEFAULT 'active',
            FOREIGN KEY (topic_id) REFERENCES news_topics(id) ON DELETE SET NULL,
            INDEX idx_name (name),
            INDEX idx_topic_id (topic_id),
            INDEX idx_status (status)
        ) ENGINE=InnoDB
    `);

    if createSubjectsTable is sql:Error {
        return error("Failed to create news_subjects table: " + createSubjectsTable.message());
    }

    // Insert default topics if they don't exist
    sql:ExecutionResult|sql:Error insertTopics = mysqlClient->execute(`
        INSERT IGNORE INTO news_topics (name, description, color, icon) VALUES
        ('Politics', 'Political news and government affairs', '#FF6B6B', 'government'),
        ('Technology', 'Tech news, innovations and digital trends', '#4ECDC4', 'laptop'),
        ('Sports', 'Sports news, matches and athletic events', '#45B7D1', 'trophy'),
        ('Business', 'Business, economy and financial news', '#96CEB4', 'briefcase'),
        ('Health', 'Health, medical and wellness news', '#FFEAA7', 'heart'),
        ('Environment', 'Environmental and climate news', '#81ECEC', 'leaf'),
        ('Entertainment', 'Entertainment, celebrity and cultural news', '#FD79A8', 'film'),
        ('Education', 'Education and academic news', '#FDCB6E', 'book'),
        ('Crime', 'Crime, law enforcement and legal news', '#E17055', 'shield'),
        ('International', 'World news and international affairs', '#74B9FF', 'globe')
    `);

    if insertTopics is sql:Error {
        log:printWarn("Failed to insert default topics: " + insertTopics.message());
    }

    // Insert default subjects if they don't exist
    sql:ExecutionResult|sql:Error insertSubjects = mysqlClient->execute(`
        INSERT IGNORE INTO news_subjects (name, description) VALUES
        ('Breaking News', 'Urgent and developing news stories'),
        ('Local News', 'News from local communities and regions'),
        ('National News', 'News from across the country'),
        ('World News', 'International news and global events'),
        ('Weather', 'Weather updates and climate information'),
        ('Traffic', 'Traffic updates and transportation news'),
        ('Economy', 'Economic trends and financial markets'),
        ('Innovation', 'New technologies and scientific breakthroughs'),
        ('Social Issues', 'Social problems and community concerns'),
        ('Culture', 'Cultural events and artistic developments')
    `);

    if insertSubjects is sql:Error {
        log:printWarn("Failed to insert default subjects: " + insertSubjects.message());
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

// Function to save media to S3
function saveMediaToS3(byte[] mediaBytes, string contentType, string mediaType) returns [string, string]|error {
    string extension = getFileExtension(contentType, mediaType);
    string fileName = "news_" + mediaType + "_" + uuid:createType1AsString() + extension;
    string filePath = uploadDirectory + "/" + fileName;

    // Save to local storage first (backup)
    io:Error? writeResult = io:fileWriteBytes(filePath, mediaBytes);
    if writeResult is io:Error {
        log:printWarn("Failed to save media locally: " + writeResult.message());
    }

    // Upload to S3
    string s3Key = "news-" + mediaType + "/" + fileName;
    string|error s3Result = uploadToS3WithCLI(filePath, s3Key, contentType);
    
    if s3Result is string {
        string s3Url = string `https://${bucketName}.s3.${awsRegion}.amazonaws.com/${s3Key}`;
        log:printInfo("Media uploaded to S3 successfully: " + s3Url);
        return [s3Url, s3Key];
    } else {
        return error("Failed to upload media to S3: " + s3Result.message());
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
function getFileExtension(string contentType, string mediaType) returns string {
    if mediaType == "video" {
        match contentType {
            "video/mp4" => { return ".mp4"; }
            "video/avi" => { return ".avi"; }
            "video/mov" => { return ".mov"; }
            "video/wmv" => { return ".wmv"; }
            "video/webm" => { return ".webm"; }
            _ => { return ".mp4"; }
        }
    } else {
        match contentType {
            "image/jpeg" => { return ".jpg"; }
            "image/png" => { return ".png"; }
            "image/gif" => { return ".gif"; }
            "image/webp" => { return ".webp"; }
            "image/bmp" => { return ".bmp"; }
            _ => { return ".jpg"; }
        }
    }
}

// Helper function to extract string from JSON
function extractStringFromJson(json payload, string key) returns string? {
    if payload is map<json> {
        json|error value = payload[key];
        if value is json && value is string {
            return value;
        }
    }
    return ();
}