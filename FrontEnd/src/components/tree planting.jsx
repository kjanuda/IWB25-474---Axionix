import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Loader, Leaf, TreePine, Droplets, Sun, Thermometer, 
  Scissors, Bug, Calendar, MapPin, AlertTriangle, CheckCircle, 
  Sparkles, Home, FileText, Star, DollarSign, Send, Image 
} from 'lucide-react';

const ballerinaBackendUrl = "http://localhost:7071/api";

export default function GreenhousePlantApp() {
  const navigate = useNavigate();
  const [plantName, setPlantName] = useState('');
  const [plantInfo, setPlantInfo] = useState(null);
  const [plantImage, setPlantImage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    treeSpecies: '',
    purpose: '',
    expectedHeight: '',
    rootSpread: '',
    sunlightNeeds: '',
    wateringFrequency: '',
    temperatureRange: 'Not specified',
    humidityPreference: '',
    availableSpace: '',
    plantingMethod: '',
    drainageSystem: '',
    supportStructures: '',
    supportDescription: '',
    soilTypeRequired: '',
    currentSoilType: '',
    fertilizerPlan: '',
    pruningSchedule: '',
    pestControl: '',
    pollinationMethod: '',
    plantingDate: new Date().toISOString().split('T')[0],
    marketPrice: ''
  });

  const fetchPlantInfo = async () => {
    if (!plantName.trim()) {
      setError('Please enter a plant name');
      return;
    }

    setIsLoading(true);
    setError('');
    setPlantInfo(null);
    setPlantImage('');
    setSubmitSuccess(false);

    try {
      const response = await fetch(`${ballerinaBackendUrl}/plant/analyze`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ plantName: plantName.trim() })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.plantInfo) {
        throw new Error('Invalid response format: missing plant information');
      }

      setPlantInfo(data.plantInfo);
      setPlantImage(data.imageUrl || '');
      
      // Auto-populate form data with received information
      setFormData(prev => ({
        ...prev,
        treeSpecies: data.plantInfo.scientificName || plantName,
        expectedHeight: data.plantInfo.height || '',
        rootSpread: data.plantInfo.spread || '',
        temperatureRange: data.plantInfo.temperatureRange || 'Not specified',
        soilTypeRequired: data.plantInfo.soilType || '',
        fertilizerPlan: data.plantInfo.fertilizer || '',
        pruningSchedule: data.plantInfo.pruning || '',
        plantingDate: new Date().toISOString().split('T')[0],
        sunlightNeeds: data.plantInfo.sunRequirements || '',
        wateringFrequency: data.plantInfo.waterRequirements || '',
        humidityPreference: data.plantInfo.greenhouseSuitability?.recommendedConditions?.humidity || '',
        purpose: data.plantInfo.fruitBearing?.isFruitBearing === 'yes' ? 'Fruit Production' : 'Ornamental/Other',
        marketPrice: data.plantInfo.fruitBearing?.estimatedMarketPrice || ''
      }));

      console.log('✅ Plant analysis completed:', data);

    } catch (error) {
      console.error('❌ Error fetching plant info:', error);
      setError(`Failed to analyze plant: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = () => {
    fetchPlantInfo();
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const submitToBackend = async () => {
    if (!plantInfo) {
      setError('No plant information to submit');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSubmitSuccess(false);

    try {
      const submissionData = {
        ...formData,
        temperatureRange: formData.temperatureRange || 'Not specified',
        soilTypeRequired: formData.soilTypeRequired || 'Not specified',
        currentSoilType: formData.currentSoilType || 'Not specified'
      };

      const response = await fetch(`${ballerinaBackendUrl}/greenhouse/plant`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(submissionData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP error! status: ${response.status}`);
      }

      // Try to parse as JSON, but accept empty response
      try {
        await response.json();
      } catch (e) {
        console.log('Response was not JSON, but request succeeded');
      }

      setSubmitSuccess(true);
      
      // Navigate after 2 seconds to show success message
      setTimeout(() => {
        navigate('/fetchesdata');
      }, 2000);

    } catch (error) {
      console.error('❌ Error submitting to backend:', error);
      setError(`Failed to submit data: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSuitabilityColor = (suitable) => {
    switch(suitable) {
      case 'yes': return 'text-green-600 bg-green-50';
      case 'partial': return 'text-yellow-600 bg-yellow-50';
      case 'no': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getSuitabilityIcon = (suitable) => {
    switch(suitable) {
      case 'yes': return <CheckCircle className="h-5 w-5" />;
      case 'partial': return <AlertTriangle className="h-5 w-5" />;
      case 'no': return <AlertTriangle className="h-5 w-5" />;
      default: return <AlertTriangle className="h-5 w-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50/80 via-emerald-50/60 to-lime-50/80 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 animate-bounce delay-100">
          <Leaf className="h-8 w-8 text-green-400/30 rotate-12" />
        </div>
        <div className="absolute top-32 right-20 animate-bounce delay-300">
          <TreePine className="h-6 w-6 text-emerald-400/30" />
        </div>
        <div className="absolute top-60 left-1/4 animate-bounce delay-500">
          <Droplets className="h-7 w-7 text-blue-500/20 -rotate-12" />
        </div>
        <div className="absolute bottom-40 right-1/3 animate-bounce delay-700">
          <Sparkles className="h-6 w-6 text-green-400/30 rotate-45" />
        </div>
        <div className="absolute top-1/2 left-10 animate-bounce delay-900">
          <Sun className="h-6 w-6 text-yellow-400/30" />
        </div>
      </div>

      <div className="relative z-10 p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <div className="absolute -inset-3 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full blur opacity-30 animate-pulse"></div>
              <div className="relative bg-white rounded-full p-4 shadow-lg">
                <Home className="h-10 w-10 text-green-500" />
              </div>
            </div>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-green-600 via-emerald-500 to-green-600 bg-clip-text text-transparent mb-4">
            🌳 Greenhouse Cultivation Hub
          </h1>
          <p className="text-xl text-gray-700 max-w-2xl mx-auto">
            Discover plant information and assess greenhouse cultivation suitability with AI-powered botanical analysis
          </p>
          <div className="mt-4 text-sm text-green-600 bg-green-50 inline-block px-4 py-2 rounded-full">
            
          </div>
        </div>

        {/* Search Form */}
        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl mb-8 border border-white/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 to-emerald-50/30 opacity-50"></div>
          
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-green-400 to-emerald-500 rounded-2xl blur opacity-20"></div>
                <input
                  type="text"
                  value={plantName}
                  onChange={(e) => setPlantName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                  placeholder="Enter plant name (e.g., Rose, Oak Tree, Basil, Mango)"
                  className="relative w-full px-6 py-4 border-2 border-green-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 bg-white/80 backdrop-blur-sm text-lg"
                  disabled={isLoading}
                />
              </div>
              <button
                onClick={handleSubmit}
                disabled={isLoading || !plantName.trim()}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-4 text-lg font-semibold rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[140px]"
              >
                {isLoading ? (
                  <>
                    <Loader className="animate-spin h-5 w-5 mr-2" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Search className="h-5 w-5 mr-2" />
                    Analyze Plant
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-2xl mb-8">
            <div className="flex items-center">
              <AlertTriangle className="h-6 w-6 text-red-500 mr-3" />
              <div>
                <p className="text-red-700 font-medium">Error</p>
                <p className="text-red-600 text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {submitSuccess && (
          <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-2xl mb-8">
            <div className="flex items-center">
              <CheckCircle className="h-6 w-6 text-green-500 mr-3 animate-bounce" />
              <div>
                <p className="text-green-700 font-medium">
                  Plant data submitted successfully to greenhouse management system!
                </p>
                <p className="text-green-600 text-sm mt-1">
                  Redirecting to dashboard...
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Plant Information Display */}
        {plantInfo && (
          <div className="space-y-8">
            {/* Submit to Backend Button */}
            <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border border-white/20 flex justify-center">
              <button
                onClick={submitToBackend}
                disabled={isSubmitting}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-8 py-4 text-lg font-semibold rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isSubmitting ? (
                  <>
                    <Loader className="animate-spin h-5 w-5 mr-2" />
                    Submitting Data...
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5 mr-2" />
                    Submit to Greenhouse Management System
                  </>
                )}
              </button>
            </div>

            {/* Main Plant Info Card with Image */}
            <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/20 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-green-50/30 to-emerald-50/20 opacity-50"></div>
              
              <div className="relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                  {/* Plant Image */}
                  <div className="lg:col-span-1">
                    <div className="bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl p-4 shadow-lg">
                      {plantImage ? (
                        <div className="relative group">
                          <img 
                            src={plantImage} 
                            alt={`${plantName} plant`}
                            className="w-full h-64 object-cover rounded-xl shadow-md transition-transform duration-300 group-hover:scale-105"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                          <div className="hidden w-full h-64 bg-gray-100 rounded-xl items-center justify-center flex-col">
                            <Image className="h-12 w-12 text-gray-400 mb-2" />
                            <p className="text-gray-500 text-sm">Image not available</p>
                          </div>
                          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                            Photo by Unsplash
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-64 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center flex-col">
                          <Image className="h-12 w-12 text-gray-400 mb-2" />
                          <p className="text-gray-500 text-sm">No image available</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Plant Basic Info */}
                  <div className="lg:col-span-2">
                    <div className="flex items-center mb-6">
                      <div className="relative mr-4">
                        <div className="absolute -inset-2 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full blur opacity-20 animate-pulse"></div>
                        <TreePine className="relative h-8 w-8 text-green-600" />
                      </div>
                      <div>
                        <h2 className="text-3xl font-bold text-gray-800">{plantName}</h2>
                        {plantInfo.scientificName && (
                          <p className="text-xl text-gray-600 italic">{plantInfo.scientificName}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      {plantInfo.family && (
                        <div className="bg-green-50 p-4 rounded-xl">
                          <h4 className="font-semibold text-green-800 mb-2">Family</h4>
                          <p className="text-green-700">{plantInfo.family}</p>
                        </div>
                      )}
                      {plantInfo.type && (
                        <div className="bg-blue-50 p-4 rounded-xl">
                          <h4 className="font-semibold text-blue-800 mb-2">Type</h4>
                          <p className="text-blue-700">{plantInfo.type}</p>
                        </div>
                      )}
                      {plantInfo.nativeRegion && (
                        <div className="bg-purple-50 p-4 rounded-xl">
                          <h4 className="font-semibold text-purple-800 mb-2 flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            Native Region
                          </h4>
                          <p className="text-purple-700">{plantInfo.nativeRegion}</p>
                        </div>
                      )}
                      {plantInfo.commonNames && plantInfo.commonNames.length > 0 && (
                        <div className="bg-orange-50 p-4 rounded-xl">
                          <h4 className="font-semibold text-orange-800 mb-2">Common Names</h4>
                          <div className="flex flex-wrap gap-1">
                            {plantInfo.commonNames.slice(0, 3).map((name, index) => (
                              <span key={index} className="bg-orange-200 text-orange-800 px-2 py-1 rounded text-xs">
                                {name}
                              </span>
                            ))}
                            {plantInfo.commonNames.length > 3 && (
                              <span className="text-orange-600 text-xs">+{plantInfo.commonNames.length - 3} more</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {plantInfo.description && (
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-2xl">
                        <h3 className="text-xl font-semibold text-gray-800 mb-3">Description</h3>
                        <p className="text-gray-700 leading-relaxed">{plantInfo.description}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Greenhouse Suitability Assessment */}
            {plantInfo.greenhouseSuitability && (
              <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/20">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                  <Home className="h-6 w-6 text-green-600 mr-3" />
                  Greenhouse Cultivation Assessment
                </h2>
                
                <div className={`inline-flex items-center px-6 py-3 rounded-full font-semibold text-lg mb-6 ${getSuitabilityColor(plantInfo.greenhouseSuitability.suitable)}`}>
                  {getSuitabilityIcon(plantInfo.greenhouseSuitability.suitable)}
                  <span className="ml-2">
                    {plantInfo.greenhouseSuitability.suitable === 'yes' ? 'Excellent for Greenhouse' :
                     plantInfo.greenhouseSuitability.suitable === 'partial' ? 'Suitable with Conditions' : 'Challenging for Greenhouse'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    {plantInfo.greenhouseSuitability.recommendedConditions && (
                      <div className="bg-blue-50 p-4 rounded-xl">
                        <h4 className="font-semibold text-blue-800 mb-3">Recommended Conditions</h4>
                        <div className="space-y-2">
                          {plantInfo.greenhouseSuitability.recommendedConditions.humidity && (
                            <div className="flex items-center">
                              <Droplets className="h-4 w-4 text-blue-600 mr-2" />
                              <span className="text-sm text-blue-700">Humidity: {plantInfo.greenhouseSuitability.recommendedConditions.humidity}</span>
                            </div>
                          )}
                          {plantInfo.greenhouseSuitability.recommendedConditions.temperature && (
                            <div className="flex items-center">
                              <Thermometer className="h-4 w-4 text-red-600 mr-2" />
                              <span className="text-sm text-blue-700">Temperature: {plantInfo.greenhouseSuitability.recommendedConditions.temperature}</span>
                            </div>
                          )}
                          {plantInfo.greenhouseSuitability.recommendedConditions.spacing && (
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 text-green-600 mr-2" />
                              <span className="text-sm text-blue-700">Spacing: {plantInfo.greenhouseSuitability.recommendedConditions.spacing}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {plantInfo.greenhouseSuitability.tips && plantInfo.greenhouseSuitability.tips.length > 0 && (
                      <div className="bg-green-50 p-4 rounded-xl">
                        <h4 className="font-semibold text-green-800 mb-3">Greenhouse Tips</h4>
                        <ul className="space-y-1">
                          {plantInfo.greenhouseSuitability.tips.map((tip, index) => (
                            <li key={index} className="flex items-start text-sm text-green-700">
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2 mt-2 flex-shrink-0"></div>
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="space-y-6">
                    {plantInfo.greenhouseSuitability.challenges && plantInfo.greenhouseSuitability.challenges.length > 0 && (
                      <div className="bg-yellow-50 p-4 rounded-xl">
                        <h4 className="font-semibold text-yellow-800 mb-3">Potential Challenges</h4>
                        <ul className="space-y-1">
                          {plantInfo.greenhouseSuitability.challenges.map((challenge, index) => (
                            <li key={index} className="flex items-start text-sm text-yellow-700">
                              <AlertTriangle className="h-3 w-3 text-yellow-600 mr-2 mt-1 flex-shrink-0" />
                              {challenge}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {plantInfo.greenhouseSuitability.reasons && plantInfo.greenhouseSuitability.reasons.length > 0 && (
                      <div className="bg-purple-50 p-4 rounded-xl">
                        <h4 className="font-semibold text-purple-800 mb-3">Suitability Reasons</h4>
                        <ul className="space-y-1">
                          {plantInfo.greenhouseSuitability.reasons.map((reason, index) => (
                            <li key={index} className="flex items-start text-sm text-purple-700">
                              <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mr-2 mt-2 flex-shrink-0"></div>
                              {reason}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Fruit Bearing Information */}
            {plantInfo.fruitBearing && plantInfo.fruitBearing.isFruitBearing === 'yes' && (
              <div className="bg-gradient-to-r from-orange-50 to-red-50 p-8 rounded-3xl shadow-2xl border border-orange-200">
                <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                  <DollarSign className="h-7 w-7 text-orange-600 mr-3" />
                  Fruit Production & Market Analysis
                </h3>
                
                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                  {plantInfo.fruitBearing.timeToFruit && (
                    <div className="bg-white/80 p-4 rounded-xl shadow-md">
                      <h4 className="font-semibold text-orange-800 mb-2">Time to Fruit</h4>
                      <p className="text-orange-700 text-lg font-bold">{plantInfo.fruitBearing.timeToFruit}</p>
                    </div>
                  )}
                  {plantInfo.fruitBearing.estimatedMarketPrice && (
                    <div className="bg-white/80 p-4 rounded-xl shadow-md">
                      <h4 className="font-semibold text-green-800 mb-2">Market Price</h4>
                      <p className="text-green-700 text-lg font-bold">{plantInfo.fruitBearing.estimatedMarketPrice}</p>
                    </div>
                  )}
                  {plantInfo.fruitBearing.harvestSeason && (
                    <div className="bg-white/80 p-4 rounded-xl shadow-md">
                      <h4 className="font-semibold text-blue-800 mb-2">Harvest Season</h4>
                      <p className="text-blue-700 text-lg font-bold">{plantInfo.fruitBearing.harvestSeason}</p>
                    </div>
                  )}
                  {plantInfo.fruitBearing.peakValueMonth && (
                    <div className="bg-white/80 p-4 rounded-xl shadow-md">
                      <h4 className="font-semibold text-purple-800 mb-2">Peak Value Month</h4>
                      <p className="text-purple-700 text-lg font-bold">{plantInfo.fruitBearing.peakValueMonth}</p>
                    </div>
                  )}
                </div>

                {/* Monthly Market Value Table */}
                {plantInfo.fruitBearing.monthlyMarketData && plantInfo.fruitBearing.monthlyMarketData.length > 0 && (
                  <div className="bg-white/90 p-6 rounded-2xl shadow-lg mb-6">
                    <h4 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                      <Star className="h-5 w-5 text-yellow-500 mr-2" />
                      Monthly Market Value Analysis
                    </h4>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gradient-to-r from-orange-100 to-red-100">
                            <th className="border border-orange-200 px-4 py-3 text-left font-semibold text-gray-800">Month</th>
                            <th className="border border-orange-200 px-4 py-3 text-left font-semibold text-gray-800">Market Price</th>
                            <th className="border border-orange-200 px-4 py-3 text-left font-semibold text-gray-800">Availability</th>
                            <th className="border border-orange-200 px-4 py-3 text-left font-semibold text-gray-800">Demand Level</th>
                            <th className="border border-orange-200 px-4 py-3 text-left font-semibold text-gray-800">Value Trend</th>
                          </tr>
                        </thead>
                        <tbody>
                          {plantInfo.fruitBearing.monthlyMarketData.map((data, index) => {
                            const getBgColor = (trend, demand) => {
                              if (trend === 'Peak' || demand === 'Peak') return 'bg-green-100'
                              if (trend === 'Rising' && (demand === 'Very High' || demand === 'High')) return 'bg-orange-50'
                              if (trend === 'Rising') return 'bg-yellow-50'
                              if (trend === 'Declining') return 'bg-gray-50'
                              return 'bg-blue-50'
                            }
                            
                            const getTrendIcon = (trend) => {
                              switch(trend) {
                                case 'Rising': return '↗️ Rising'
                                case 'Declining': return '↘️ Declining'
                                case 'Peak': return '🚀 Peak'
                                case 'Stable': return '➡️ Stable'
                                default: return trend
                              }
                            }
                            
                            return (
                              <tr key={index} className={`${getBgColor(data.trend, data.demandLevel)} hover:bg-opacity-80 transition-colors`}>
                                <td className="border border-orange-200 px-4 py-2 font-medium">{data.month}</td>
                                <td className="border border-orange-200 px-4 py-2 font-bold text-green-700">{data.priceRange}</td>
                                <td className="border border-orange-200 px-4 py-2">{data.availability}</td>
                                <td className="border border-orange-200 px-4 py-2">{data.demandLevel}</td>
                                <td className="border border-orange-200 px-4 py-2 font-medium">{getTrendIcon(data.trend)}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Market Insights */}
                {plantInfo.fruitBearing.marketInsights && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Best Selling Months */}
                    {plantInfo.fruitBearing.marketInsights.bestSellingMonths && plantInfo.fruitBearing.marketInsights.bestSellingMonths.length > 0 && (
                      <div className="bg-green-100/80 p-5 rounded-xl">
                        <h5 className="font-bold text-green-800 mb-3 flex items-center">
                          📈 Best Selling Months
                        </h5>
                        <div className="space-y-2">
                          {plantInfo.fruitBearing.marketInsights.bestSellingMonths.map((item, index) => (
                            <div key={index} className="flex justify-between items-center">
                              <span className="text-green-700">{item.month}</span>
                              <span className="font-bold text-green-800">{item.priceRange}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Market Strategy Tips */}
                    {plantInfo.fruitBearing.marketInsights.strategyTips && plantInfo.fruitBearing.marketInsights.strategyTips.length > 0 && (
                      <div className="bg-blue-100/80 p-5 rounded-xl">
                        <h5 className="font-bold text-blue-800 mb-3 flex items-center">
                          💡 Market Strategy Tips
                        </h5>
                        <ul className="space-y-2 text-blue-700">
                          {plantInfo.fruitBearing.marketInsights.strategyTips.map((tip, index) => (
                            <li key={index} className="flex items-start">
                              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 mt-2 flex-shrink-0"></div>
                              <span className="text-sm">{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* ROI Calculator */}
                {plantInfo.fruitBearing.marketInsights?.revenueEstimates && (
                  <div className="bg-purple-100/80 p-5 rounded-xl mt-6">
                    <h5 className="font-bold text-purple-800 mb-3 flex items-center">
                      💰 Estimated Annual Revenue (per plant)
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {plantInfo.fruitBearing.marketInsights.revenueEstimates.conservative && (
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-700">{plantInfo.fruitBearing.marketInsights.revenueEstimates.conservative}</div>
                          <div className="text-purple-600 text-sm">Conservative Estimate</div>
                        </div>
                      )}
                      {plantInfo.fruitBearing.marketInsights.revenueEstimates.optimal && (
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-700">{plantInfo.fruitBearing.marketInsights.revenueEstimates.optimal}</div>
                          <div className="text-purple-600 text-sm">Optimal Management</div>
                        </div>
                      )}
                      {plantInfo.fruitBearing.marketInsights.revenueEstimates.premium && (
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-700">{plantInfo.fruitBearing.marketInsights.revenueEstimates.premium}</div>
                          <div className="text-purple-600 text-sm">Premium Quality</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Growing Conditions */}
            <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/20">
              <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <Sun className="h-6 w-6 text-yellow-500 mr-3" />
                Growing Conditions
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {plantInfo.sunRequirements && (
                  <div className="bg-yellow-50 p-4 rounded-xl">
                    <div className="flex items-center mb-2">
                      <Sun className="h-5 w-5 text-yellow-600 mr-2" />
                      <h4 className="font-semibold text-yellow-800">Sunlight</h4>
                    </div>
                    <p className="text-yellow-700">{plantInfo.sunRequirements}</p>
                  </div>
                )}
                
                {plantInfo.waterRequirements && (
                  <div className="bg-blue-50 p-4 rounded-xl">
                    <div className="flex items-center mb-2">
                      <Droplets className="h-5 w-5 text-blue-600 mr-2" />
                      <h4 className="font-semibold text-blue-800">Water</h4>
                    </div>
                    <p className="text-blue-700">{plantInfo.waterRequirements}</p>
                  </div>
                )}
                
                {plantInfo.temperatureRange && (
                  <div className="bg-amber-50 p-4 rounded-xl">
                    <div className="flex items-center mb-2">
                      <Thermometer className="h-5 w-5 text-amber-600 mr-2" />
                      <h4 className="font-semibold text-amber-800">Temperature</h4>
                    </div>
                    <p className="text-amber-700">{plantInfo.temperatureRange}</p>
                  </div>
                )}
                
                {plantInfo.soilType && (
                  <div className="bg-green-50 p-4 rounded-xl">
                    <div className="flex items-center mb-2">
                      <Leaf className="h-5 w-5 text-green-600 mr-2" />
                      <h4 className="font-semibold text-green-800">Soil</h4>
                    </div>
                    <p className="text-green-700">{plantInfo.soilType}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Plant Details Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Physical Characteristics */}
              <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border border-white/20">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Physical Characteristics</h3>
                <div className="space-y-3">
                  {plantInfo.height && (
                    <div>
                      <span className="font-semibold text-gray-700">Height: </span>
                      <span className="text-gray-600">{plantInfo.height}</span>
                    </div>
                  )}
                  {plantInfo.spread && (
                    <div>
                      <span className="font-semibold text-gray-700">Spread: </span>
                      <span className="text-gray-600">{plantInfo.spread}</span>
                    </div>
                  )}
                  {plantInfo.bloomingSeason && (
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 text-pink-500 mr-2" />
                      <span className="font-semibold text-gray-700">Blooming Season: </span>
                      <span className="text-gray-600 ml-1">{plantInfo.bloomingSeason}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Care Requirements */}
              <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border border-white/20">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                  <Scissors className="h-5 w-5 text-green-600 mr-2" />
                  Care Requirements
                </h3>
                <div className="space-y-3">
                  {plantInfo.fertilizer && (
                    <div>
                      <span className="font-semibold text-gray-700">Fertilizer: </span>
                      <span className="text-gray-600">{plantInfo.fertilizer}</span>
                    </div>
                  )}
                  {plantInfo.pruning && (
                    <div>
                      <span className="font-semibold text-gray-700">Pruning: </span>
                      <span className="text-gray-600">{plantInfo.pruning}</span>
                    </div>
                  )}
                  {plantInfo.propagation && (
                    <div>
                      <span className="font-semibold text-gray-700">Propagation: </span>
                      <span className="text-gray-600">{plantInfo.propagation}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Lists Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Care Instructions */}
              {plantInfo.careInstructions && plantInfo.careInstructions.length > 0 && (
                <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border border-white/20">
                  <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                    Care Instructions
                  </h3>
                  <ul className="space-y-2">
                    {plantInfo.careInstructions.map((instruction, index) => (
                      <li key={index} className="flex items-start">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                        <span className="text-gray-700">{instruction}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Common Problems */}
              {plantInfo.commonProblems && plantInfo.commonProblems.length > 0 && (
                <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border border-white/20">
                  <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                    <Bug className="h-5 w-5 text-orange-600 mr-2" />
                    Common Problems
                  </h3>
                  <ul className="space-y-2">
                    {plantInfo.commonProblems.map((problem, index) => (
                      <li key={index} className="flex items-start">
                        <div className="w-2 h-2 bg-orange-500 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                        <span className="text-gray-700">{problem}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Benefits and Additional Info */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Benefits */}
              {plantInfo.benefits && plantInfo.benefits.length > 0 && (
                <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border border-white/20">
                  <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                    <Sparkles className="h-5 w-5 text-purple-600 mr-2" />
                    Benefits & Uses
                  </h3>
                  <ul className="space-y-2">
                    {plantInfo.benefits.map((benefit, index) => (
                      <li key={index} className="flex items-start">
                        <div className="w-2 h-2 bg-purple-500 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                        <span className="text-gray-700">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Toxicity & Safety */}
              <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border border-white/20">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                  <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                  Safety Information
                </h3>
                <div className="bg-red-50 p-4 rounded-xl">
                  <p className="text-red-800 font-medium">Toxicity:</p>
                  <p className="text-red-700 mt-1">{plantInfo.toxicity || 'No toxicity information available'}</p>
                </div>
              </div>
            </div>

            {/* Companion Plants */}
            {plantInfo.companionPlants && plantInfo.companionPlants.length > 0 && (
              <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border border-white/20">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                  <TreePine className="h-5 w-5 text-green-600 mr-2" />
                  Companion Plants
                </h3>
                <div className="flex flex-wrap gap-3">
                  {plantInfo.companionPlants.map((companion, index) => (
                    <span key={index} className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 px-4 py-2 rounded-full font-medium">
                      {companion}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Editable Form Section */}
            <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/20">
              <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <FileText className="h-6 w-6 text-blue-600 mr-3" />
                Customize Plant Data for Greenhouse
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-700 border-b pb-2">Basic Information</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tree Species</label>
                    <input
                      type="text"
                      value={formData.treeSpecies}
                      onChange={(e) => handleFormChange('treeSpecies', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
                    <input
                      type="text"
                      value={formData.purpose}
                      onChange={(e) => handleFormChange('purpose', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="e.g., Fruit Production, Ornamental, Medicinal"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expected Height</label>
                    <input
                      type="text"
                      value={formData.expectedHeight}
                      onChange={(e) => handleFormChange('expectedHeight', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Root Spread</label>
                    <input
                      type="text"
                      value={formData.rootSpread}
                      onChange={(e) => handleFormChange('rootSpread', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Available Space</label>
                    <input
                      type="text"
                      value={formData.availableSpace}
                      onChange={(e) => handleFormChange('availableSpace', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="e.g., 10m x 5m"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Market Price</label>
                    <input
                      type="text"
                      value={formData.marketPrice}
                      onChange={(e) => handleFormChange('marketPrice', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="e.g., $5-15/kg"
                    />
                  </div>
                </div>

                {/* Growing Conditions */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-700 border-b pb-2">Growing Conditions</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sunlight Needs</label>
                    <input
                      type="text"
                      value={formData.sunlightNeeds}
                      onChange={(e) => handleFormChange('sunlightNeeds', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Watering Frequency</label>
                    <input
                      type="text"
                      value={formData.wateringFrequency}
                      onChange={(e) => handleFormChange('wateringFrequency', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Temperature Range</label>
                    <input
                      type="text"
                      value={formData.temperatureRange}
                      onChange={(e) => handleFormChange('temperatureRange', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Humidity Preference</label>
                    <input
                      type="text"
                      value={formData.humidityPreference}
                      onChange={(e) => handleFormChange('humidityPreference', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="e.g., 60-80%"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Planting Date</label>
                    <input
                      type="date"
                      value={formData.plantingDate}
                      onChange={(e) => handleFormChange('plantingDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Soil Type Required</label>
                    <input
                      type="text"
                      value={formData.soilTypeRequired}
                      onChange={(e) => handleFormChange('soilTypeRequired', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>

                {/* Advanced Settings */}
                <div className="md:col-span-2 space-y-4">
                  <h4 className="text-lg font-semibold text-gray-700 border-b pb-2">Advanced Settings</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Planting Method</label>
                      <input
                        type="text"
                        value={formData.plantingMethod}
                        onChange={(e) => handleFormChange('plantingMethod', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="e.g., Direct sowing, Transplant"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Drainage System</label>
                      <input
                        type="text"
                        value={formData.drainageSystem}
                        onChange={(e) => handleFormChange('drainageSystem', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="e.g., Good drainage required"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Support Structures</label>
                      <input
                        type="text"
                        value={formData.supportStructures}
                        onChange={(e) => handleFormChange('supportStructures', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="e.g., Trellis, Stakes"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Current Soil Type</label>
                      <input
                        type="text"
                        value={formData.currentSoilType}
                        onChange={(e) => handleFormChange('currentSoilType', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="e.g., Loamy soil"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Pest Control</label>
                      <input
                        type="text"
                        value={formData.pestControl}
                        onChange={(e) => handleFormChange('pestControl', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="e.g., Organic methods preferred"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Pollination Method</label>
                      <input
                        type="text"
                        value={formData.pollinationMethod}
                        onChange={(e) => handleFormChange('pollinationMethod', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="e.g., Self-pollinating, Bee pollination"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Support Description</label>
                      <textarea
                        value={formData.supportDescription}
                        onChange={(e) => handleFormChange('supportDescription', e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="Detailed description of support structures needed..."
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fertilizer Plan</label>
                      <textarea
                        value={formData.fertilizerPlan}
                        onChange={(e) => handleFormChange('fertilizerPlan', e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="Detailed fertilizer application plan..."
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Pruning Schedule</label>
                      <textarea
                        value={formData.pruningSchedule}
                        onChange={(e) => handleFormChange('pruningSchedule', e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="Detailed pruning schedule and techniques..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Loading Indicator */}
            {isLoading && (
              <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/20 text-center">
                <div className="flex items-center justify-center mb-4">
                  <Loader className="animate-spin h-8 w-8 text-green-600 mr-3" />
                  <div>
                    <p className="text-xl font-semibold text-gray-800">Analyzing Plant Information</p>
                    <p className="text-gray-600 mt-1">Fetching data from Gemini Pro and Unsplash APIs...</p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full animate-pulse w-3/4"></div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}