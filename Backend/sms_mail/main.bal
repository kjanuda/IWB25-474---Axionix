import ballerina/email;
import ballerina/log;
import ballerina/http;
import ballerina/lang.runtime;
import ballerina/file;

// Customer record type
type Customer record {
    string id?;
    string name?;
    string email?;
    string phone?;
    string address?;
    string date?;
    string plantId?;
};

// Configuration for polling
const int POLLING_INTERVAL_SECONDS = 30;
string lastProcessedCustomerId = "";

// Create HTTP client for API calls
http:Client customerApiClient = check new ("http://localhost:8075");

// Create SMTP client
email:SmtpClient smtpClient = check new ("smtp.gmail.com", "ecogreen360.contact@gmail.com", "nqskgfkfhswjkxhd",
    port = 465,
    security = email:SSL
);

// Function to fetch customer information from API
function getCustomerInfo() returns Customer[]|error {
    log:printInfo("📡 Fetching customer information from API...");
    
    http:Response response = check customerApiClient->get("/api/greenhouse/customer-info");
    
    if response.statusCode != 200 {
        return error(string `API request failed with status code: ${response.statusCode}`);
    }
    
    json customerData = check response.getJsonPayload();
    log:printInfo("✅ Customer data retrieved successfully");
    
    Customer[] customers = check customerData.cloneWithType();
    log:printInfo(string `📊 Found ${customers.length()} customers`);
    
    return customers;
}

// Function to get new customers since last check
function getNewCustomers(Customer[] customers) returns Customer[] {
    Customer[] newCustomers = [];
    
    if lastProcessedCustomerId == "" {
        if customers.length() > 0 {
            Customer lastCustomer = customers[customers.length() - 1];
            newCustomers.push(lastCustomer);
            log:printInfo(string `🆕 First run - processing last customer: ${lastCustomer.name ?: "Unknown"}`);
        }
    } else {
        boolean foundLastProcessed = false;
        
        foreach Customer customer in customers.reverse() {
            string customerId = customer.id ?: "";
            if customerId == lastProcessedCustomerId {
                foundLastProcessed = true;
                break;
            }
            newCustomers.push(customer);
        }
        
        if !foundLastProcessed {
            log:printWarn("⚠️ Last processed customer ID not found, processing last customer only");
            if customers.length() > 0 {
                newCustomers = [customers[customers.length() - 1]];
            }
        }
        
        newCustomers = newCustomers.reverse();
    }
    
    if newCustomers.length() > 0 {
        log:printInfo(string `🎯 Found ${newCustomers.length()} new customer(s) to process`);
    }
    
    return newCustomers;
}

