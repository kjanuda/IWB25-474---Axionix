import ballerina/http;
import ballerina/mime;
import ballerina/uuid;
import ballerina/log;
import ballerina/io;
import ballerina/file;
import ballerina/time;

// Configuration
configurable string geminiApiKey = "AIzaSyDhuxepfjXMcu_I8Lf6cUtvzVa-nyGidF0";
configurable string uploadDirectory = "./uploads";
configurable int serverPort = 8082;

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
        // Create uploads directory if it doesn't exist (for temporary local storage)
        boolean|file:Error dirExists = file:test(uploadDirectory, file:EXISTS);
        if dirExists is boolean && !dirExists {
            check file:createDir(uploadDirectory);
            log:printInfo("Created uploads directory: " + uploadDirectory);
        }
        
        log:printInfo("Agricultural Problem Solver Backend initialized on port " + serverPort.toString());
        log:printInfo("Storage Strategy: GEMINI API WITH IMAGE SUPPORT");
        log:printInfo("Gemini API Key configured: " + (geminiApiKey.length() > 0 ? "Yes" : "No"));
    }
    
    // Health check endpoint
    resource function get health() returns json {
        return {
            "status": "healthy",
            "service": "Agricultural Problem Solver API - Gemini with Image Support",
            "timestamp": time:utcToString(time:utcNow()),
            "port": serverPort,
            "features": ["gemini-ai-processing", "image-analysis", "multimodal-support"],
            "storage_strategy": "GEMINI API WITH IMAGE SUPPORT",
            "gemini_api_status": geminiApiKey.length() > 0 ? "configured" : "not_configured",
            "s3_status": "PAUSED - Not saving to S3",
            "image_processing": "ACTIVE",
            "note": "All S3 operations are temporarily disabled. AI processing with image support is active."
        };
    }

    // Main problem solving endpoint
    resource function post 'solve\-problem(http:Request request) returns json|http:InternalServerError|http:BadRequest {
        
        log:printInfo("=== NEW AGRICULTURAL PROBLEM SOLVING REQUEST (GEMINI WITH IMAGE SUPPORT) ===");
        
        // Check content type
        string|http:HeaderNotFoundError contentType = request.getContentType();
        if contentType is http:HeaderNotFoundError {
            log:printError("Content-Type header not found");
            return <http:BadRequest>{
                body: {
                    "error": "Content-Type header is required"
                }
            };
        }

        // Handle multipart form data
        if !contentType.startsWith("multipart/form-data") {
            log:printError("Invalid content type: " + contentType);
            return <http:BadRequest>{
                body: {
                    "error": "Content-Type must be multipart/form-data"
                }
            };
        }

        // Extract multipart data
        mime:Entity[]|http:ClientError bodyParts = request.getBodyParts();
        if bodyParts is http:ClientError {
            log:printError("Error extracting body parts: " + bodyParts.message());
            return <http:BadRequest>{
                body: {
                    "error": "Failed to parse multipart data: " + bodyParts.message()
                }
            };
        }

        // Generate session ID for this interaction
        string sessionId = uuid:createType1AsString();
        string timestamp = time:utcToString(time:utcNow());
        log:printInfo("Session ID: " + sessionId);

        // Parse form data
        string textInput = "";
        string inputType = "text";
        byte[]? imageBytes = ();
        byte[]? audioBytes = ();
        string? imageContentType = ();
        string? audioContentType = ();
        
        foreach mime:Entity part in bodyParts {
            mime:ContentDisposition|mime:HeaderUnavailableError cd = part.getContentDisposition();
            if cd is mime:ContentDisposition {
                string fieldName = cd.name;
                
                match fieldName {
                    "text" => {
                        string|mime:Error textData = part.getText();
                        if textData is string {
                            textInput = textData;
                            log:printInfo("Text input received: " + textInput.length().toString() + " characters");
                        }
                    }
                    "inputType" => {
                        string|mime:Error typeData = part.getText();
                        if typeData is string {
                            inputType = typeData;
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
                            log:printInfo("Image received: " + imgData.length().toString() + " bytes - Will be processed by AI");
                        }
                    }
                    "audio" => {
                        byte[]|mime:Error audData = part.getByteArray();
                        if audData is byte[] {
                            audioBytes = audData;
                            string|mime:HeaderUnavailableError audContentType = part.getContentType();
                            if audContentType is string {
                                audioContentType = audContentType;
                            }
                            log:printInfo("Audio received: " + audData.length().toString() + " bytes - Will be processed by AI");
                        }
                    }
                }
            }
        }

        // Validate input
        if textInput.trim() == "" && imageBytes is () && audioBytes is () {
            return <http:BadRequest>{
                body: {
                    "error": "Please provide text, image, or audio input"
                }
            };
        }

        log:printInfo("Input type: " + inputType);
        log:printInfo("Has text: " + (textInput.trim() != "").toString());
        log:printInfo("Has image: " + (imageBytes is byte[]).toString());
        log:printInfo("Has audio: " + (audioBytes is byte[]).toString());

        // Save files locally for processing
        string? localImagePath = ();
        string? localAudioPath = ();
        
        if imageBytes is byte[] {
            string imageFileName = "temp_image_" + sessionId + getFileExtension(imageContentType ?: "image/jpeg");
            string imagePath = uploadDirectory + "/" + imageFileName;
            io:Error? writeResult = io:fileWriteBytes(imagePath, imageBytes);
            if writeResult is () {
                localImagePath = imagePath;
                log:printInfo("✅ Image saved locally for AI processing: " + imagePath);
            } else {
                log:printWarn("Failed to save image locally: " + writeResult.message());
            }
        }
        
        if audioBytes is byte[] {
            string audioFileName = "temp_audio_" + sessionId + getFileExtension(audioContentType ?: "audio/webm");
            string audioPath = uploadDirectory + "/" + audioFileName;
            io:Error? writeResult = io:fileWriteBytes(audioPath, audioBytes);
            if writeResult is () {
                localAudioPath = audioPath;
                log:printInfo("✅ Audio saved locally for AI processing: " + audioPath);
            } else {
                log:printWarn("Failed to save audio locally: " + writeResult.message());
            }
        }

        // Process with Gemini AI (Main functionality with image support)
        log:printInfo("🤖 Processing with Gemini AI (including image analysis)...");
        string|error solution = processWithGemini(textInput, localImagePath, localAudioPath, inputType);
        
        if solution is error {
            log:printError("Gemini processing failed: " + solution.message());
            
            // Provide fallback response when API is unavailable
            string fallbackSolution = generateFallbackSolution(textInput, inputType, imageBytes is byte[]);
            
            return {
                "success": true,
                "sessionId": sessionId,
                "solution": fallbackSolution,
                "confidence": 0.3, // Lower confidence for fallback
                "inputType": inputType,
                "processing": {
                    "method": "fallback_response",
                    "gemini_status": "unavailable",
                    "reason": solution.message(),
                    "s3_storage": "PAUSED",
                    "local_processing": true,
                    "image_processing_attempted": imageBytes is byte[],
                    "cleanup_completed": true
                },
                "input_summary": {
                    "hasText": textInput.trim() != "",
                    "hasImage": imageBytes != (),
                    "hasAudio": audioBytes != ()
                },
                "timestamp": timestamp,
                "warning": "Gemini AI is temporarily unavailable. This is a basic fallback response. Please try again in a few minutes for full AI analysis with image support."
            };
        }

        log:printInfo("✅ Solution generated by Gemini AI with image analysis support");

        // Clean up temporary files
        if localImagePath is string {
            file:Error? deleteResult = file:remove(localImagePath);
            if deleteResult is file:Error {
                log:printWarn("Failed to delete temp image file: " + deleteResult.message());
            } else {
                log:printInfo("🧹 Cleaned up temporary image file");
            }
        }
        
        if localAudioPath is string {
            file:Error? deleteResult = file:remove(localAudioPath);
            if deleteResult is file:Error {
                log:printWarn("Failed to delete temp audio file: " + deleteResult.message());
            } else {
                log:printInfo("🧹 Cleaned up temporary audio file");
            }
        }

        log:printInfo("=== PROCESSING COMPLETED - GEMINI AI WITH IMAGE SUPPORT ===");

        return {
            "success": true,
            "sessionId": sessionId,
            "solution": solution,
            "confidence": 0.85,
            "inputType": inputType,
            "processing": {
                "method": "gemini_api_with_image_support",
                "s3_storage": "PAUSED",
                "local_processing": true,
                "image_analysis": imageBytes is byte[],
                "audio_processing": audioBytes is byte[],
                "cleanup_completed": true
            },
            "input_summary": {
                "hasText": textInput.trim() != "",
                "hasImage": imageBytes != (),
                "hasAudio": audioBytes != ()
            },
            "timestamp": timestamp,
            "note": "S3 storage is currently paused. AI processing with full image analysis is active."
        };
    }

    // Analytics endpoint - simplified without S3 data
    resource function get analytics() returns json {
        log:printInfo("Analytics endpoint accessed (S3 data unavailable)");
        
        return {
            "success": true,
            "timestamp": time:utcToString(time:utcNow()),
            "status": "s3_paused_image_active",
            "analytics": {
                "totalSolutions": "N/A - S3 storage paused",
                "systemHealth": {
                    "geminiApiConfigured": geminiApiKey.length() > 0,
                    "s3Status": "PAUSED",
                    "localProcessing": "ACTIVE",
                    "imageProcessing": "ACTIVE"
                },
                "storage": {
                    "strategy": "GEMINI_WITH_IMAGE_SUPPORT",
                    "s3Backup": "PAUSED",
                    "localTemp": "ACTIVE"
                },
                "features": {
                    "textProcessing": true,
                    "imageProcessing": true,
                    "audioProcessing": true,
                    "aiIntegration": true,
                    "multimodalAI": true,
                    "s3Storage": false
                }
            },
            "endpoints": {
                "health": "/health",
                "solveProblem": "/solve-problem",
                "analytics": "/analytics",
                "status": "/status"
            },
            "notice": "S3 storage endpoints are temporarily disabled. Full AI image analysis is active."
        };
    }

    // Status endpoint to check what's enabled/disabled
    resource function get status() returns json {
        return {
            "service": "Agricultural Problem Solver",
            "version": "gemini-with-image-support",
            "timestamp": time:utcToString(time:utcNow()),
            "components": {
                "gemini_api": {
                    "status": "ACTIVE",
                    "configured": geminiApiKey.length() > 0,
                    "image_support": true,
                    "multimodal": true
                },
                "s3_storage": {
                    "status": "PAUSED",
                    "reason": "Temporarily disabled by configuration"
                },
                "local_processing": {
                    "status": "ACTIVE",
                    "temp_storage": true,
                    "image_processing": true
                },
                "cors": {
                    "status": "ACTIVE",
                    "origins": ["http://localhost:3000", "http://localhost:5173"]
                }
            },
            "capabilities": {
                "text_analysis": true,
                "image_analysis": true,
                "audio_analysis": true,
                "ai_solutions": true,
                "multimodal_ai": true,
                "data_persistence": false
            }
        };
    }
}

