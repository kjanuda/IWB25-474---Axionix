import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const GreenhousePlantDisplay = () => {
  const [plantData, setPlantData] = useState(null);
  const [allPlants, setAllPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    id: '', // This is customerId in backend
    phone: '',
    email: '',
    date: new Date().toISOString().split('T')[0], // Set current date as default
    address: '',
    plantId: ''
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState({ text: '', type: '' });
  const [processingComplete, setProcessingComplete] = useState(false);
  
  const navigate = useNavigate();

  // Asgardeo Authentication Hook
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setAuthLoading(true);
        
        // Check if Asgardeo SDK is available
        if (typeof window !== 'undefined' && window.authClient) {
          // Get authentication state
          const isAuthenticated = await window.authClient.isAuthenticated();
          
          if (isAuthenticated) {
            // Get user info from Asgardeo
            const userInfo = await window.authClient.getBasicUserInfo();
            console.log('Asgardeo User Info:', userInfo);
            
            setAuthUser(userInfo);
            
            // Auto-populate form fields with user data
            setFormData(prev => ({
              ...prev,
              name: userInfo.displayName || userInfo.name || userInfo.given_name + ' ' + userInfo.family_name || '',
              email: userInfo.email || userInfo.username || ''
            }));
          } else {
            console.log('User not authenticated with Asgardeo');
          }
        } else {
          console.log('Asgardeo SDK not found - using manual input');
        }
      } catch (error) {
        console.error('Asgardeo authentication error:', error);
      } finally {
        setAuthLoading(false);
      }
    };

    initializeAuth();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch plant data from port 8070
        const plantResponse = await fetch('http://localhost:7071/api/greenhouse/plants');
        if (!plantResponse.ok) {
          throw new Error(`HTTP error! status: ${plantResponse.status}`);
        }
        
        const plantDataResponse = await plantResponse.json();
        
        // Get the most recent plant
        if (Array.isArray(plantDataResponse) && plantDataResponse.length > 0) {
          const sortedData = plantDataResponse.sort((a, b) => b.id - a.id);
          const latestPlant = sortedData[0];
          setPlantData(latestPlant);
          setFormData(prev => ({ ...prev, plantId: String(latestPlant.id) }));
        } else if (plantDataResponse && typeof plantDataResponse === 'object') {
          setPlantData(plantDataResponse);
          setFormData(prev => ({ ...prev, plantId: String(plantDataResponse.id) }));
        }

        // Fetch all plants from port 8075 for dropdown
        try {
          const allPlantsResponse = await fetch('http://localhost:8075/api/greenhouse/plants');
          if (allPlantsResponse.ok) {
            const allPlantsData = await allPlantsResponse.json();
            setAllPlants(Array.isArray(allPlantsData) ? allPlantsData : []);
          }
        } catch (plantsError) {
          console.log('Could not fetch plants dropdown data:', plantsError.message);
        }
        
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleLogin = async () => {
    try {
      if (window.authClient) {
        await window.authClient.signIn();
      } else {
        alert('Asgardeo SDK not loaded. Please ensure the SDK is properly initialized.');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      if (window.authClient) {
        await window.authClient.signOut();
        setAuthUser(null);
        // Clear form data
        setFormData(prev => ({
          ...prev,
          name: '',
          email: ''
        }));
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear any previous messages when user starts typing
    if (formMessage.text) {
      setFormMessage({ text: '', type: '' });
    }
  };

  const validateForm = () => {
    const { name, phone, email, date, address, plantId } = formData;
    
    if (!name.trim()) return 'Full name is required';
    if (!phone.trim()) return 'Phone number is required';
    if (!email.trim()) return 'Email address is required';
    if (!date) return 'Date is required';
    if (!address.trim()) return 'Address is required';
    if (!plantId) return 'Plant selection is required';
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return 'Please enter a valid email address';
    
    // Phone validation (basic)
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(phone.replace(/\s|-|\(|\)/g, ''))) {
      return 'Please enter a valid phone number';
    }
    
    return null;
  };

  const resetForm = () => {
    setFormData({
      name: authUser ? (authUser.displayName || authUser.name || authUser.given_name + ' ' + authUser.family_name || '') : '',
      id: '',
      phone: '',
      email: authUser ? (authUser.email || authUser.username || '') : '',
      date: new Date().toISOString().split('T')[0],
      address: '',
      plantId: plantData?.id ? String(plantData.id) : ''
    });
  };

  const handleFormSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setFormMessage({ text: validationError, type: 'error' });
      return;
    }

    setFormSubmitting(true);
    setFormMessage({ text: '', type: '' });

    try {
      const response = await fetch('http://localhost:8075/api/greenhouse/customer-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setFormMessage({ 
          text: 'Processing your greenhouse registration...', 
          type: 'success' 
        });
        setProcessingComplete(true);
        
        // Show processing for 3 seconds before navigation
        setTimeout(() => {
          navigate('/greenhouse');
        }, 3000);
      } else {
        setFormMessage({ 
          text: result.message || 'Failed to save customer information', 
          type: 'error' 
        });
      }
    } catch (err) {
      setFormMessage({ 
        text: 'Network error: Unable to submit form. Please check your connection.', 
        type: 'error' 
      });
    } finally {
      setFormSubmitting(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-200 border-t-green-600 mx-auto mb-4"></div>
          <p className="text-green-700 font-medium text-lg">
            {authLoading ? 'Checking authentication...' : 'Loading plant data...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg border-l-4 border-red-500 max-w-md">
          <div className="text-red-600 text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold mb-2">Connection Error</h2>
            <p className="mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!plantData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center text-gray-600">
          <div className="text-6xl mb-4">🌱</div>
          <p className="text-lg">No plant data available</p>
        </div>
      </div>
    );
  }

  const InfoCard = ({ label, value, icon }) => (
    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
      <div className="flex items-start space-x-3">
        <div className="text-green-600 text-xl flex-shrink-0">{icon}</div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-700 mb-1">{label}</h3>
          <p className="text-gray-900 text-sm">{value || 'Not specified'}</p>
        </div>
      </div>
    </div>
  );

  // Processing screen after successful submission
  if (processingComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-center max-w-md p-8 bg-white rounded-xl shadow-lg">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-200 border-t-green-600 mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-green-800 mb-4">Processing Your Greenhouse Registration</h2>
          <p className="text-gray-600 mb-6">Your greenhouse information is being processed. You'll be redirected shortly...</p>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div className="bg-green-600 h-2.5 rounded-full animate-pulse" style={{width: '75%'}}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header with Authentication Status */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8 border-t-4 border-green-500">
            {/* Authentication Status Bar */}
            <div className="mb-6 p-4 rounded-lg border-2 border-dashed border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">
                    {authUser ? '' : ''}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">
                      
                    </h3>
                    <p className="text-sm text-gray-600">
                      {authUser 
                        ? `Logged in as: ${authUser.displayName || authUser.email || authUser.username}`
                        : ''
                      }
                    </p>
                  </div>
                </div>
                <div>
                  {authUser ? (
                    <button
                      onClick={handleLogout}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
                    >
                      🚪 Logout
                    </button>
                  ) : (
                    <button
                      onClick={handleLogin}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                    >
                     
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="text-center">
              <div className="text-5xl mb-4">🌿</div>
              <h1 className="text-4xl font-bold text-gray-800 mb-3">
                {plantData.treeSpecies}
              </h1>
              <p className="text-gray-600 mb-4 text-lg">Latest Submitted Plant Information</p>
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-green-100 text-green-800 font-semibold mb-6">
                🆔 Plant ID: {plantData.id} | 📅 Planted: {plantData.plantingDate}
              </div>
              <div className="mt-6">
                <button
                  onClick={() => setShowForm(!showForm)}
                  className={`px-8 py-3 rounded-xl font-semibold text-white transition-all duration-300 transform hover:scale-105 shadow-lg ${
                    showForm 
                      ? 'bg-red-500 hover:bg-red-600' 
                      : 'bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700'
                  }`}
                >
                  {showForm ? '❌ Close Customer Form' : '📋 Register Customer'}
                </button>
              </div>
            </div>
          </div>

          {/* Enhanced Customer Information Form */}
          {showForm && (
            <div className="bg-white rounded-xl shadow-xl p-8 mb-8 border-t-4 border-blue-500 transition-all duration-300">
              <div className="text-center mb-8">
                <div className="text-4xl mb-3">👤</div>
                <h2 className="text-3xl font-bold text-gray-800 mb-2">Customer Registration</h2>
                <p className="text-gray-600">
                  {authUser 
                    ? 'Your information has been auto-filled from your Asgardeo profile'
                    : 'Please login with Asgardeo to auto-fill your information, or enter manually'
                  }
                </p>
              </div>
              
              {/* Enhanced Message Display */}
              {formMessage.text && (
                <div className={`p-4 rounded-xl mb-6 border transition-all duration-300 ${
                  formMessage.type === 'error' 
                    ? 'bg-red-50 text-red-800 border-red-200' 
                    : 'bg-green-50 text-green-800 border-green-200'
                }`}>
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">
                      {formMessage.type === 'error' ? '❌' : '✅'}
                    </span>
                    <span className="font-medium">{formMessage.text}</span>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {/* Personal Information Section */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <span className="mr-2">👤</span>Personal Information
                    {authUser && (
                      <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        Auto-filled from Asgardeo
                      </span>
                    )}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Full Name * {authUser && <span className="text-green-600">✓ Auto-filled</span>}
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 ${
                          authUser ? 'bg-green-50 border-green-300' : ''
                        }`}
                        placeholder={authUser ? 'Auto-filled from Asgardeo' : 'Enter your full name'}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Customer ID (Optional)
                      </label>
                      <input
                        type="text"
                        name="id"
                        value={formData.id}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                        placeholder="National Id Num"
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Information Section */}
                <div className="bg-blue-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <span className="mr-2">📞</span>Contact Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="+94 776007845 "
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Email Address * {authUser && <span className="text-green-600">✓ Auto-filled</span>}
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                          authUser ? 'bg-green-50 border-green-300' : ''
                        }`}
                        placeholder={authUser ? 'Auto-filled from Asgardeo' : 'example@email.com'}
                      />
                    </div>
                  </div>
                </div>

                {/* Registration Details Section */}
                <div className="bg-green-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <span className="mr-2">📋</span>Registration Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Registration Date *
                      </label>
                      <input
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Selected Plant *
                      </label>
                      {allPlants.length > 0 ? (
                        <select
                          name="plantId"
                          value={formData.plantId}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                        >
                          <option value="">Choose a plant...</option>
                          {allPlants.map((plant, index) => (
                            <option key={plant.id || index} value={plant.id || plant.plantId}>
                              {plant.name || plant.treeSpecies || `Plant ${plant.id}`}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          name="plantId"
                          value={formData.plantId}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 focus:outline-none"
                          placeholder="Current plant auto-selected"
                          readOnly
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Address Section */}
                <div className="bg-yellow-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <span className="mr-2">📍</span>Address Information
                  </h3>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Complete Address *
                    </label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      rows="4"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none transition-all duration-200"
                      placeholder="Enter your complete address including street, city, state, and postal code"
                    />
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium"
                  >
                    🔄 Reset Form
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium"
                  >
                    ❌ Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleFormSubmit}
                    disabled={formSubmitting}
                    className="px-8 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold transform hover:scale-105 shadow-lg"
                  >
                    {formSubmitting ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Processing your greenhouse...</span>
                      </div>
                    ) : (
                      '✅ Register Customer'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Plant Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <InfoCard label="Expected Height" value={plantData.expectedHeight} icon="📏" />
            <InfoCard label="Root Spread" value={plantData.rootSpread} icon="🌱" />
            <InfoCard label="Sunlight Needs" value={plantData.sunlightNeeds} icon="☀️" />
            <InfoCard label="Watering Frequency" value={plantData.wateringFrequency} icon="💧" />
            <InfoCard label="Temperature Range" value={plantData.temperatureRange} icon="🌡️" />
            <InfoCard label="Humidity Preference" value={plantData.humidityPreference} icon="💨" />
          </div>

          {/* Detailed Care Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <span className="mr-2">🌿</span>Soil & Nutrition
              </h2>
              <div className="space-y-4">
                <InfoCard label="Soil Type Required" value={plantData.soilTypeRequired} icon="🪨" />
                <InfoCard label="Current Soil Type" value={plantData.currentSoilType} icon="🌍" />
                <InfoCard label="Fertilizer Plan" value={plantData.fertilizerPlan} icon="🧪" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <span className="mr-2">✂️</span>Maintenance & Care
              </h2>
              <div className="space-y-4">
                <InfoCard label="Pruning Schedule" value={plantData.pruningSchedule} icon="✂️" />
                <InfoCard label="Pest Control" value={plantData.pestControl} icon="🐛" />
                <InfoCard label="Pollination Method" value={plantData.pollinationMethod} icon="🐝" />
              </div>
            </div>
          </div>

          {/* Setup Information */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <span className="mr-2">🏗️</span>Setup & Structure
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <InfoCard label="Available Space" value={plantData.availableSpace} icon="📐" />
              <InfoCard label="Planting Method" value={plantData.plantingMethod} icon="🌱" />
              <InfoCard label="Drainage System" value={plantData.drainageSystem} icon="🚰" />
              <InfoCard label="Support Structures" value={plantData.supportStructures} icon="🏗️" />
              <InfoCard label="Support Description" value={plantData.supportDescription} icon="📝" />
            </div>
          </div>

          {/* Additional Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <InfoCard label="Purpose" value={plantData.purpose} icon="🎯" />
            <InfoCard label="Planting Date" value={plantData.plantingDate} icon="📅" />
            <InfoCard label="Market Price" value={plantData.marketPrice} icon="💰" />
          </div>

          {/* Footer */}
          <div className="text-center mt-8 p-4 bg-white rounded-lg shadow-sm">
            <p className="text-gray-500 text-sm">
              🌱 Greenhouse Management System | Last updated: {new Date().toLocaleDateString()} | 
              <span className="ml-2 text-green-600 font-medium">API: localhost:8075</span> |
              <span className="ml-2 text-blue-600 font-medium">🔐 Asgardeo Integration</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GreenhousePlantDisplay;