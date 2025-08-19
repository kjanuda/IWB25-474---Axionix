import React, { useState, useEffect } from 'react';
import {
  Leaf,
  ArrowRight,
  Users,
  Target,
  Zap,
  Globe
} from 'lucide-react';
import greenVideo from './images/green.mp4';

const HomeHeader = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStat, setCurrentStat] = useState(0);

  const stats = [
    { icon: Users, value: '500+', label: 'Innovators Connected' },
    { icon: Target, value: '100M', label: 'CO₂ Reduced (tons)' },
    { icon: Zap, value: '50+', label: 'Projects Funded' },
    { icon: Globe, value: '25', label: 'Countries Reached' }
  ];

  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      setCurrentStat((prev) => (prev + 1) % stats.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="relative w-full h-screen overflow-hidden bg-gradient-to-br from-emerald-900 via-green-800 to-teal-900">
      {/* Animated Background Circles */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-20 w-32 h-32 bg-green-400 rounded-full mix-blend-multiply filter blur-xl animate-pulse" />
        <div
          className="absolute top-40 right-20 w-48 h-48 bg-emerald-400 rounded-full mix-blend-multiply filter blur-xl animate-pulse"
          style={{ animationDelay: '2s' }}
        />
        <div
          className="absolute bottom-40 left-1/3 w-40 h-40 bg-teal-400 rounded-full mix-blend-multiply filter blur-xl animate-pulse"
          style={{ animationDelay: '4s' }}
        />
      </div>

      {/* Background Video */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-black/40 z-10" />
        <video
          src={greenVideo}
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover"
        />
      </div>

      {/* Content */}
      <div className="relative z-20 flex items-center h-full px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid lg:grid-cols-2 gap-8 xl:gap-12 items-center h-full">
            {/* Left: Headline + CTA */}
            <div className="space-y-6 lg:space-y-8">
              {/* Animated Headline */}
              <br></br><br></br>
              <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
                <div className="inline-flex items-center space-x-3 bg-green-500/20 backdrop-blur-sm rounded-full px-4 py-2 mb-4 lg:mb-6">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-green-400 text-sm font-medium">Climate Innovation Hub</span>
                </div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl font-bold text-white leading-tight">
                  <span className="block">A climate</span>
                  <span className="relative block">
                    <span className="bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent">
                      innovation
                    </span>
                    <div className="absolute -top-2 -right-2 sm:-top-3 sm:-right-3 lg:-top-4 lg:-right-4">
                      <div className="w-2 h-2 sm:w-3 sm:h-3 lg:w-4 lg:h-4 bg-green-400 rounded-full animate-ping" />
                    </div>
                  </span>
                  <span className="block">ecosystem</span>
                </h1>
              </div>

              {/* Description */}
              <div className={`transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
                <p className="text-lg sm:text-xl lg:text-2xl text-gray-200 leading-relaxed max-w-2xl">
                  We connect climate tech innovators, investors, committed corporates, and government agencies to
                  <span className="text-green-400 font-semibold"> accelerate climate innovation</span>.
                </p>
              </div>

              {/* CTA Buttons */}
              <div className={`flex flex-col sm:flex-row gap-4 transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
                <button className="group px-6 py-3 sm:px-8 sm:py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-full font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-2xl flex items-center space-x-2">
                  <span>Join the Movement</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button className="px-6 py-3 sm:px-8 sm:py-4 border-2 border-white/30 hover:border-green-400/60 text-white hover:text-green-400 rounded-full font-semibold backdrop-blur-sm hover:bg-white/10 transition-all duration-300 transform hover:scale-105">
                  Explore Projects
                </button>
              </div>

              {/* Feature Tags */}
              <div className={`transition-all duration-1000 delay-700 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
                <div className="flex flex-wrap gap-3 sm:gap-4 lg:gap-6 mt-6 lg:mt-8">
                  {[
                    { icon: Users, text: 'Connect Innovators' },
                    { icon: Target, text: 'Impact Focused' },
                    { icon: Zap, text: 'Accelerate Growth' },
                    { icon: Globe, text: 'Global Reach' }
                  ].map((feature, index) => {
                    const Icon = feature.icon;
                    return (
                      <div
                        key={index}
                        className="flex items-center space-x-2 sm:space-x-3 bg-white/10 backdrop-blur-sm rounded-full px-3 py-2 sm:px-4 sm:py-2 hover:bg-white/20 transition-all duration-300"
                      >
                        <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                        <span className="text-white text-xs sm:text-sm font-medium">{feature.text}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: Stats */}
            <div className="lg:justify-self-end">
              <div className={`transition-all duration-1000 delay-900 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}>
                <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-sm lg:max-w-md">
                  {stats.map((stat, index) => {
                    const Icon = stat.icon;
                    const isActive = currentStat === index;
                    return (
                      <div
                        key={index}
                        className={`p-4 sm:p-6 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 transition-all duration-500 hover:bg-white/20 cursor-pointer ${
                          isActive ? 'transform scale-105 bg-white/20 border-green-400/50 shadow-2xl' : ''
                        }`}
                      >
                        <div className="flex flex-col space-y-2 sm:space-y-3">
                          <div
                            className={`p-2 sm:p-3 rounded-xl transition-all duration-300 ${
                              isActive ? 'bg-green-500/30 scale-110' : 'bg-white/20'
                            }`}
                          >
                            <Icon
                              className={`w-5 h-5 sm:w-6 sm:h-6 transition-colors duration-300 ${
                                isActive ? 'text-green-400' : 'text-white'
                              }`}
                            />
                          </div>
                          <div>
                            <div
                              className={`text-xl sm:text-2xl font-bold transition-colors duration-300 ${
                                isActive ? 'text-green-400' : 'text-white'
                              }`}
                            >
                              {stat.value}
                            </div>
                            <div className="text-xs sm:text-sm text-gray-300 leading-tight">{stat.label}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Leaf Button */}
      

      {/* Scroll Indicator */}
      <div className="absolute bottom-6 sm:bottom-8 left-1/2 transform -translate-x-1/2 z-20">
        <div className="flex flex-col items-center space-y-2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/70 rounded-full mt-2 animate-pulse" />
          </div>
          <span className="text-white/70 text-xs sm:text-sm">Scroll to explore</span>
        </div>
      </div>
    </header>
  );
};

export default HomeHeader;