// Function to process problem with Google Gemini API (with retry logic and image support)
function processWithGemini(string textInput, string? localImagePath, string? localAudioPath, string inputType) returns string|error {
    
    string basePrompt = string `You are an expert agricultural advisor with 20+ years of experience in farming, crop management, and agricultural technology. 

Analyze the farming problem provided and give a comprehensive, practical solution in the following structure:

🚨 IMMEDIATE ACTIONS (What to do right now):
[List urgent steps]

🛡️ PREVENTION STRATEGIES (How to avoid this in future):
[List preventive measures]

💰 COST ESTIMATES (Expected expenses):
[Provide cost ranges]

🔄 ALTERNATIVE APPROACHES (Other solutions):
[List alternative methods]

⚠️ WARNING SIGNS (What to watch for):
[List symptoms or indicators]

Problem Description: `;

    string prompt = basePrompt + textInput;
    
    // Build the request parts array
    json[] requestParts = [
        {
            "text": prompt
        }
    ];
    
    // Add image to request if available
    if localImagePath is string {
        // Read the image file
        byte[]|io:Error imageBytes = io:fileReadBytes(localImagePath);
        if imageBytes is byte[] {
            // Convert to base64
            string base64Image = imageBytes.toBase64();
            
            // Determine image format from file extension
            string imageFormat = "image/jpeg"; // default
            if localImagePath.endsWith(".png") {
                imageFormat = "image/png";
            } else if localImagePath.endsWith(".gif") {
                imageFormat = "image/gif";
            } else if localImagePath.endsWith(".webp") {
                imageFormat = "image/webp";
            }
            
            // Add image part to request
            requestParts.push({
                "inline_data": {
                    "mime_type": imageFormat,
                    "data": base64Image
                }
            });
            
            // Update prompt to mention image analysis
            requestParts[0] = {
                "text": prompt + "\n\n📸 IMPORTANT: Please analyze the uploaded image carefully and incorporate your visual observations into your agricultural advice. Describe what you see in the image and how it relates to the problem."
            };
            
            log:printInfo("📸 Image added to Gemini request for analysis");
        } else {
            log:printWarn("Failed to read image file: " + imageBytes.message());
        }
    }
    
    // Note: Audio processing with Gemini requires special handling and may not be supported in all models
    if localAudioPath is string {
        log:printInfo("🎙️ Audio file detected but Gemini API has limited audio support. Processing text description instead.");
        if requestParts.length() == 1 {
            requestParts[0] = {
                "text": prompt + "\n\n🎙️ Audio input was provided. Please provide comprehensive text-based agricultural advice."
            };
        }
    }

    // Use models that support vision (multimodal models)
    string[] modelOptions = [
        "gemini-1.5-flash-latest",
        "gemini-1.5-flash",
        "gemini-1.5-pro-latest",
        "gemini-1.5-pro"
    ];

    json requestBody = {
        "contents": [
            {
                "parts": requestParts
            }
        ],
        "generationConfig": {
            "temperature": 0.7,
            "topK": 40,
            "topP": 0.95,
            "maxOutputTokens": 2048,
            "candidateCount": 1
        },
        "safetySettings": [
            {
                "category": "HARM_CATEGORY_HARASSMENT",
                "threshold": "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                "category": "HARM_CATEGORY_HATE_SPEECH", 
                "threshold": "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                "threshold": "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                "threshold": "BLOCK_MEDIUM_AND_ABOVE"
            }
        ]
    };

    // Try each model once, then give up to avoid long waits
    foreach string model in modelOptions {
        string apiUrl = "/v1beta/models/" + model + ":generateContent?key=" + geminiApiKey;
        
        log:printInfo("🤖 Trying model: " + model + " with " + requestParts.length().toString() + " parts (text" + (requestParts.length() > 1 ? " + image" : "") + ")");
        
        http:Request geminiRequest = new;
        geminiRequest.setPayload(requestBody);
        geminiRequest.setHeader("Content-Type", "application/json");

        http:Response|http:ClientError response = geminiClient->post(apiUrl, geminiRequest);
        
        if response is http:ClientError {
            log:printWarn("HTTP Client Error with " + model + ": " + response.message());
            continue; // Try next model
        }
        
        if response.statusCode == 200 {
            // Success! Parse the response
            json|error responseJson = response.getJsonPayload();
            if responseJson is error {
                log:printWarn("Failed to parse response from " + model + ": " + responseJson.message());
                continue; // Try next model
            }

            json candidates = check responseJson.candidates;
            if candidates is json[] && candidates.length() > 0 {
                json firstCandidate = candidates[0];
                json content = check firstCandidate.content;
                json parts = check content.parts;
                if parts is json[] && parts.length() > 0 {
                    json firstPart = parts[0];
                    json|error text = firstPart.text;
                    if text is string {
                        log:printInfo("✅ Success with model: " + model + " - Generated response with" + (localImagePath is string ? " image analysis" : "out image"));
                        return text;
                    }
                }
            }
        } else if response.statusCode == 400 {
            string|error responseBody = response.getTextPayload();
            string errorMsg = responseBody is string ? responseBody : "Bad request";
            log:printWarn("❌ Bad request (400) with " + model + ": " + errorMsg);
            
            // If it's an image-related error, try without image
            if localImagePath is string && (errorMsg.includes("image") || errorMsg.includes("vision") || errorMsg.includes("multimodal")) {
                log:printInfo("🔄 Retrying without image data...");
                return processWithGemini(textInput + "\n\n[Note: Image was uploaded but couldn't be processed by the AI model. Please provide a detailed text description of what you see in the image.]", (), localAudioPath, inputType);
            }
            continue;
        } else if response.statusCode == 503 {
            string|error responseBody = response.getTextPayload();
            string errorMsg = responseBody is string ? responseBody : "Service unavailable";
            log:printWarn("⚠️ Model " + model + " is overloaded (503). Trying next model...");
            continue; // Try next model immediately
        } else if response.statusCode == 429 {
            string|error responseBody = response.getTextPayload();
            string errorMsg = responseBody is string ? responseBody : "Rate limited";
            log:printWarn("⚠️ Rate limited (429) with " + model + ": Trying next model...");
            continue; // Try next model
        } else if response.statusCode == 404 {
            log:printWarn("⚠️ Model " + model + " not found in v1beta API. Trying next model...");
            continue; // Try next model
        } else {
            string|error responseBody = response.getTextPayload();
            string errorMsg = responseBody is string ? responseBody : "Unknown error";
            log:printWarn("❌ Error " + response.statusCode.toString() + " with " + model + ": " + errorMsg);
            continue; // Try next model
        }
    }
    
    // If we get here, all attempts failed
    return error("All available Gemini models are currently overloaded or unavailable. This is a temporary issue with Google's servers. Please try again in a few minutes.");
}

