import { useState } from 'react';
import { Send, Phone, Mail, MapPin, Leaf, CheckCircle, AlertCircle, Sparkles, Star, Zap } from 'lucide-react';

const ContactForm = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    country: '',
    interests: [],
    message: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [focusedField, setFocusedField] = useState(null);

  const countries = [
    'United States', 'Canada', 'United Kingdom', 'Australia', 'Germany', 
    'France', 'Spain', 'Italy', 'Netherlands', 'Sweden', 'Norway', 'Denmark',
    'India', 'China', 'Japan', 'South Korea', 'Brazil', 'Mexico', 'Argentina'
  ];

  const interestOptions = [
    'Solar Energy', 'Wind Power', 'Hydroelectric', 'Energy Storage', 
    'Smart Grid', 'Electric Vehicles', 'Green Building', 'Sustainability Consulting',
    'Carbon Offsetting', 'Renewable Investments'
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleInterestChange = (interest) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitStatus(null);

    // Basic validation
    if (!formData.fullName || !formData.email || !formData.country || !formData.message) {
      setSubmitStatus({
        type: 'error',
        message: 'Please fill in all required fields.'
      });
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:8091/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const result = await response.json();
        setSubmitStatus({
          type: 'success',
          message: 'Thank you! Your message has been sent successfully.',
          id: result.id
        });
        
        // Reset form
        setFormData({
          fullName: '',
          email: '',
          phone: '',
          country: '',
          interests: [],
          message: ''
        });
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      setSubmitStatus({
        type: 'error',
        message: 'Sorry, there was an error sending your message. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 py-12 px-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-r from-green-400 to-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-10 w-96 h-96 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-75"></div>
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-150"></div>
        
        {/* Floating Icons */}
        <div className="absolute top-32 left-1/4 animate-bounce delay-300">
          <Sparkles className="w-6 h-6 text-emerald-400 opacity-60" />
        </div>
        <div className="absolute top-48 right-1/4 animate-bounce delay-700">
          <Star className="w-5 h-5 text-blue-400 opacity-60" />
        </div>
        <div className="absolute bottom-32 left-1/3 animate-bounce delay-1000">
          <Zap className="w-7 h-7 text-yellow-400 opacity-60" />
        </div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header with Enhanced Animation */}
        <div className="text-center mb-16 transform transition-all duration-1000 ease-out">
          <div className="flex items-center justify-center mb-6 group">
            <div className="relative">
              <Leaf className="w-12 h-12 text-emerald-600 mr-3 transform transition-all duration-300 group-hover:rotate-12 group-hover:scale-110" />
              <div className="absolute inset-0 w-12 h-12 bg-emerald-400 rounded-full opacity-20 animate-ping"></div>
            </div>
            <h1 className="text-6xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent animate-pulse">
              EcoGreen360
            </h1>
          </div>
          <p className="text-2xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Connect with Our Renewable Energy Experts and Transform Your Future
          </p>
          <div className="mt-6 flex justify-center space-x-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce delay-100"></div>
            <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce delay-200"></div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Info with Enhanced Design */}
          <div className="transform transition-all duration-700 hover:scale-105">
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-10 border border-white/20 relative overflow-hidden">
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-cyan-50/50 pointer-events-none"></div>
              
              <div className="relative z-10">
                <h2 className="text-3xl font-bold text-gray-800 mb-8 flex items-center">
                  <div className="w-1 h-8 bg-gradient-to-b from-emerald-500 to-cyan-500 mr-4 rounded-full"></div>
                  Contact Information
                </h2>
                
                <div className="space-y-6">
                  <div className="flex items-center p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 transform transition-all duration-300 hover:scale-105 hover:shadow-lg">
                    <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center mr-4">
                      <Phone className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-gray-700 font-medium">+94 773007426</span>
                  </div>
                  
                  <div className="flex items-center p-4 rounded-xl bg-gradient-to-r from-teal-50 to-cyan-50 transform transition-all duration-300 hover:scale-105 hover:shadow-lg">
                    <div className="w-12 h-12 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full flex items-center justify-center mr-4">
                      <Mail className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-gray-700 font-medium">info@ecogreen360.com</span>
                  </div>
                  
                  <div className="flex items-center p-4 rounded-xl bg-gradient-to-r from-cyan-50 to-blue-50 transform transition-all duration-300 hover:scale-105 hover:shadow-lg">
                    <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center mr-4">
                      <MapPin className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-gray-700 font-medium">36/3,Hakmana Road,Beliatta,Srilanka</span>
                  </div>
                </div>

                <div className="mt-10">
                  <h3 className="text-2xl font-bold text-gray-800 mb-6">Why Choose EcoGreen360</h3>
                  <div className="space-y-4">
                    {[
                      'Industry-leading renewable energy solutions',
                      '24/7 customer support and maintenance',
                      'Sustainable and cost-effective energy systems',
                      'Expert consultation and custom solutions'
                    ].map((item, index) => (
                      <div key={index} className="flex items-start p-3 rounded-lg bg-white/50 transform transition-all duration-300 hover:bg-white/70 hover:translate-x-2">
                        <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                          <CheckCircle className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-gray-700 font-medium">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form with Enhanced Animations */}
          <div className="transform transition-all duration-700 hover:scale-105">
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-10 border border-white/20 relative overflow-hidden">
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-50/50 to-blue-50/50 pointer-events-none"></div>
              
              <div className="relative z-10">
                <h2 className="text-3xl font-bold text-gray-800 mb-8 flex items-center">
                  <div className="w-1 h-8 bg-gradient-to-b from-cyan-500 to-blue-500 mr-4 rounded-full"></div>
                  Send Us a Message
                </h2>
                
                {submitStatus && (
                  <div className={`mb-8 p-6 rounded-xl flex items-center transform transition-all duration-500 ${
                    submitStatus.type === 'success' 
                      ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 text-emerald-800 shadow-lg' 
                      : 'bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 text-red-800 shadow-lg'
                  }`}>
                    <div className="w-10 h-10 rounded-full bg-white/70 flex items-center justify-center mr-4">
                      {submitStatus.type === 'success' ? (
                        <CheckCircle className="w-6 h-6" />
                      ) : (
                        <AlertCircle className="w-6 h-6" />
                      )}
                    </div>
                    <span className="font-medium text-lg">{submitStatus.message}</span>
                  </div>
                )}

                <div className="space-y-8">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="group">
                      <label className="block text-sm font-bold text-gray-700 mb-3">Full Name *</label>
                      <div className="relative">
                        <input
                          type="text"
                          name="fullName"
                          value={formData.fullName}
                          onChange={handleInputChange}
                          onFocus={() => setFocusedField('fullName')}
                          onBlur={() => setFocusedField(null)}
                          className={`w-full px-6 py-4 border-2 rounded-xl transition-all duration-300 bg-white/70 backdrop-blur-sm ${
                            focusedField === 'fullName' 
                              ? 'border-emerald-500 ring-4 ring-emerald-500/20 scale-105' 
                              : 'border-gray-200 hover:border-emerald-300'
                          }`}
                          placeholder="Enter your full name"
                        />
                        <div className={`absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 opacity-0 transition-opacity duration-300 pointer-events-none ${
                          focusedField === 'fullName' ? 'opacity-100' : ''
                        }`}></div>
                      </div>
                    </div>
                    
                    <div className="group">
                      <label className="block text-sm font-bold text-gray-700 mb-3">Email Address *</label>
                      <div className="relative">
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          onFocus={() => setFocusedField('email')}
                          onBlur={() => setFocusedField(null)}
                          className={`w-full px-6 py-4 border-2 rounded-xl transition-all duration-300 bg-white/70 backdrop-blur-sm ${
                            focusedField === 'email' 
                              ? 'border-emerald-500 ring-4 ring-emerald-500/20 scale-105' 
                              : 'border-gray-200 hover:border-emerald-300'
                          }`}
                          placeholder="Enter your email"
                        />
                        <div className={`absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 opacity-0 transition-opacity duration-300 pointer-events-none ${
                          focusedField === 'email' ? 'opacity-100' : ''
                        }`}></div>
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="group">
                      <label className="block text-sm font-bold text-gray-700 mb-3">Phone Number</label>
                      <div className="relative">
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          onFocus={() => setFocusedField('phone')}
                          onBlur={() => setFocusedField(null)}
                          className={`w-full px-6 py-4 border-2 rounded-xl transition-all duration-300 bg-white/70 backdrop-blur-sm ${
                            focusedField === 'phone' 
                              ? 'border-emerald-500 ring-4 ring-emerald-500/20 scale-105' 
                              : 'border-gray-200 hover:border-emerald-300'
                          }`}
                          placeholder="Enter your phone number"
                        />
                        <div className={`absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 opacity-0 transition-opacity duration-300 pointer-events-none ${
                          focusedField === 'phone' ? 'opacity-100' : ''
                        }`}></div>
                      </div>
                    </div>
                    
                    <div className="group">
                      <label className="block text-sm font-bold text-gray-700 mb-3">Country *</label>
                      <div className="relative">
                        <select
                          name="country"
                          value={formData.country}
                          onChange={handleInputChange}
                          onFocus={() => setFocusedField('country')}
                          onBlur={() => setFocusedField(null)}
                          className={`w-full px-6 py-4 border-2 rounded-xl transition-all duration-300 bg-white/70 backdrop-blur-sm ${
                            focusedField === 'country' 
                              ? 'border-emerald-500 ring-4 ring-emerald-500/20 scale-105' 
                              : 'border-gray-200 hover:border-emerald-300'
                          }`}
                        >
                          <option value="">Select your country</option>
                          {countries.map(country => (
                            <option key={country} value={country}>{country}</option>
                          ))}
                        </select>
                        <div className={`absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 opacity-0 transition-opacity duration-300 pointer-events-none ${
                          focusedField === 'country' ? 'opacity-100' : ''
                        }`}></div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-4">Areas of Interest</label>
                    <div className="grid grid-cols-2 gap-3">
                      {interestOptions.map((interest, index) => (
                        <label key={interest} className="flex items-center p-3 rounded-lg bg-white/50 hover:bg-white/70 transform transition-all duration-200 hover:scale-105 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.interests.includes(interest)}
                            onChange={() => handleInterestChange(interest)}
                            className="w-5 h-5 text-emerald-600 border-2 border-gray-300 rounded-md focus:ring-emerald-500 focus:ring-2 transition-all duration-200"
                          />
                          <span className="ml-3 text-sm font-medium text-gray-700">{interest}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="group">
                    <label className="block text-sm font-bold text-gray-700 mb-3">Message *</label>
                    <div className="relative">
                      <textarea
                        name="message"
                        value={formData.message}
                        onChange={handleInputChange}
                        onFocus={() => setFocusedField('message')}
                        onBlur={() => setFocusedField(null)}
                        rows={6}
                        className={`w-full px-6 py-4 border-2 rounded-xl transition-all duration-300 bg-white/70 backdrop-blur-sm resize-none ${
                          focusedField === 'message' 
                            ? 'border-emerald-500 ring-4 ring-emerald-500/20 scale-105' 
                            : 'border-gray-200 hover:border-emerald-300'
                        }`}
                        placeholder="Tell us about your renewable energy needs or questions..."
                      />
                      <div className={`absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 opacity-0 transition-opacity duration-300 pointer-events-none ${
                        focusedField === 'message' ? 'opacity-100' : ''
                      }`}></div>
                    </div>
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className={`w-full px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center relative overflow-hidden group ${
                      isSubmitting
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:via-teal-700 hover:to-cyan-700 transform hover:scale-105 shadow-xl hover:shadow-2xl'
                    } text-white`}
                  >
                    {/* Button Background Animation */}
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    <div className="relative z-10 flex items-center">
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                          Sending Message...
                        </>
                      ) : (
                        <>
                          <Send className="w-6 h-6 mr-3 transform transition-transform duration-300 group-hover:translate-x-1" />
                          Send Message
                        </>
                      )}
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactForm;