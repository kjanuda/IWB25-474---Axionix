import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Play, Pause, ArrowRight, Leaf, Brain, Droplets, Sun, BarChart3, Shield, Zap, CheckCircle, Cpu } from 'lucide-react';
import image1 from './images/1.jpg';
import image2 from './images/2.jpg';
import image3 from './images/3.jpg';
import image4 from './images/4.jpg';
import image5 from './images/5.jpg';
import image6 from './images/6.jpg';

const ExploreSolutions = () => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [hoveredSolution, setHoveredSolution] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isZooming, setIsZooming] = useState(false);

  // Images array
  const headerImages = [image1, image2, image3, image4, image5, image6];

  // Content for each slide
  const titles = [
    'Smart Farming Solutions',
    'Precision Agriculture',
    'Sustainable Innovation',
    'Future-Ready Technology',
    'Data-Driven Growth',
    'Green Tech Revolution'
  ];

  const subtitles = [
    'Transforming traditional farming with AI-powered insights',
    'Optimize every aspect of your agricultural operations',
    'Eco-friendly solutions for maximum yield',
    'Advanced sensors and automation systems',
    'Real-time analytics for better decision making',
    'Leading the agricultural technology revolution'
  ];

  // Slideshow effect
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setIsZooming(true);
      
      setTimeout(() => {
        setCurrentImageIndex((prevIndex) => 
          prevIndex === headerImages.length - 1 ? 0 : prevIndex + 1
        );
        setIsZooming(false);
      }, 800);
    }, 6000);

    return () => clearInterval(interval);
  }, [isPlaying, headerImages.length]);

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const goToSlide = (index) => {
    setIsZooming(true);
    setTimeout(() => {
      setCurrentImageIndex(index);
      setIsZooming(false);
    }, 400);
  };

  // Scroll to solutions section
  const scrollToSolutions = () => {
    const solutionsSection = document.getElementById('solutions-section');
    if (solutionsSection) {
      solutionsSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const categories = [
    { id: 'all', name: 'All Solutions', icon: Leaf },
    { id: 'ai', name: 'AI & Analytics', icon: Brain },
    { id: 'irrigation', name: 'Smart Irrigation', icon: Droplets },
    { id: 'monitoring', name: 'Crop Monitoring', icon: Sun },
    { id: 'management', name: 'Farm Management', icon: BarChart3 }
  ];

  const solutions = [
    {
      id: 1,
      category: 'ai',
      title: 'AI Crop Prediction',
      subtitle: 'Predictive Analytics for Optimal Yields',
      description: 'Leverage machine learning algorithms to predict crop yields, optimize planting schedules, and maximize harvest potential.',
      features: ['Weather pattern analysis', 'Soil condition monitoring', 'Growth stage tracking', 'Yield forecasting'],
      impact: '35% increase in crop yields',
      icon: Brain,
      gradient: 'from-blue-500 to-purple-600',
      bgImage: image1
    },
    {
      id: 2,
      category: 'irrigation',
      title: 'Smart Water Management',
      subtitle: 'Precision Irrigation Systems',
      description: 'Automated irrigation systems that deliver the right amount of water at the right time, reducing waste and optimizing plant health.',
      features: ['Soil moisture sensors', 'Weather-based scheduling', 'Remote control access', 'Water usage analytics'],
      impact: '40% water savings',
      icon: Droplets,
      gradient: 'from-cyan-500 to-blue-600',
      bgImage: image2
    },
    {
      id: 3,
      category: 'monitoring',
      title: 'Drone Surveillance',
      subtitle: 'Aerial Crop Monitoring',
      description: 'Advanced drone technology for real-time crop health assessment, pest detection, and field mapping.',
      features: ['High-resolution imaging', 'Thermal analysis', 'Automated flight paths', 'Disease detection'],
      impact: '60% faster issue detection',
      icon: Sun,
      gradient: 'from-orange-500 to-red-600',
      bgImage: image3
    },
    {
      id: 4,
      category: 'ai',
      title: 'Pest & Disease Alert',
      subtitle: 'AI-Powered Threat Detection',
      description: 'Early warning system that identifies potential threats to crops before they become critical problems.',
      features: ['Image recognition AI', 'Real-time alerts', 'Treatment recommendations', 'Historical data analysis'],
      impact: '70% reduction in crop loss',
      icon: Shield,
      gradient: 'from-green-500 to-emerald-600',
      bgImage: image4
    },
    {
      id: 5,
      category: 'management',
      title: 'Farm Analytics Dashboard',
      subtitle: 'Comprehensive Farm Management',
      description: 'Centralized platform for monitoring all aspects of your farm operations with actionable insights and recommendations.',
      features: ['Real-time data visualization', 'Performance metrics', 'Cost analysis', 'Productivity tracking'],
      impact: '25% operational efficiency gain',
      icon: BarChart3,
      gradient: 'from-indigo-500 to-purple-600',
      bgImage: image5
    },
    {
      id: 6,
      category: 'irrigation',
      title: 'Solar-Powered Systems',
      subtitle: 'Sustainable Energy Solutions',
      description: 'Eco-friendly solar-powered irrigation and monitoring systems that reduce carbon footprint and operational costs.',
      features: ['Solar panel integration', 'Battery backup systems', 'Energy monitoring', 'Grid independence'],
      impact: '80% energy cost reduction',
      icon: Zap,
      gradient: 'from-yellow-500 to-orange-600',
      bgImage: image6
    }
  ];

  const filteredSolutions = activeCategory === 'all' 
    ? solutions 
    : solutions.filter(solution => solution.category === activeCategory);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      {/* Hero Section */}
      <div className="relative h-screen w-full overflow-hidden bg-black pt-20">
        {/* Background Images */}
        <div className="absolute inset-0 z-10">
          {headerImages.map((image, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
                index === currentImageIndex 
                  ? 'opacity-100' 
                  : 'opacity-0'
              } ${isZooming ? 'scale-110' : 'scale-100'}`}
              style={{
                backgroundImage: `url(${image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
            />
          ))}
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/70 via-black/50 to-teal-900/70" />
        </div>

        {/* Main Content */}
        <div className="relative z-30 flex flex-col items-center justify-center h-full px-6 text-center pt-16">
          {/* Logo/Icon */}
          <div className="mb-6 relative">
            <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl">
              <Leaf size={36} className="text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-7 h-7 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full flex items-center justify-center">
              <Cpu size={14} className="text-white" />
            </div>
          </div>

          {/* Main Title */}
          <div className="mb-4">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-3 bg-gradient-to-r from-green-400 via-emerald-500 to-teal-400 bg-clip-text text-transparent">
              EcoGreen360
            </h1>
            <div className="w-28 h-1 bg-gradient-to-r from-green-400 to-emerald-600 mx-auto rounded-full" />
          </div>

          {/* Subtitle */}
          <div className="mb-6">
            <h2 className="text-xl md:text-3xl font-semibold text-white mb-3">
              Revolutionizing Agriculture with Advanced Technology
            </h2>
            <p className="text-base md:text-lg text-gray-200 max-w-3xl mx-auto leading-relaxed">
              At EcoGreen360, we blend innovative technology with sustainable practices to reshape the future of farming. 
              Step into a world where agricultural tradition meets technological revolution, fostering a greener future for all.
            </p>
          </div>

          {/* Dynamic Slide Content */}
          <div className="mb-8">
            <h3 className="text-lg md:text-xl font-medium text-green-300 mb-2">
              {titles[currentImageIndex]}
            </h3>
            <p className="text-gray-300 max-w-xl mx-auto text-sm md:text-base">
              {subtitles[currentImageIndex]}
            </p>
          </div>

          {/* Slide Indicators */}
          <div className="flex items-center space-x-4 mb-6">
            <button
              onClick={togglePlayPause}
              className="p-2.5 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-all duration-300 group"
            >
              {isPlaying ? (
                <Pause size={18} className="group-hover:scale-110 transition-transform" />
              ) : (
                <Play size={18} className="group-hover:scale-110 transition-transform" />
              )}
            </button>
            
            <div className="flex space-x-2">
              {headerImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                    index === currentImageIndex
                      ? 'bg-white scale-125'
                      : 'bg-white/50 hover:bg-white/75'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="mt-4">
            <ChevronDown 
              size={28} 
              className="text-white/70 hover:text-white transition-colors cursor-pointer animate-bounce" 
              onClick={scrollToSolutions}
            />
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="max-w-7xl mx-auto px-6 py-12" id="solutions-section">
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`flex items-center space-x-2 px-6 py-3 rounded-full transition-all duration-300 transform hover:scale-105 ${
                  activeCategory === category.id
                    ? 'bg-green-600 text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-green-50 border border-gray-200'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{category.name}</span>
              </button>
            );
          })}
        </div>

        {/* Solutions Grid */}
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
          {filteredSolutions.map((solution) => {
            const Icon = solution.icon;
            return (
              <div
                key={solution.id}
                className="group relative overflow-hidden rounded-xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 cursor-pointer h-96"
                onMouseEnter={() => setHoveredSolution(solution.id)}
                onMouseLeave={() => setHoveredSolution(null)}
              >
                {/* Background Image */}
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                  style={{
                    backgroundImage: `url(${solution.bgImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                />
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/25 group-hover:from-black/90 group-hover:via-black/55 group-hover:to-black/35 transition-all duration-500" />
                
                {/* Content */}
                <div className="relative z-10 p-6 h-full flex flex-col justify-between text-white">
                  {/* Top Section with Icon */}
                  <div className="flex flex-col items-start">
                    <div className="flex items-start justify-between w-full mb-4">
                      <div className={`p-3 rounded-lg bg-gradient-to-r ${solution.gradient} shadow-lg transform group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${solution.gradient} text-white shadow-lg`}>
                        {solution.impact}
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-bold mb-2 group-hover:text-green-300 transition-colors duration-300 leading-tight">
                      {solution.title}
                    </h3>
                    <p className="text-gray-200 text-sm font-medium mb-3 leading-relaxed">
                      {solution.subtitle}
                    </p>
                    
                    {/* Description - Shows on hover */}
                    <p className="text-gray-300 text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-300 mb-3 leading-relaxed line-clamp-3">
                      {solution.description}
                    </p>
                    
                    {/* Features - Only show top 2 on hover */}
                    <div className="space-y-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      {solution.features.slice(0, 2).map((feature, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" />
                          <span className="text-xs text-gray-300 leading-tight">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Bottom Section with Button */}
                  <div className="mt-auto">
                    <button className={`w-full bg-gradient-to-r ${solution.gradient} hover:shadow-lg text-white px-4 py-2.5 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center space-x-2 text-sm`}>
                      <span>Discover More</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                
                {/* Hover Effect Border */}
                <div className="absolute inset-0 border-2 border-transparent group-hover:border-green-400/50 rounded-xl transition-all duration-300" />
              </div>
            );
          })}
        </div>

        {/* Call to Action */}
        <div className="mt-20 text-center bg-gradient-to-r from-green-600 to-emerald-700 rounded-3xl p-12 text-white">
          <h2 className="text-4xl font-bold mb-4">Ready to Transform Your Farm?</h2>
          <p className="text-xl text-green-100 mb-8 max-w-2xl mx-auto">
            Join thousands of farmers who have revolutionized their operations with EcoGreen360's smart solutions.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-green-700 px-8 py-4 rounded-xl font-semibold hover:bg-green-50 transition-colors duration-300 flex items-center justify-center space-x-2">
              <span>Schedule Consultation</span>
              <ChevronRight className="w-5 h-5" />
            </button>
            <button className="border-2 border-white text-white px-8 py-4 rounded-xl font-semibold hover:bg-white hover:text-green-700 transition-colors duration-300">
              Download Brochure
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExploreSolutions;