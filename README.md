# Ecogreen360 🌱

**Smart IoT Greenhouse Management Platform with AI Integration**

Ecogreen360 is a comprehensive, cloud-native greenhouse management system that combines IoT sensors, AI-powered plant analysis, and real-time monitoring to make greenhouse farming accessible, efficient, and profitable for everyone.

## 🎯 Problem Statement

Traditional greenhouse farming faces several critical challenges:
- **Lack of guidance**: Beginners don't understand optimal growing conditions for different crops
- **High risk & uncertainty**: No clear ROI calculations or market price forecasting
- **Manual monitoring**: Time-consuming site visits for condition checks
- **Limited visualization**: Cannot preview greenhouse setup before investment
- **Accessibility issues**: Remote farmers lack tools for remote monitoring and control

## ✅ Our Solution

Ecogreen360 provides:
- **Clear guidance**: Crop-specific details with cost analysis and market forecasting
- **Risk reduction**: Informed decision-making with ROI calculations
- **Smart monitoring**: Real-time 3D greenhouse visualization
- **Pre-visualization**: Virtual 3D models before physical setup
- **Remote access**: Complete greenhouse management from anywhere

## 🏗️ System Architecture

### Core Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Backend Language** | Ballerina | Cloud-native programming for APIs and integration |
| **Primary Database** | MySQL | Greenhouse data, jobs, news, meetings |
| **IoT Database** | AWS DynamoDB | Real-time sensor data storage |
| **Document Database** | MongoDB | Contact management and customer projects |
| **Authentication** | Asgardio (WSO2) | User authentication with Google OAuth |
| **Cloud Storage** | AWS S3 | File uploads (resumes, logos, media) |
| **AI Integration** | Google Gemini API | Plant analysis and agricultural advice |
| **Image Service** | Unsplash API | Plant imagery |

### Port Configuration

```
Port 7071 - Main greenhouse management API
Port 8060 - News aggregation service
Port 8075 - Customer project management
Port 8081 - IoT sensor data collection
Port 8087 - Job portal API
Port 8091 - Contact management API
Port 7087 - News management system
Port 9095 - WebSocket for user notifications
Port 9096 - WebSocket for ESP32 communication
```

## 🌐 System Components

### 1. Greenhouse Management System (Port 7071)
**Database:** MySQL  
**Features:**
- Plant data management with AI analysis
- Real-time sensor monitoring
- Environmental controls (temperature, humidity, irrigation, lighting)
- Alert system with WebSocket notifications
- ESP32 device integration

**Key Libraries:**
```ballerina
ballerina/http - HTTP server functionality
ballerina/sql - Database operations
ballerinax/java.jdbc - JDBC connectivity
ballerinax/mysql.driver - MySQL driver
ballerina/websocket - Real-time communication
```

**Database Tables:**
- `ALERTS5` - System notifications
- `PlantData` - Plant information and care instructions
- `SensorData` - Historical sensor readings
- `EnvironmentalSettings` - Climate configurations
- `IrrigationSchedule` - Automated watering
- `LightingSchedule` - Automated lighting

### 2. IoT Sensor Data Collection (Port 8081)
**Database:** AWS DynamoDB (EU Stockholm)  
**Features:**
- Real-time data collection from ESP32 devices
- Environmental monitoring (temperature, humidity, soil moisture, CO₂, pH)
- 5-minute data collection intervals
- Historical data retrieval

### 3. Customer Project Management (Port 8075)
**Database:** MongoDB (localhost:27017)  
**Features:**
- Customer information processing
- Automated email notifications
- ESP32 OLED display updates
- PDF attachment handling
- Project workflow tracking

**Collections:**
- `customer` - Customer information
- `plant` - Plant assignment data

### 4. Job Portal System (Port 8087)
**Database:** MySQL (job_portal_db)  
**Features:**
- Job posting management
- Resume upload to AWS S3
- Application status tracking
- Email notifications for applicants
- Admin review panel

**Database Tables:**
- `job_postings` - Job details and company information
- `job_applications` - Candidate applications with resume links

### 5. News Management (Port 7087)
**Database:** MySQL (news_db)  
**Features:**
- Article creation and management
- Media upload to AWS S3
- Categorization system
- View tracking and analytics
- Full-text search

**Database Tables:**
- News posts with media attachments
- Topics and subjects for categorization
- View analytics

### 6. Contact Management (Port 8091)
**Database:** MongoDB (localhost:27017)  
**Features:**
- Contact form submissions
- Customer inquiry management
- CORS-enabled REST API

### 7. Meeting Scheduler (Unknown Port)
**Database:** PostgreSQL  
**Features:**
- Meeting request management
- Admin scheduling interface
- Email notifications with meeting links
- Status tracking (approve/reject/pending)

**Database Tables:**
- `meeting_requests` - UUID-based meeting data

### 8. News Aggregation Service (Port 8060)
**External API:** APITube  
**Features:**
- Technology news aggregation
- English content filtering
- 60-second timeout protection

### 9. AI Problem Solver
**AI Integration:** Google Gemini API  
**Features:**
- Multi-modal input support (text, image, audio)
- Agricultural expert advice
- Automatic model fallback
- File cleanup utilities

## 🔄 Real-Time Communication Flow

```
ESP32 Sensors → WebSocket (Port 9096) → Ballerina Backend → MySQL/DynamoDB
                                                    ↓
Frontend ← WebSocket (Port 9095) ← Alert System ← Data Analysis
                                                    ↓
                                          ESP32 Control Commands
```

## 🚀 Getting Started

### Prerequisites
- Ballerina runtime environment
- MySQL server
- MongoDB instance
- PostgreSQL (for meetings)
- AWS account (S3, DynamoDB)
- Google Gemini API key
- Unsplash API key
- ESP32 devices with sensors

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-username/ecogreen360.git
cd ecogreen360
```

2. **Database Setup**

**MySQL Databases:**
```sql
CREATE DATABASE greenhouse_db;
CREATE DATABASE job_portal_db;
CREATE DATABASE news_db;
```

**MongoDB Collections:**
```javascript
use ecogreen360
db.createCollection("customer")
db.createCollection("plant")
```

**PostgreSQL:**
```sql
CREATE DATABASE meeting_scheduler;
```

3. **Environment Configuration**
```toml
# Database configurations
MYSQL_HOST = "localhost"
MYSQL_PORT = 3306
MYSQL_USER = "your_username"
MYSQL_PASSWORD = "your_password"

MONGODB_URI = "mongodb://localhost:27017"
POSTGRES_URI = "postgresql://localhost:5432/meeting_scheduler"

# AWS Configuration
AWS_REGION = "eu-north-1"
AWS_S3_BUCKET = "jobportal-uploads1"
DYNAMODB_REGION = "eu-stockholm"

# API Keys
GEMINI_API_KEY = "your_gemini_api_key"
UNSPLASH_API_KEY = "your_unsplash_api_key"
APITUBE_API_KEY = "your_apitube_api_key"

# Email Configuration
SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_USERNAME = "your_email@gmail.com"
SMTP_PASSWORD = "your_app_password"
```

4. **Run Services**
```bash
# Start all microservices
bal run greenhouse-management.bal        # Port 7071
bal run iot-sensor-service.bal          # Port 8081
bal run customer-management.bal         # Port 8075
bal run job-portal.bal                  # Port 8087
bal run news-service.bal                # Port 7087
bal run contact-management.bal          # Port 8091
bal run news-aggregation.bal            # Port 8060
bal run meeting-scheduler.bal           # Meeting service
```

## 📱 Key Features

### 🌱 Smart Greenhouse Management
- **Crop Planning**: Enter crop name → Get cost analysis, timeline, market forecast
- **3D Visualization**: Virtual greenhouse preview before building
- **Real-time Monitoring**: Live sensor data from ESP32 devices
- **Automated Controls**: Smart irrigation, lighting, and climate control
- **Mobile Access**: Monitor and control from anywhere

### 🔬 IoT Integration
- **ESP32 Sensors**: Temperature, humidity, soil moisture, CO₂, pH monitoring
- **Real-time Data**: 5-minute collection intervals
- **Bidirectional Communication**: Commands sent back to devices
- **Emergency Controls**: Instant response to critical conditions

### 🤖 AI-Powered Features
- **Plant Analysis**: Google Gemini AI for expert agricultural advice
- **Problem Solving**: Multi-modal input (text, image, audio) for issue diagnosis
- **Market Forecasting**: Intelligent price predictions
- **Automated Responses**: Smart alert generation

### 👥 Complete Business Platform
- **Job Portal**: Full recruitment system with AWS S3 storage
- **News Management**: Content management with analytics
- **Meeting Scheduler**: Video conference integration
- **Contact System**: Customer inquiry management
- **Authentication**: Secure login with Google OAuth

## 🗄️ Database Schema

### MySQL Tables
```sql
-- Greenhouse Management
ALERTS5, PlantData, SensorData, EnvironmentalSettings, 
IrrigationSchedule, LightingSchedule

-- Job Portal
job_postings, job_applications