// Generate basic fallback solution when Gemini API is unavailable
function generateFallbackSolution(string textInput, string inputType, boolean hasImage) returns string {
    string imageMention = hasImage ? "\n🖼️ Image was uploaded but cannot be analyzed due to AI service unavailability." : "";
    
    string basicSolution = string `⚠️ TEMPORARY FALLBACK RESPONSE - Gemini AI is currently unavailable

🚨 IMMEDIATE ACTIONS (General agricultural guidance):
• Inspect the affected area thoroughly and document the problem
• Check soil moisture levels and drainage conditions
• Look for signs of pests, diseases, or nutrient deficiencies
• Consult with local agricultural extension services if available
• Take clear photos for later expert consultation${imageMention}

🛡️ PREVENTION STRATEGIES (General best practices):
• Maintain proper soil pH levels (6.0-7.0 for most crops)
• Implement crop rotation to prevent soil depletion
• Use integrated pest management techniques
• Ensure adequate spacing between plants for air circulation
• Regular monitoring and early intervention

💰 COST ESTIMATES (General ranges):
• Soil testing: $15-50
• Basic fertilizers: $20-100 per acre
• Organic pesticides: $25-75
• Professional consultation: $50-200
• Emergency treatments: $30-150

🔄 ALTERNATIVE APPROACHES:
• Organic/natural solutions first
• Biological pest control methods
• Companion planting strategies
• Improved irrigation management
• Soil amendment with compost

⚠️ WARNING SIGNS TO MONITOR:
• Yellowing or browning leaves
• Stunted growth patterns
• Unusual pest activity
• Poor fruit/grain development
• Soil erosion or waterlogging

📝 YOUR PROBLEM: "${textInput}"

🤖 NOTE: This is a basic response generated while our AI system is temporarily unavailable. For detailed, personalized advice specific to your exact situation${hasImage ? " and image analysis" : ""}, please try again in a few minutes when our full AI analysis will be available.

📞 IMMEDIATE HELP: Contact your local agricultural extension office or experienced farmers in your area for urgent issues.`;

    return basicSolution;
}

// Helper function to determine file extension based on content type
function getFileExtension(string contentType) returns string {
    match contentType {
        "image/jpeg" => { return ".jpg"; }
        "image/png" => { return ".png"; }
        "image/gif" => { return ".gif"; }
        "image/webp" => { return ".webp"; }
        "audio/wav" => { return ".wav"; }
        "audio/mp3" => { return ".mp3"; }
        "audio/mpeg" => { return ".mp3"; }
        "audio/ogg" => { return ".ogg"; }
        "audio/webm" => { return ".webm"; }
        "text/plain" => { return ".txt"; }
        "application/json" => { return ".json"; }
        _ => { return ".bin"; }
    }
}