import ballerina/http;
import ballerina/log;

// API Key from configuration
configurable string apiKey = "api_live_Oim25A0rA7d6EIenCLLvxRGBUy6AU4fHwUOCOxueQa2UdVqErU";

// Enable CORS
@http:ServiceConfig {
    cors: {
        allowOrigins: ["*"]
    }
}
service / on new http:Listener(8060) {

    resource function get news() returns json|error {
        log:printInfo("Received request for WarAID news");

        // Create HTTP client with base URL
        http:Client apiTubeClient = check new ("https://api.apitube.io", {
            timeout: 60
        });

        // API headers
        map<string> headers = {
            "x-api-key": apiKey
        };

        // API query parameters
        string queryParams = "/v1/news/everything?title=technology&language.code=en&per_page=10";

        log:printInfo("Sending request to API Tube");

        // Send GET request
        http:Response|error response = apiTubeClient->get(queryParams, headers);
        if (response is error) {
            log:printError("Error calling API Tube", 'error = response);
            return error("Failed to fetch news: " + response.message());
        }

        // Handle response
        if (response.statusCode == 200) {
            log:printInfo("Successful response from API Tube");

            json|error jsonResponse = response.getJsonPayload();
            if (jsonResponse is error) {
                log:printError("Error parsing JSON response", 'error = jsonResponse);
                return error("Failed to parse news data");
            }
            return jsonResponse;
        } else {
            log:printError("API Tube returned HTTP error", statusCode = response.statusCode);
            return error("Failed to fetch news: HTTP " + response.statusCode.toString());
        }
    }
}
