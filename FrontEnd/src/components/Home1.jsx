import React, { useState, useEffect } from 'react';
import { ChevronDown, Play, Pause, ArrowRight, Leaf, Cpu, Globe, Home, Cog, Wrench, Smartphone, Download } from 'lucide-react';

// Import your actual images
import image1 from './images/1.jpg';
import image2 from './images/2.jpg';
import image3 from './images/3.jpg';
import image4 from './images/4.jpg';
import image5 from './images/5.jpg';
import image6 from './images/6.jpg';
import image8 from './images/app1.png';

// Mobile App Section Component
const MobileAppSection = () => {
  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-white">
      <div className="container mx-auto px-4">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          {/* Left Content */}
          <div className="flex-1 lg:pr-8">
            <div className="mb-8">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                <span className="text-green-600">EcoGreen360</span> Mobile App
              </h2>
              <p className="text-lg md:text-xl text-gray-600 leading-relaxed mb-8">
                A platform to encourage communities to grow, manage monitor healthy 
                fresh greens via controlled greenhouses and self sustaining home units. 
                Manage crops seamlessly and monitor critical parameters optimising 
                plant growth in real-time. Be in touch with EcoGreen360 specialists instantly 
                and support us in building a community of growers.
              </p>
            </div>

            {/* Features List */}
            <div className="mb-8">
              <ul className="space-y-4">
                <li className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-gray-700">Real-time monitoring of greenhouse conditions</span>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-gray-700">Seamless crop management system</span>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-gray-700">Direct access to EcoGreen360 specialists</span>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-gray-700">Community of growers network</span>
                </li>
              </ul>
            </div>

            {/* Download Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <a 
                href="#" 
                className="flex items-center justify-center space-x-3 bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors duration-300 shadow-lg hover:shadow-xl"
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                  <div>
                    <div className="text-xs">Download on the</div>
                    <div className="text-sm font-semibold">App Store</div>
                  </div>
                </div>
              </a>
              
              <a 
                href="#" 
                className="flex items-center justify-center space-x-3 bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors duration-300 shadow-lg hover:shadow-xl"
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.92 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                  </svg>
                  <div>
                    <div className="text-xs">Android App on</div>
                    <div className="text-sm font-semibold">Google Play</div>
                  </div>
                </div>
              </a>
            </div>
          </div>

          {/* Right Content - Mobile Phones */}
          <div className="flex-1 flex justify-center lg:justify-end">
            <div className="relative mt-8">
              {/* Main Phone Image */}
              <div className="relative z-10">
                <img 
                  src={image8} 
                  alt="EcoGreen360 Mobile App" 
                  className="w-96 h-auto max-w-full object-contain drop-shadow-2xl transform scale-110"
                />
              </div>
              
              {/* Floating Elements */}
              <div className="absolute -top-4 -left-4 w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                <Leaf className="w-8 h-8 text-white" />
              </div>
              
              <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                <Smartphone className="w-6 h-6 text-white" />
              </div>
              
              {/* Background Gradient Circle */}
              <div className="absolute inset-0 -z-10 bg-gradient-to-br from-green-100 to-emerald-50 rounded-full transform scale-110 opacity-50"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// Services Component
const Services = () => {
  const services = [
    {
      id: 1,
      icon: <Home className="w-12 h-12 text-white mb-4" />,
      title: "Greenhouse Solutions",
      subtitle: "Grow Beyond Boundaries",
      image: image1,
      description: "Advanced greenhouse technology for optimal growing conditions"
    },
    {
      id: 2,
      icon: <Cog className="w-12 h-12 text-white mb-4" />,
      title: "Smart Equipment",
      subtitle: "Smart Farming Essentials",
      image: image2,
      description: "Cutting-edge agricultural equipment for modern farming"
    },
    {
      id: 3,
      icon: <Leaf className="w-12 h-12 text-white mb-4" />,
      title: "Fresh Produce",
      subtitle: "Nature's Finest Produce",
      image: image3,
      description: "Premium quality organic produce from sustainable farming"
    },
    {
      id: 4,
      icon: <Wrench className="w-12 h-12 text-white mb-4" />,
      title: "Expert Services",
      subtitle: "Expert Agricultural Services",
      image: image4,
      description: "Professional consulting and maintenance services"
    }
  ];

  return (
    <div className="w-full py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service) => (
            <div
              key={service.id}
              className="relative group overflow-hidden rounded-xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 cursor-pointer"
            >
              {/* Background Image */}
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                style={{
                  backgroundImage: `url(${service.image})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat'
                }}
              />
              
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20 group-hover:from-black/90 group-hover:via-black/50 group-hover:to-black/30 transition-all duration-500" />
              
              {/* Content */}
              <div className="relative z-10 p-8 h-80 flex flex-col justify-between text-white">
                {/* Top Section with Icon */}
                <div className="flex flex-col items-start">
                  <div className="transform group-hover:scale-110 transition-transform duration-300">
                    {service.icon}
                  </div>
                  <h3 className="text-2xl font-bold mb-2 group-hover:text-green-400 transition-colors duration-300">
                    {service.title}
                  </h3>
                  <p className="text-gray-200 text-sm font-medium mb-2">
                    {service.subtitle}
                  </p>
                  <p className="text-gray-300 text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {service.description}
                  </p>
                </div>
                
                {/* Bottom Section with Button */}
                <div className="mt-auto">
                  <button className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
                    Discover More
                  </button>
                </div>
              </div>
              
              {/* Hover Effect Border */}
              <div className="absolute inset-0 border-2 border-transparent group-hover:border-green-400 rounded-xl transition-all duration-300" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Header Component
const EcoGreen360Header = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isZooming, setIsZooming] = useState(false);

  // Images array
  const images = [image1, image2, image3, image4, image5, image6];

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
          prevIndex === images.length - 1 ? 0 : prevIndex + 1
        );
        setIsZooming(false);
      }, 800);
    }, 6000);

    return () => clearInterval(interval);
  }, [isPlaying, images.length]);

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

  // Scroll to services section
  const scrollToServices = () => {
    const servicesSection = document.getElementById('services-section');
    if (servicesSection) {
      servicesSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black">
      {/* Background Images */}
      <div className="absolute inset-0 z-10">
        {images.map((image, index) => (
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
      <div className="relative z-30 flex flex-col items-center justify-center h-full px-6 text-center">
        {/* Logo/Icon */}
        <div className="mb-8 relative">
          <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl">
            <Leaf size={40} className="text-white" />
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full flex items-center justify-center">
            <Cpu size={16} className="text-white" />
          </div>
        </div>

        {/* Main Title */}
        <div className="mb-6">
          <h1 className="text-6xl md:text-8xl font-bold text-white mb-4 bg-gradient-to-r from-green-400 via-emerald-500 to-teal-400 bg-clip-text text-transparent">
            EcoGreen360
          </h1>
          <div className="w-32 h-1 bg-gradient-to-r from-green-400 to-emerald-600 mx-auto rounded-full" />
        </div>

        {/* Subtitle */}
        <div className="mb-8">
          <h2 className="text-2xl md:text-4xl font-semibold text-white mb-4">
            Revolutionizing Agriculture with Advanced Technology
          </h2>
          <p className="text-lg md:text-xl text-gray-200 max-w-4xl mx-auto leading-relaxed">
            At EcoGreen360, we blend innovative technology with sustainable practices to reshape the future of farming. 
            Step into a world where agricultural tradition meets technological revolution, fostering a greener future for all.
          </p>
        </div>

        {/* Dynamic Slide Content */}
        <div className="mb-12">
          <h3 className="text-xl md:text-2xl font-medium text-green-300 mb-2">
            {titles[currentImageIndex]}
          </h3>
          <p className="text-gray-300 max-w-2xl mx-auto">
            {subtitles[currentImageIndex]}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-12">
          <button 
            onClick={scrollToServices}
            className="group px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center space-x-2 justify-center"
          >
            <span>Explore Solutions</span>
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
          <button className="px-8 py-4 border-2 border-white text-white rounded-full font-semibold hover:bg-white hover:text-gray-900 transition-all duration-300 flex items-center space-x-2 justify-center">
            <Globe size={20} />
            <span>Learn More</span>
          </button>
        </div>

        {/* Slide Indicators */}
        <div className="flex items-center space-x-4 mb-8">
          <button
            onClick={togglePlayPause}
            className="p-3 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-all duration-300 group"
          >
            {isPlaying ? (
              <Pause size={20} className="group-hover:scale-110 transition-transform" />
            ) : (
              <Play size={20} className="group-hover:scale-110 transition-transform" />
            )}
          </button>
          
          <div className="flex space-x-2">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentImageIndex
                    ? 'bg-white scale-125'
                    : 'bg-white/50 hover:bg-white/75'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Scroll Indicator */}
        <div>
          <ChevronDown 
            size={32} 
            className="text-white/70 hover:text-white transition-colors cursor-pointer animate-bounce" 
            onClick={scrollToServices}
          />
        </div>
      </div>
    </div>
  );
};

// Main Home1 Component
const Home1 = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <EcoGreen360Header />
      
      {/* Services Section */}
      <section id="services-section" className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Our <span className="text-green-600">Services</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Discover our comprehensive range of agricultural technology solutions designed to revolutionize your farming operations
            </p>
          </div>
          <Services />
        </div>
      </section>

      {/* Mobile App Section */}
      <MobileAppSection />

      {/* Call-to-Action Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">
            Ready to Transform Your <span className="text-green-600">Agriculture</span>?
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Join thousands of farmers who have already embraced the future of agriculture with EcoGreen360's innovative solutions.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
              Start Your Journey
            </button>
            <button className="px-8 py-4 bg-transparent border-2 border-green-500 text-green-500 hover:bg-green-500 hover:text-white font-semibold rounded-full transition-all duration-300">
              Contact Us
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home1;