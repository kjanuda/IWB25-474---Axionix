import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Mail, Phone, User, MessageSquare, CheckCircle, AlertCircle, Loader, Send, Sprout, Wheat, Globe, Users, Video, TreePine, MapPin, Languages } from 'lucide-react';

// Import images
import image1 from './images/1.jpg';
import image2 from './images/2.jpg';
import image3 from './images/3.jpg';
import image4 from './images/4.jpg';

// API Configuration
const API_BASE_URL = 'http://localhost:5080/api/v1';

// Country codes for international phone numbers
const countryCodes = [
  { code: '+1', country: 'US/CA', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+86', country: 'China', flag: '🇨🇳' },
  { code: '+81', country: 'Japan', flag: '🇯🇵' },
  { code: '+49', country: 'Germany', flag: '🇩🇪' },
  { code: '+33', country: 'France', flag: '🇫🇷' },
  { code: '+39', country: 'Italy', flag: '🇮🇹' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
  { code: '+55', country: 'Brazil', flag: '🇧🇷' },
  { code: '+52', country: 'Mexico', flag: '🇲🇽' },
  { code: '+27', country: 'South Africa', flag: '🇿🇦' },
  { code: '+234', country: 'Nigeria', flag: '🇳🇬' },
  { code: '+254', country: 'Kenya', flag: '🇰🇪' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬' },
  { code: '+82', country: 'South Korea', flag: '🇰🇷' },
  { code: '+31', country: 'Netherlands', flag: '🇳🇱' },
  { code: '+46', country: 'Sweden', flag: '🇸🇪' },
  { code: '+47', country: 'Norway', flag: '🇳🇴' },
  { code: '+41', country: 'Switzerland', flag: '🇨🇭' },
];

const languages = [
  'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 
  'Chinese', 'Japanese', 'Korean', 'Arabic', 'Hindi', 'Russian', 
  'Dutch', 'Swedish', 'Norwegian', 'Other'
];

const timezones = [
  'UTC-12:00 (Baker Island)',
  'UTC-11:00 (Hawaii)',
  'UTC-10:00 (Alaska)',
  'UTC-09:00 (Pacific)',
  'UTC-08:00 (Mountain)',
  'UTC-07:00 (Central)',
  'UTC-06:00 (Eastern)',
  'UTC-05:00 (Atlantic)',
  'UTC-04:00 (Brazil)',
  'UTC-03:00 (Argentina)',
  'UTC-02:00 (Mid Atlantic)',
  'UTC-01:00 (Azores)',
  'UTC+00:00 (London/Dublin)',
  'UTC+01:00 (Paris/Berlin)',
  'UTC+02:00 (Cairo/Athens)',
  'UTC+03:00 (Moscow/Istanbul)',
  'UTC+04:00 (Dubai/Baku)',
  'UTC+05:00 (Pakistan)',
  'UTC+05:30 (India/Sri Lanka)',
  'UTC+06:00 (Bangladesh)',
  'UTC+07:00 (Thailand/Vietnam)',
  'UTC+08:00 (Singapore/China)',
  'UTC+09:00 (Japan/Korea)',
  'UTC+10:00 (Australia East)',
  'UTC+11:00 (Solomon Islands)',
  'UTC+12:00 (New Zealand)',
];

const agricultureTopics = [
  'Sustainable Farming Practices',
  'Organic Agriculture',
  'Precision Agriculture & Technology',
  'Climate-Smart Agriculture',
  'Soil Health & Management',
  'Crop Protection & Pest Management',
  'Livestock Management',
  'Agricultural Finance & Insurance',
  'Farm Management & Planning',
  'Agricultural Marketing & Trade',
  'Water Management & Irrigation',
  'Agricultural Research & Innovation',
  'Food Safety & Quality',
  'Agricultural Policy & Regulations',
  'Agroecology & Biodiversity',
  'Post-Harvest Management',
  'Agricultural Education & Training',
  'Cooperative Farming & Community Agriculture',
  'Other (Please Specify)'
];

const Webinar = () => {
  const [formData, setFormData] = useState({
    userName: '',
    email: '',
    countryCode: '+1',
    phoneNumber: '',
    country: '',
    preferredLanguage: 'English',
    timezone: 'UTC+00:00 (London/Dublin)',
    interest: '',
    customInterest: '',
    textMessage: '',
    preferredDate: '',
    preferredTime: '',
    webinarType: 'group' // group or individual
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [showCustomInterest, setShowCustomInterest] = useState(false);
  
  // Image slider state
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = [image1, image2, image3, image4];
  
  // Auto-play image slider
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 4000); // Change image every 4 seconds
    
    return () => clearInterval(interval);
  }, [images.length]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'interest') {
      setShowCustomInterest(value === 'Other (Please Specify)');
      if (value !== 'Other (Please Specify)') {
        setFormData(prev => ({ ...prev, customInterest: '' }));
      }
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitStatus(null);

    // Prepare the data for submission
    const submissionData = {
      userName: formData.userName,
      email: formData.email,
      phoneNumber: `${formData.countryCode} ${formData.phoneNumber}`,
      interest: formData.interest === 'Other (Please Specify)' ? formData.customInterest : formData.interest,
      textMessage: `Location: ${formData.country}
Preferred Language: ${formData.preferredLanguage}
Timezone: ${formData.timezone}
Webinar Type: ${formData.webinarType === 'group' ? 'Group Webinar' : 'Individual Consultation'}
Preferred Date: ${formData.preferredDate || 'Flexible'}
Preferred Time: ${formData.preferredTime || 'Flexible'}

Additional Details:
${formData.textMessage}`
    };

    try {
      const response = await fetch(`${API_BASE_URL}/meetings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData)
      });

      const result = await response.json();

      if (result.success) {
        setSubmitStatus({
          type: 'success',
          message: 'Your webinar request has been submitted successfully! We will contact you within 24 hours to confirm the details.',
          requestId: result.data?.requestId
        });
        // Reset form
        setFormData({
          userName: '',
          email: '',
          countryCode: '+1',
          phoneNumber: '',
          country: '',
          preferredLanguage: 'English',
          timezone: 'UTC+00:00 (London/Dublin)',
          interest: '',
          customInterest: '',
          textMessage: '',
          preferredDate: '',
          preferredTime: '',
          webinarType: 'group'
        });
        setShowCustomInterest(false);
      } else {
        setSubmitStatus({
          type: 'error',
          message: result.message || 'Failed to submit your request. Please try again.'
        });
      }
    } catch (error) {
      setSubmitStatus({
        type: 'error',
        message: 'Network error. Please check your connection and try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 min-h-96">
        {/* Background Image Slider */}
        <div className="absolute inset-0 overflow-hidden">
          {images.map((image, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                index === currentImageIndex ? 'opacity-40' : 'opacity-0'
              }`}
              style={{
                backgroundImage: `url(${image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
            />
          ))}
        </div>
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-green-600/80 via-emerald-600/80 to-teal-600/80"></div>
        
        {/* Image Slider Dots */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 z-20">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentImageIndex(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentImageIndex 
                  ? 'bg-white scale-110' 
                  : 'bg-white/50 hover:bg-white/75'
              }`}
            />
          ))}
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 z-10">
          <div className="text-center">
            <div className="flex justify-center items-center mb-6 space-x-4">
              <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-full p-4 transform hover:scale-110 transition-transform duration-300">
                <Wheat className="h-12 w-12 text-white drop-shadow-lg" />
              </div>
              <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-full p-4 transform hover:scale-110 transition-transform duration-300">
                <Video className="h-12 w-12 text-white drop-shadow-lg" />
              </div>
              <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-full p-4 transform hover:scale-110 transition-transform duration-300">
                <Globe className="h-12 w-12 text-white drop-shadow-lg" />
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 drop-shadow-lg">
              Agricultural Webinars & Consultations
            </h1>
            <p className="text-xl md:text-2xl text-green-100 mb-8 max-w-4xl mx-auto drop-shadow-md">
              Connect with international agriculture experts from around the world. 
              Join our global community of farmers, researchers, and agricultural professionals.
            </p>
            <div className="flex flex-wrap justify-center gap-6 text-green-100">
              <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 hover:bg-white/20 transition-all duration-300">
                <Globe className="h-5 w-5 mr-2 drop-shadow-sm" />
                <span className="font-medium">Global Reach</span>
              </div>
              <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 hover:bg-white/20 transition-all duration-300">
                <Languages className="h-5 w-5 mr-2 drop-shadow-sm" />
                <span className="font-medium">Multi-Language Support</span>
              </div>
              <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 hover:bg-white/20 transition-all duration-300">
                <Users className="h-5 w-5 mr-2 drop-shadow-sm" />
                <span className="font-medium">Expert Consultations</span>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-green-50 to-transparent z-10"></div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Status Message */}
        {submitStatus && (
          <div className={`mb-8 p-6 rounded-xl border-l-4 ${
            submitStatus.type === 'success'
              ? 'bg-green-50 border-green-400 text-green-800'
              : 'bg-red-50 border-red-400 text-red-800'
          }`}>
            <div className="flex items-start">
              {submitStatus.type === 'success' ? (
                <CheckCircle className="h-6 w-6 mr-3 mt-0.5" />
              ) : (
                <AlertCircle className="h-6 w-6 mr-3 mt-0.5" />
              )}
              <div>
                <p className="font-semibold text-lg">{submitStatus.message}</p>
                {submitStatus.requestId && (
                  <p className="text-sm mt-2 opacity-75">Reference ID: {submitStatus.requestId}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Webinar Types */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">Choose Your Learning Experience</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div 
              onClick={() => setFormData(prev => ({ ...prev, webinarType: 'group' }))}
              className={`cursor-pointer p-8 rounded-xl border-2 transition-all duration-300 ${
                formData.webinarType === 'group' 
                  ? 'border-green-500 bg-green-50 shadow-lg' 
                  : 'border-gray-200 bg-white hover:border-green-300 hover:shadow-md'
              }`}
            >
              <div className="text-center">
                <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-3">Group Webinar</h3>
                <p className="text-gray-600 mb-4">
                  Join interactive group sessions with farmers and experts from around the world. 
                  Perfect for networking and collaborative learning.
                </p>
                <ul className="text-sm text-gray-500 space-y-1">
                  <li>• Interactive Q&A sessions</li>
                  <li>• Global networking opportunities</li>
                  <li>• Shared experiences and case studies</li>
                  <li>• Free of charge</li>
                </ul>
              </div>
            </div>

            <div 
              onClick={() => setFormData(prev => ({ ...prev, webinarType: 'individual' }))}
              className={`cursor-pointer p-8 rounded-xl border-2 transition-all duration-300 ${
                formData.webinarType === 'individual' 
                  ? 'border-blue-500 bg-blue-50 shadow-lg' 
                  : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
              }`}
            >
              <div className="text-center">
                <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <User className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-3">Individual Consultation</h3>
                <p className="text-gray-600 mb-4">
                  Get personalized one-on-one consultation with agricultural experts. 
                  Tailored advice for your specific farming challenges.
                </p>
                <ul className="text-sm text-gray-500 space-y-1">
                  <li>• Personalized expert advice</li>
                  <li>• Confidential discussions</li>
                  <li>• Customized solutions</li>
                  <li>• Priority scheduling</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Registration Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              Request Your {formData.webinarType === 'group' ? 'Group Webinar' : 'Individual Consultation'}
            </h2>
            <p className="text-gray-600">
              Fill out the form below and we'll match you with the right expert for your agricultural needs
            </p>
          </div>

          <div className="space-y-8">
            {/* Personal Information Section */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <User className="h-5 w-5 mr-2 text-green-600" />
                Personal Information
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="userName"
                    value={formData.userName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="your.email@example.com"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Contact & Location Section */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <MapPin className="h-5 w-5 mr-2 text-green-600" />
                Contact & Location
              </h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country Code
                  </label>
                  <select
                    name="countryCode"
                    value={formData.countryCode}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    {countryCodes.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.flag} {item.code} ({item.country})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="123 456 7890"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country/Region *
                  </label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="e.g., United States, India, Brazil"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Language & Timezone Section */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <Languages className="h-5 w-5 mr-2 text-green-600" />
                Language & Timezone Preferences
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preferred Language
                  </label>
                  <select
                    name="preferredLanguage"
                    value={formData.preferredLanguage}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    {languages.map((lang) => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Timezone
                  </label>
                  <select
                    name="timezone"
                    value={formData.timezone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    {timezones.map((tz) => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Agriculture Topic Section */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <Sprout className="h-5 w-5 mr-2 text-green-600" />
                Agriculture Focus Area
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Main Area of Interest *
                  </label>
                  <select
                    name="interest"
                    value={formData.interest}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select your main interest...</option>
                    {agricultureTopics.map((topic) => (
                      <option key={topic} value={topic}>{topic}</option>
                    ))}
                  </select>
                </div>

                {showCustomInterest && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Please specify your interest *
                    </label>
                    <input
                      type="text"
                      name="customInterest"
                      value={formData.customInterest}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Describe your specific agricultural interest"
                      required={showCustomInterest}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Scheduling Preferences */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-green-600" />
                Scheduling Preferences
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preferred Date (Optional)
                  </label>
                  <input
                    type="date"
                    name="preferredDate"
                    value={formData.preferredDate}
                    onChange={handleInputChange}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preferred Time (Optional)
                  </label>
                  <input
                    type="time"
                    name="preferredTime"
                    value={formData.preferredTime}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Additional Details */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <MessageSquare className="h-5 w-5 mr-2 text-green-600" />
                Additional Details
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tell us more about your requirements *
                </label>
                <textarea
                  name="textMessage"
                  value={formData.textMessage}
                  onChange={handleInputChange}
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Please describe:
• Your current farming situation or challenges
• Specific questions you'd like to discuss
• Your experience level in agriculture
• Any specific outcomes you're hoping to achieve
• Other relevant information that would help us prepare"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="text-center pt-6">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold text-lg rounded-xl hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-4 focus:ring-green-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {isSubmitting ? (
                  <>
                    <Loader className="h-6 w-6 mr-3 animate-spin" />
                    Processing Request...
                  </>
                ) : (
                  <>
                    <Send className="h-6 w-6 mr-3" />
                    Submit {formData.webinarType === 'group' ? 'Webinar' : 'Consultation'} Request
                  </>
                )}
              </button>
              <p className="text-sm text-gray-500 mt-3">
                We'll contact you within 24 hours to confirm your {formData.webinarType === 'group' ? 'webinar' : 'consultation'} details
              </p>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-16 grid md:grid-cols-3 gap-8">
          <div className="text-center p-6 bg-white rounded-xl shadow-lg border border-gray-100">
            <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Globe className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-3">Global Expertise</h3>
            <p className="text-gray-600">
              Connect with agricultural experts and farmers from over 50 countries worldwide
            </p>
          </div>

          <div className="text-center p-6 bg-white rounded-xl shadow-lg border border-gray-100">
            <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Languages className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-3">Multi-Language Support</h3>
            <p className="text-gray-600">
              Sessions available in multiple languages to ensure clear communication
            </p>
          </div>

          <div className="text-center p-6 bg-white rounded-xl shadow-lg border border-gray-100">
            <div className="bg-emerald-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <TreePine className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-3">Sustainable Focus</h3>
            <p className="text-gray-600">
              Emphasis on sustainable and environmentally friendly farming practices
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Webinar;