-- News System
news_posts, topics, subjects
```

### MongoDB Collections
```javascript
// Customer Management
customer: { personal_info, project_details, email_preferences }
plant: { species, care_instructions, assignments }
```

### DynamoDB Tables
```json
// IoT Sensor Data
{
  "device_id": "string",
  "timestamp": "number",
  "temperature": "number",
  "humidity": "number",
  "soil_moisture": "number",
  "co2_level": "number",
  "ph_level": "number"
}
```

### PostgreSQL Tables
```sql
-- Meeting Scheduler
meeting_requests (
  id UUID PRIMARY KEY,
  customer_email VARCHAR,
  meeting_topic VARCHAR,
  preferred_date TIMESTAMP,
  status VARCHAR,
  created_at TIMESTAMP
)
```

## 🔌 API Endpoints

### Greenhouse Management API (Port 7071)
```http
GET    /plants              # Get all plants
POST   /plants              # Add new plant
GET    /plants/{id}         # Get plant details
PUT    /environmental       # Update environment settings
GET    /sensor-data         # Get sensor readings
POST   /alerts              # Create alert
WebSocket /user-alerts      # Real-time user notifications
WebSocket /esp32-comm       # ESP32 communication
```

### Customer Projects API (Port 8075)
```http
POST   /submit-project      # Submit new greenhouse project
GET    /projects            # Get all projects
PUT    /projects/{id}       # Update project status
```

### Job Portal API (Port 8087)
```http
GET    /jobs                # Get job listings
POST   /jobs                # Create job posting
POST   /apply               # Submit job application
PUT    /applications/{id}   # Update application status
```

### IoT Sensor API (Port 8081)
```http
POST   /ecosense            # Receive sensor data from ESP32
GET    /sensor-data         # Retrieve historical data
GET    /health              # System health check
```

## 🌊 Data Flow

### Greenhouse Creation Process
```
User Input → Crop Selection → AI Analysis → Cost Calculation → 
3D Visualization → Project Submission → MongoDB Storage → 
Email Confirmation → ESP32 Setup → Real-time Monitoring
```

### IoT Data Pipeline
```
ESP32 Sensors → HTTP POST → Ballerina API → DynamoDB Storage →
Real-time Analysis → Control Commands → ESP32 Execution →
WebSocket Alerts → Frontend Updates
```

### Job Application Workflow
```
Application Submission → AWS S3 Upload → MySQL Storage →
Email Confirmation → Admin Review → Status Update →
Automated Email Notification
```

## 🔐 Security Features

- **Authentication**: Asgardio/WSO2 with Google OAuth integration
- **CORS Protection**: Configured for secure cross-origin requests
- **UUID Generation**: Secure unique identifiers
- **Input Validation**: Comprehensive data validation
- **Error Handling**: Robust error management across all services

## 📊 Monitoring & Analytics

- **Sensor Data**: Real-time environmental monitoring
- **News Analytics**: Article view tracking and statistics
- **Job Applications**: Application status and statistics dashboard
- **Meeting Metrics**: Webinar engagement tracking
- **Alert System**: Real-time notification management

## 🚀 Deployment

### Local Development
```bash
# Start databases
docker-compose up -d mysql mongodb postgresql

# Configure environment variables
export GEMINI_API_KEY="your_key"
export AWS_ACCESS_KEY_ID="your_key"
export AWS_SECRET_ACCESS_KEY="your_secret"

# Run services
./start-all-services.sh
```

### Production Deployment
- **Cloud Provider**: AWS recommended
- **Database**: RDS for MySQL/PostgreSQL, DocumentDB for MongoDB
- **Storage**: S3 for file uploads
- **IoT**: DynamoDB for sensor data
- **Compute**: EC2 or containerized deployment

## 🛠️ ESP32 Integration

### Hardware Requirements
- ESP32 microcontroller
- Temperature/humidity sensor (DHT22)
- Soil moisture sensor
- CO₂ sensor
- pH sensor
- OLED display

### Firmware Configuration
```cpp
// ESP32 connects to:
String server = "http://192.168.8.106:8081";
String endpoint = "/ecosense";
int interval = 300000; // 5 minutes
```

## 📈 Future Enhancements

- Advanced machine learning models for crop yield prediction
- Mobile application development
- Integration with weather APIs
- Marketplace for buying/selling produce
- Expanded IoT sensor support
- Multi-language support

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 API Documentation

Detailed API documentation is available at:
- Greenhouse API: `http://localhost:7071/swagger`
- Job Portal API: `http://localhost:8087/docs`
- IoT API: `http://localhost:8081/health`

## 🐛 Troubleshooting

### Common Issues

**Database Connection Issues:**
```bash
# Check MySQL connection
mysql -h localhost -P 3306 -u username -p

# Verify MongoDB
mongosh --host localhost --port 27017
```

**ESP32 Communication:**
```bash
# Check network connectivity
ping 192.168.8.106

# Verify WebSocket connection
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Key: test" -H "Sec-WebSocket-Version: 13" \
  http://localhost:9096
```





## 🙏 Acknowledgments

- Ballerina community for the amazing cloud-native language
- AWS for reliable cloud infrastructure
- Google Gemini for AI capabilities
- WSO2 for authentication services
- Open source community for various libraries and tools

---

**Made with ❤️ for Axionix**