// Modern ECOGREEN 360 Welcome Email Template
function getEcoGreenWelcomeTemplate(Customer customer) returns string {
    string name = customer.name ?: "Valued Customer";
    string id = customer.id ?: "N/A";
    string phone = customer.phone ?: "Not provided";
    string email = customer.email ?: "";
    string date = customer.date ?: "Today";
    string address = customer.address ?: "Not provided";
    string plantId = customer.plantId ?: "N/A";
    
    return string `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Welcome to ECOGREEN 360</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f8fdf8;color:#1a472a;line-height:1.6}
.container{max-width:700px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 20px 60px rgba(26,71,42,0.1);border:1px solid #e8f5e8}
.header{background:linear-gradient(135deg,#34d399 0%,#059669 50%,#065f46 100%);padding:50px 40px;text-align:center;position:relative;overflow:hidden}
.header::before{content:'';position:absolute;top:-50%;left:-50%;width:200%;height:200%;background:radial-gradient(circle,rgba(255,255,255,0.1) 0%,transparent 70%);animation:float 6s ease-in-out infinite}
@keyframes float{0%,100%{transform:translateY(0px) rotate(0deg)}50%{transform:translateY(-20px) rotate(180deg)}}
.logo-container{display:flex;align-items:center;justify-content:center;gap:15px;margin-bottom:20px;position:relative;z-index:2}
.logo-img{width:80px;height:80px;border-radius:50%;border:3px solid rgba(255,255,255,0.3);background:#ffffff;padding:10px}
.brand-text{color:#ffffff;font-size:36px;font-weight:700;text-shadow:2px 2px 4px rgba(0,0,0,0.2)}
.tagline{color:rgba(255,255,255,0.95);font-size:18px;font-weight:400;position:relative;z-index:2}
.content{padding:60px 50px}
.welcome-hero{text-align:center;margin-bottom:50px}
.welcome-title{font-size:32px;color:#065f46;margin-bottom:20px;font-weight:700}
.welcome-subtitle{font-size:20px;color:#059669;margin-bottom:30px;font-weight:400}
.customer-card{background:linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%);border-radius:20px;padding:40px;margin:40px 0;border:2px solid #bbf7d0;position:relative}
.customer-card::before{content:'👋';position:absolute;top:-20px;left:50%;transform:translateX(-50%);background:#34d399;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;border:3px solid #ffffff}
.card-title{text-align:center;font-size:24px;color:#065f46;margin-bottom:30px;font-weight:600}
.info-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px;margin-top:20px}
.info-card{background:#ffffff;padding:25px;border-radius:15px;border:1px solid #d1fae5;transition:all 0.3s ease;position:relative}
.info-card:hover{transform:translateY(-5px);box-shadow:0 15px 35px rgba(26,71,42,0.1);border-color:#34d399}
.info-label{font-size:12px;color:#6b7280;text-transform:uppercase;font-weight:600;margin-bottom:8px}
.info-value{font-size:18px;color:#065f46;font-weight:600}
.features-section{margin:50px 0}
.features-title{text-align:center;font-size:28px;color:#065f46;margin-bottom:40px;font-weight:700}
.features-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:30px}
.feature-card{background:#ffffff;padding:35px;border-radius:20px;text-align:center;border:2px solid #d1fae5;transition:all 0.4s ease;position:relative;overflow:hidden}
.feature-card::before{content:'';position:absolute;top:0;left:0;right:0;height:5px;background:linear-gradient(135deg,#34d399,#059669)}
.feature-card:hover{transform:translateY(-10px);box-shadow:0 20px 40px rgba(26,71,42,0.15);border-color:#34d399}
.feature-icon{font-size:48px;margin-bottom:20px;display:block}
.feature-title{font-size:20px;color:#065f46;margin-bottom:15px;font-weight:600}
.feature-desc{color:#6b7280;font-size:16px}
.cta-section{text-align:center;margin:60px 0;padding:50px;background:linear-gradient(135deg,#f0fdf4 0%,#ecfdf5 100%);border-radius:25px;border:2px solid #bbf7d0}
.cta-title{font-size:26px;color:#065f46;margin-bottom:20px;font-weight:700}
.cta-subtitle{font-size:18px;color:#059669;margin-bottom:35px}
.cta-button{display:inline-block;background:linear-gradient(135deg,#34d399 0%,#059669 100%);color:#ffffff;padding:20px 50px;text-decoration:none;border-radius:50px;font-weight:700;font-size:18px;transition:all 0.3s ease;box-shadow:0 10px 30px rgba(52,211,153,0.3);text-transform:uppercase;letter-spacing:1px}
.cta-button:hover{transform:translateY(-3px);box-shadow:0 15px 40px rgba(52,211,153,0.4)}
.footer{background:#065f46;color:#ffffff;padding:40px;text-align:center;position:relative}
.footer-content{opacity:0.95;font-size:16px;line-height:1.8}
.social-links{margin-top:20px}
.social-links a{color:rgba(255,255,255,0.8);text-decoration:none;margin:0 15px;font-size:24px;transition:all 0.3s ease}
.social-links a:hover{color:#34d399}
@media(max-width:768px){.content{padding:40px 30px}.info-grid{grid-template-columns:1fr}.features-grid{grid-template-columns:1fr}.brand-text{font-size:28px}.welcome-title{font-size:26px}}
</style></head><body><div class="container"><div class="header"><div class="logo-container">
<img src="https://ik.imagekit.io/9dtagplxz/ChatGPT%20Image%20Jul%2010,%202025,%2012_04_45%20AM.png?updatedAt=1752086117483">
<div class="brand-text">ECOGREEN 360</div></div><div class="tagline">Sustainable Growth, Infinite Possibilities</div></div>
<div class="content"><div class="welcome-hero"><h1 class="welcome-title">Welcome to Your Green Revolution!</h1>
<p class="welcome-subtitle">Join thousands of successful growers transforming their spaces with our premium greenhouse solutions</p></div>
<div class="customer-card"><h2 class="card-title">Your Registration Summary</h2><div class="info-grid">
<div class="info-card"><div class="info-label">Customer Name</div><div class="info-value">${name}</div></div>
<div class="info-card"><div class="info-label">Registration ID</div><div class="info-value">#${id}</div></div>
<div class="info-card"><div class="info-label">Contact Number</div><div class="info-value">${phone}</div></div>
<div class="info-card"><div class="info-label">Email Address</div><div class="info-value">${email}</div></div>
<div class="info-card"><div class="info-label">Join Date</div><div class="info-value">${date}</div></div>
<div class="info-card"><div class="info-label">Service Location</div><div class="info-value">${address}</div></div></div></div>
<div class="features-section"><h2 class="features-title">Why Choose ECOGREEN 360?</h2><div class="features-grid">
<div class="feature-card"><span class="feature-icon">🏗️</span><h3 class="feature-title">Premium Construction</h3><p class="feature-desc">Weather-resistant, durable greenhouse structures built to last decades</p></div>
<div class="feature-card"><span class="feature-icon">🌡️</span><h3 class="feature-title">Smart Climate Control</h3><p class="feature-desc">AI-powered environmental monitoring with mobile alerts and automation</p></div>
<div class="feature-card"><span class="feature-icon">🌱</span><h3 class="feature-title">Expert Guidance</h3><p class="feature-desc">Dedicated horticulture consultants to maximize your growing success</p></div></div></div>
<div class="cta-section"><h2 class="cta-title">Ready to Start Growing?</h2><p class="cta-subtitle">Access your personalized dashboard and begin your greenhouse journey today</p>
<a href="https://ecogreen360.com/dashboard" class="cta-button">Launch Dashboard</a></div></div>
<div class="footer"><div class="footer-content"><strong>ECOGREEN 360</strong><br>Pioneering Sustainable Agriculture Technology<br>
📧 support@ecogreen360.com | 📞 +1-800-ECO-GREEN<br>🌍 Growing Tomorrow's Food Today<br>
<div class="social-links"><a href="#">🌐</a><a href="#">📘</a><a href="#">📷</a><a href="#">🐦</a></div>
© 2025 ECOGREEN 360. All rights reserved.</div></div></div></body></html>`;
}

