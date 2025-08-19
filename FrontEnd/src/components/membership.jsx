import React, { useState, useEffect } from 'react';
import { Users, Building2, Lightbulb, Target, ArrowRight, MapPin, Video, Handshake, Zap, Globe, Heart, Rocket, TreePine } from 'lucide-react';

const Collaboration = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentBenefit, setCurrentBenefit] = useState(0);

  const benefits = [
    { 
      icon: Users, 
      title: 'Collaboration Hub', 
      description: 'Connect with climate innovators across sectors',
      stat: '500+',
      label: 'Active Members'
    },
    { 
      icon: Lightbulb, 
      title: 'Innovation Space', 
      description: 'Share ideas and drive impactful change',
      stat: '50+',
      label: 'Projects Launched'
    },
    { 
      icon: Target, 
      title: 'Climate Action', 
      description: 'Scale climate solutions into real action',
      stat: '25+',
      label: 'Solutions Deployed'
    },
    { 
      icon: Building2, 
      title: 'Sydney Hub', 
      description: 'Premium workspace in the heart of Sydney',
      stat: '24/7',
      label: 'Access Available'
    }
  ];

  const features = [
    {
      icon: Handshake,
      title: 'Designed for collaboration',
      description: 'Connect with like-minded individuals and share ideas to drive impactful change.',
      highlights: ['Networking Events', 'Collaborative Workspaces', 'Expert Mentorship']
    },
    {
      icon: TreePine,
      title: 'Built for climate action',
      description: 'Become a part of a growing community scaling climate solutions into action.',
      highlights: ['Impact Projects', 'Sustainability Focus', 'Global Network']
    },
    {
      icon: Rocket,
      title: 'Hub for builders',
      description: 'Work, meet, and build with climate innovators across sectors in our Sydney-based hub.',
      highlights: ['Co-working Space', 'Meeting Rooms', 'Innovation Labs']
    }
  ];

  const membershipOptions = [
    {
      name: 'Community',
      price: 'Free',
      period: '',
      description: 'Join our community and attend events',
      features: ['Access to events', 'Online community', 'Newsletter updates', 'Networking opportunities']
    },
    {
      name: 'Collaborator',
      price: '$99',
      period: '/month',
      description: 'Work from our Sydney hub with flexible access',
      features: ['Flexible workspace access', 'All Community benefits', 'Meeting room credits', 'Mentorship program'],
      popular: true
    },
    {
      name: 'Pioneer',
      price: '$199',
      period: '/month',
      description: 'Full access to all facilities and premium support',
      features: ['24/7 hub access', 'Dedicated workspace', 'All Collaborator benefits', 'Priority support', 'Event hosting credits']
    }
  ];

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 200);
    const interval = setInterval(() => {
      setCurrentBenefit((prev) => (prev + 1) % benefits.length);
    }, 4000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  return (
    <section className="relative py-20 lg:py-32 overflow-hidden bg-gradient-to-br from-gray-50 via-white to-emerald-50">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-32 left-20 w-40 h-40 bg-emerald-400 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-20 right-32 w-56 h-56 bg-green-400 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '3s'}}></div>
        <div className="absolute bottom-32 left-1/4 w-48 h-48 bg-teal-400 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '6s'}}></div>
        <div className="absolute bottom-20 right-20 w-36 h-36 bg-cyan-400 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '9s'}}></div>
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 opacity-5">
        <div className="w-full h-full" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(34,197,94,0.3) 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }}></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12">
        
        {/* Header Section */}
        <div className="text-center mb-16 lg:mb-24">
          <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="inline-flex items-center space-x-3 bg-emerald-100 border border-emerald-200 rounded-full px-6 py-3 mb-8">
              <div className="w-2 h-2 bg-emerald-600 rounded-full animate-pulse"></div>
              <span className="text-emerald-800 text-sm font-semibold tracking-wide">Become a Member</span>
            </div>
            
            <h2 className="text-4xl lg:text-6xl xl:text-7xl font-bold text-gray-900 leading-tight mb-8">
              <span className="block mb-2">A hub for the</span>
              <span className="relative block mb-2">
                <span className="bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 bg-clip-text text-transparent">
                  builders
                </span>
                <div className="absolute -top-2 -right-2 lg:-top-3 lg:-right-3">
                  <div className="w-3 h-3 lg:w-4 lg:h-4 bg-emerald-500 rounded-full animate-ping"></div>
                </div>
              </span>
              <span className="block text-3xl lg:text-5xl xl:text-6xl mt-2 text-gray-800">of tomorrow</span>
            </h2>
          </div>

          <div className={`transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="max-w-4xl mx-auto space-y-6">
              <p className="text-xl lg:text-2xl text-gray-700 leading-relaxed">
                Work, meet, and build with 
                <span className="text-emerald-700 font-bold"> climate innovators across sectors</span> in our Sydney-based hub.
              </p>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className={`transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              const isActive = currentBenefit === index;
              return (
                <div
                  key={index}
                  className={`p-6 bg-white/90 backdrop-blur-sm rounded-2xl border-2 shadow-lg transition-all duration-500 hover:bg-white cursor-pointer hover:shadow-xl ${
                    isActive ? 'transform scale-105 bg-white border-emerald-400 shadow-2xl shadow-emerald-200/50' : 'border-gray-200 hover:border-emerald-300'
                  }`}
                >
                  <div className="text-center space-y-4">
                    <div className={`p-4 rounded-xl mx-auto w-fit transition-all duration-300 ${
                      isActive ? 'bg-emerald-100 scale-110' : 'bg-gray-100 hover:bg-emerald-50'
                    }`}>
                      <Icon className={`w-8 h-8 transition-colors duration-300 ${
                        isActive ? 'text-emerald-600' : 'text-gray-600 hover:text-emerald-600'
                      }`} />
                    </div>
                    <div>
                      <div className={`text-3xl font-bold transition-colors duration-300 ${
                        isActive ? 'text-emerald-600' : 'text-gray-900'
                      }`}>
                        {benefit.stat}
                      </div>
                      <div className="text-sm text-gray-600 font-semibold mb-2">{benefit.label}</div>
                      <div className="text-xs text-gray-500 leading-tight">{benefit.description}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Features Grid */}
        <div className={`transition-all duration-1000 delay-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="grid lg:grid-cols-3 gap-8 mb-16">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div 
                  key={index}
                  className="group p-8 bg-white/95 backdrop-blur-sm rounded-3xl border-2 border-gray-200 hover:bg-white hover:border-emerald-400 transition-all duration-500 hover:transform hover:scale-105 hover:shadow-2xl hover:shadow-emerald-200/30"
                >
                  <div className="space-y-6">
                    <div className="flex items-center space-x-4">
                      <div className="p-4 bg-emerald-100 rounded-2xl group-hover:bg-emerald-200 transition-all duration-300">
                        <Icon className="w-8 h-8 text-emerald-600 group-hover:scale-110 transition-transform duration-300" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 group-hover:text-emerald-700 transition-colors duration-300">
                        {feature.title}
                      </h3>
                    </div>
                    
                    <p className="text-gray-700 text-lg leading-relaxed">
                      {feature.description}
                    </p>
                    
                    <div className="space-y-3">
                      {feature.highlights.map((highlight, hIndex) => (
                        <div key={hIndex} className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full group-hover:animate-pulse"></div>
                          <span className="text-gray-600 text-sm font-medium">{highlight}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        
        {/* Member Success Stories */}
        <div className={`transition-all duration-1000 delay-1100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="bg-gradient-to-r from-emerald-50 to-green-50 backdrop-blur-sm rounded-3xl border-2 border-emerald-200 p-12 shadow-xl">
            <div className="text-center mb-8">
              <h3 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
                Our members are 
                <span className="bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent"> writing the future</span>
              </h3>
              <p className="text-xl text-gray-700 max-w-3xl mx-auto">
                From converting CO2 into stable soil carbon to building the green skills workforce engine... 
                Greenhouse members are pioneering climate action.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="group px-8 py-4 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-full font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-2xl shadow-lg flex items-center justify-center space-x-2">
                <Users className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span>Join Our Community</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              
              <button className="px-8 py-4 border-2 border-gray-300 hover:border-emerald-500 text-gray-700 hover:text-emerald-700 rounded-full font-semibold backdrop-blur-sm bg-white/80 hover:bg-white transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2 shadow-sm hover:shadow-md">
                <Video className="w-5 h-5" />
                <span>Take a Virtual Tour</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Elements */}
      <div className="absolute top-20 right-8 animate-float">
        <div className="p-3 bg-emerald-100 backdrop-blur-sm rounded-full border-2 border-emerald-300 shadow-lg">
          <MapPin className="w-6 h-6 text-emerald-600" />
        </div>
      </div>
      
      <div className="absolute bottom-32 left-8 animate-float" style={{animationDelay: '2s'}}>
        <div className="p-3 bg-green-100 backdrop-blur-sm rounded-full border-2 border-green-300 shadow-lg">
          <Heart className="w-6 h-6 text-green-600" />
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </section>
  );
};

export default Collaboration;