// Modern ECOGREEN 360 Booking Confirmation Template
function getEcoGreenBookingTemplate(Customer customer) returns string {
    string name = customer.name ?: "Valued Customer";
    string id = customer.id ?: "N/A";
    string phone = customer.phone ?: "Not provided";
    string date = customer.date ?: "To be scheduled";
    string plantId = customer.plantId ?: "Standard Package";
    
    return string `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Booking Confirmed - ECOGREEN 360</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f8fdf8;color:#1a472a;line-height:1.6}
.container{max-width:700px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 20px 60px rgba(26,71,42,0.1);border:1px solid #e8f5e8}
.header{background:linear-gradient(135deg,#10b981 0%,#047857 50%,#064e3b 100%);padding:50px 40px;text-align:center;position:relative;overflow:hidden}
.logo-container{display:flex;align-items:center;justify-content:center;gap:15px;margin-bottom:20px}
.logo-img{width:80px;height:80px;border-radius:50%;border:3px solid rgba(255,255,255,0.3);background:#ffffff;padding:10px}
.brand-text{color:#ffffff;font-size:36px;font-weight:700}
.success-badge{background:rgba(255,255,255,0.2);color:#ffffff;padding:15px 30px;border-radius:50px;font-size:20px;font-weight:600;margin-top:20px;display:inline-flex;align-items:center;gap:10px}
.content{padding:60px 50px}
.confirmation-hero{text-align:center;margin-bottom:50px}
.confirmation-title{font-size:32px;color:#047857;margin-bottom:20px;font-weight:700}
.confirmation-subtitle{font-size:20px;color:#10b981;margin-bottom:30px}
.booking-summary{background:linear-gradient(135deg,#ecfdf5 0%,#d1fae5 100%);border-radius:20px;padding:40px;margin:40px 0;border:3px solid #10b981;position:relative}
.booking-summary::before{content:'✅';position:absolute;top:-20px;left:50%;transform:translateX(-50%);background:#10b981;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;border:3px solid #ffffff}
.summary-title{text-align:center;font-size:24px;color:#047857;margin-bottom:30px;font-weight:600}
.detail-item{display:flex;justify-content:space-between;align-items:center;padding:20px 25px;margin:15px 0;background:#ffffff;border-radius:15px;border:2px solid #bbf7d0;transition:all 0.3s ease}
.detail-item:hover{transform:scale(1.02);border-color:#10b981;box-shadow:0 10px 25px rgba(16,185,129,0.1)}
.detail-label{font-weight:700;color:#047857;font-size:18px}
.detail-value{color:#065f46;font-weight:600;text-align:right;font-size:16px}
.timeline-section{margin:50px 0}
.timeline-title{text-align:center;font-size:28px;color:#047857;margin-bottom:40px;font-weight:700}
.timeline-container{position:relative}
.timeline-item{display:flex;align-items:flex-start;margin:30px 0;position:relative}
.timeline-number{background:linear-gradient(135deg,#10b981,#047857);color:#ffffff;width:50px;height:50px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;margin-right:25px;z-index:2}
.timeline-content{flex:1;background:#f9fafb;padding:25px;border-radius:15px;border-left:4px solid #10b981}
.timeline-step-title{font-size:20px;color:#047857;font-weight:600;margin-bottom:10px}
.timeline-step-desc{color:#6b7280;font-size:16px}
.contact-cta{background:linear-gradient(135deg,#047857 0%,#064e3b 100%);color:#ffffff;padding:50px;border-radius:25px;margin:50px 0;text-align:center}
.contact-title{font-size:26px;margin-bottom:20px;font-weight:700}
.contact-subtitle{font-size:18px;margin-bottom:35px;opacity:0.9}
.contact-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:30px;margin-top:30px}
.contact-method{text-align:center;padding:20px;background:rgba(255,255,255,0.1);border-radius:15px;transition:all 0.3s ease}
.contact-method:hover{background:rgba(255,255,255,0.2);transform:translateY(-5px)}
.contact-icon{font-size:32px;margin-bottom:15px}
.contact-info{font-size:16px;font-weight:600}
.footer{background:#064e3b;color:#ffffff;padding:40px;text-align:center}
.footer-content{opacity:0.95;font-size:16px;line-height:1.8}
@media(max-width:768px){.content{padding:40px 30px}.detail-item{flex-direction:column;text-align:center;gap:10px}.timeline-item{flex-direction:column;text-align:center}.timeline-number{margin:0 auto 20px}.contact-grid{grid-template-columns:1fr}.brand-text{font-size:28px}.confirmation-title{font-size:26px}}
</style></head><body><div class="container"><div class="header"><div class="logo-container">
<img src="https://ik.imagekit.io/9dtagplxz/ChatGPT%20Image%20Jul%2010,%202025,%2012_04_45%20AM.png?updatedAt=1752086117483">
<div class="brand-text">ECOGREEN 360</div></div><div class="success-badge">✅ Booking Confirmed</div></div>
<div class="content"><div class="confirmation-hero"><h1 class="confirmation-title">Congratulations ${name}!</h1><p class="confirmation-subtitle">Your greenhouse project is officially scheduled and our team is ready to bring your vision to life</p></div>
<div class="booking-summary"><h2 class="summary-title">📋 Booking Details</h2>
<div class="detail-item"><span class="detail-label">Customer Name:</span><span class="detail-value">${name}</span></div>
<div class="detail-item"><span class="detail-label">Confirmation ID:</span><span class="detail-value">#GH-${id}</span></div>
<div class="detail-item"><span class="detail-label">Contact Number:</span><span class="detail-value">${phone}</span></div>
<div class="detail-item"><span class="detail-label">Scheduled Date:</span><span class="detail-value">${date}</span></div>
<div class="detail-item"><span class="detail-label">Selected Package:</span><span class="detail-value">${plantId} Suite</span></div></div>
<div class="timeline-section"><h2 class="timeline-title">🚀 Your Journey Ahead</h2><div class="timeline-container">
<div class="timeline-item"><div class="timeline-number">1</div><div class="timeline-content"><div class="timeline-step-title">Initial Consultation</div><div class="timeline-step-desc">Our greenhouse specialist will contact you within 24 hours to discuss your vision, requirements, and answer any questions</div></div></div>
<div class="timeline-item"><div class="timeline-number">2</div><div class="timeline-content"><div class="timeline-step-title">Site Evaluation</div><div class="timeline-step-desc">Professional site assessment to determine optimal placement, foundation requirements, and custom specifications</div></div></div>
<div class="timeline-item"><div class="timeline-number">3</div><div class="timeline-content"><div class="timeline-step-title">Design & Engineering</div><div class="timeline-step-desc">Custom greenhouse design tailored to your space, with 3D visualizations and technical specifications</div></div></div>
<div class="timeline-item"><div class="timeline-number">4</div><div class="timeline-content"><div class="timeline-step-title">Installation & Training</div><div class="timeline-step-desc">Professional installation by certified technicians, followed by comprehensive training and ongoing support</div></div></div></div></div>
<div class="contact-cta"><h2 class="contact-title">Questions? We're Here to Help!</h2><p class="contact-subtitle">Our customer success team is standing by to ensure your experience exceeds expectations</p>
<div class="contact-grid"><div class="contact-method"><div class="contact-icon">📧</div><div class="contact-info">support@ecogreen360.com<br>24/7 Email Support</div></div>
<div class="contact-method"><div class="contact-icon">📞</div><div class="contact-info">+1-800-ECO-GREEN<br>Direct Hotline</div></div>
<div class="contact-method"><div class="contact-icon">💬</div><div class="contact-info">Live Chat Available<br>Instant Assistance</div></div></div></div></div>
<div class="footer"><div class="footer-content"><strong>ECOGREEN 360</strong><br>Building Tomorrow's Growing Solutions Today<br>© 2025 ECOGREEN 360. Cultivating sustainable futures worldwide.</div></div></div></body></html>`;
}

// Enhanced email sending function
function sendMail(string to, string subject, string htmlContent, email:Attachment[]? attachments = ()) returns error? {
    email:Message emailMsg = {
        to: [to],
        subject: subject,
        htmlBody: htmlContent
    };
    
    if attachments is email:Attachment[] {
        emailMsg.attachments = attachments;
    }
    
    log:printInfo(string `📧 Sending email to: ${to} with subject: ${subject}${attachments is () ? "" : " (with attachments)"}`);
    
    email:Error? result = smtpClient->sendMessage(emailMsg);
    
    if result is email:Error {
        log:printError("❌ Failed to send email", result);
        return result;
    } else {
        log:printInfo(string `✅ Email sent successfully to: ${to}`);
        return ();
    }
}

// Send welcome email with customer data and PDF attachment
function sendEcoGreenWelcomeEmail(Customer customer) returns error? {
    if customer.email is () || customer.email == "" {
        return error("Customer email is required");
    }

    string customerName = customer.name ?: "Valued Customer";
    string customerEmail = <string>customer.email;
    string htmlContent = getEcoGreenWelcomeTemplate(customer);

    // Path to the PDF file
    string pdfFilePath = "./resources/welcome_brochure.pdf";

    // Verify if the PDF file exists
    boolean fileExists = check file:test(pdfFilePath, file:EXISTS);
    if !fileExists {
        log:printError("PDF file not found at: " + pdfFilePath);
        return error("PDF file not found at: " + pdfFilePath);
    }

    // Create email message with attachment
    email:Attachment attachment = {
        filePath: pdfFilePath,
        contentType: "application/pdf"
    };

    log:printInfo(string `📧 Preparing welcome email with PDF attachment for: ${customerEmail}`);

    // Send the email with attachment
    return sendMail(customerEmail, "🌱 Welcome to ECOGREEN 360 - Your Sustainable Future Starts Now!", htmlContent, [attachment]);
}

// Send booking confirmation email
function sendEcoGreenBookingEmail(Customer customer) returns error? {
    if customer.email is () || customer.email == "" {
        return error("Customer email is required");
    }
    
    string htmlContent = getEcoGreenBookingTemplate(customer);
    return sendMail(<string>customer.email, "✅ Project Confirmed - ECOGREEN 360 Greenhouse Installation", htmlContent);
}

// Function to process a single customer
function processCustomer(Customer customer) returns error? {
    if customer.email is () || customer.email == "" {
        log:printWarn(string `⚠️ Customer ${customer.name ?: "Unknown"} does not have a valid email address`);
        return error("Customer does not have a valid email address");
    }
    
    string customerName = customer.name ?: "Valued Customer";
    string customerEmail = <string>customer.email;
    
    log:printInfo(string `👤 Processing customer: ${customerName} (${customerEmail})`);
    
    // Send welcome email with PDF
    error? welcomeResult = sendEcoGreenWelcomeEmail(customer);
    if welcomeResult is error {
        log:printError("Failed to send welcome email", welcomeResult);
        return welcomeResult;
    }
    
    runtime:sleep(3.0);
    
    // Send booking confirmation email
    error? bookingResult = sendEcoGreenBookingEmail(customer);
    if bookingResult is error {
        log:printError("Failed to send booking email", bookingResult);
        return bookingResult;
    }
    
    log:printInfo(string `✨ Successfully processed customer: ${customerName}`);
    return ();
}

// Function to check for new customers and process them
function checkAndProcessNewCustomers() returns error? {
    log:printInfo("🔍 Checking for new customers...");
    
    Customer[]|error customersResult = getCustomerInfo();
    
    if customersResult is error {
        log:printError("Failed to fetch customer information", customersResult);
        return customersResult;
    }
    
    Customer[] customers = customersResult;
    
    if customers.length() == 0 {
        log:printInfo("📭 No customers found in API response");
        return ();
    }
    
    Customer[] newCustomers = getNewCustomers(customers);
    
    if newCustomers.length() == 0 {
        log:printInfo("😴 No new customers found");
        return ();
    }
    
    foreach Customer customer in newCustomers {
        error? result = processCustomer(customer);
        if result is error {
            log:printError(string `Failed to process customer ${customer.name ?: "Unknown"}`, result);
        } else {
            string customerId = customer.id ?: "";
            if customerId != "" {
                lastProcessedCustomerId = customerId;
                log:printInfo(string `📝 Updated last processed customer ID: ${lastProcessedCustomerId}`);
            }
        }
        
        runtime:sleep(2.0);
    }
    
    return ();
}

// Main function
public function main() returns error? {
    log:printInfo("🌱 Starting ECOGREEN 360 customer email service...");
    log:printInfo(string `⏰ Polling interval: ${POLLING_INTERVAL_SECONDS} seconds`);
    log:printInfo("🔄 Service will check for new customers continuously...");
    log:printInfo("📧 Automatic welcome & booking emails will be sent");
    log:printInfo("➡️ Press Ctrl+C to stop the service");
    
    while true {
        error? result = checkAndProcessNewCustomers();
        if result is error {
            log:printError("Error in polling cycle", result);
        }
        
        log:printInfo(string `⏳ Waiting ${POLLING_INTERVAL_SECONDS} seconds until next check...`);
        runtime:sleep(<decimal>POLLING_INTERVAL_SECONDS);
    }
}

// End of main function
// End of file