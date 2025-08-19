import React, { useState } from 'react';
import { 
  Leaf, 
  Mail, 
  Phone, 
  MapPin, 
  Twitter, 
  Linkedin, 
  Instagram, 
  Facebook,
  Youtube,
  ArrowRight,
  Globe,
  Zap,
  TrendingUp,
  Star,
  Heart,
  ExternalLink,
  ChevronUp,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';

const ClimateFooter = () => {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success', 'error', 'info'
  const [showBackToTop, setShowBackToTop] = useState(true);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubscribe = async (e) => {
    e.preventDefault();
    
    // Reset previous messages
    setMessage('');
    setMessageType('');

    // Validation
    if (!email.trim()) {
      setMessage('Please enter your email address');
      setMessageType('error');
      return;
    }

    if (!validateEmail(email)) {
      setMessage('Please enter a valid email address');
      setMessageType('error');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:9092/subscribers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'REQUEST_ID': `req-${Date.now()}` // Optional header as per CORS config
        },
        body: JSON.stringify({
          email: email.trim()
        })
      });

      const data = await response.json();

      if (response.ok) {
        if (data.status === 'subscribed') {
          setIsSubscribed(true);
          setMessage('🎉 Successfully subscribed! Check your email for a welcome message.');
          setMessageType('success');
          setEmail(''); // Clear email after successful subscription
        } else if (data.status === 'existing') {
          setIsSubscribed(true);
          setMessage('You are already subscribed to our newsletter!');
          setMessageType('info');
        }
      } else {
        throw new Error(data.message || 'Subscription failed');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      setMessage(`Failed to subscribe: ${error.message}`);
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubscribe(e);
    }
  };

  const resetSubscription = () => {
    setIsSubscribed(false);
    setMessage('');
    setMessageType('');
    setEmail('');
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const footerSections = [
    {
      title: 'Solutions',
      links: [
        { name: 'Climate Tech', icon: Zap, trending: true },
        { name: 'Green Finance', icon: TrendingUp },
        { name: 'Carbon Tracking', icon: Globe },
        { name: 'Innovation Hub', icon: Star }
      ]
    },
    {
      title: 'Ecosystem',
      links: [
        { name: 'Innovators', href: '#' },
        { name: 'Investors', href: '#' },
        { name: 'Corporates', href: '#' },
        { name: 'Government', href: '#' }
      ]
    },
    {
      title: 'Company',
      links: [
        { name: 'About Us', href: '#' },
        { name: 'Our Mission', href: '#' },
        { name: 'Careers', href: '/job1', badge: 'Hiring' },
        { name: 'News', href: '/newsapi' },
        { name: 'Contact', href: '#' }
      ]
    },
    {
      title: 'Resources',
      links: [
        { name: 'Blog', href: '/blog' },
        { name: 'Documentation', href: '#' },
        { name: 'Case Studies', href: '#' },
        { name: 'Webinars', href: '/meetshedule' },
        { name: 'Support', href: '#' }
      ]
    }
  ];

  const socialLinks = [
    { icon: Twitter, href: '#', label: 'Twitter', color: 'hover:text-blue-400' },
    { icon: Linkedin, href: '#', label: 'LinkedIn', color: 'hover:text-blue-600' },
    { icon: Instagram, href: '#', label: 'Instagram', color: 'hover:text-pink-500' },
    { icon: Facebook, href: '#', label: 'Facebook', color: 'hover:text-blue-500' },
    { icon: Youtube, href: '#', label: 'YouTube', color: 'hover:text-red-500' }
  ];

  return (
    <footer className="relative bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-72 h-72 bg-green-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-lime-500/5 rounded-full blur-2xl"></div>
      </div>

      {/* Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="absolute top-8 right-8 p-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-full transition-all duration-300 transform hover:scale-110 hover:shadow-xl z-10"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
      )}

      <div className="relative z-10">
        {/* Enhanced CTA Section */}
        <div className="relative border-b border-white/10 overflow-hidden">
          {/* Animated Background Elements */}
          <div className="absolute inset-0">
            <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-0 right-0 w-80 h-80 bg-gradient-to-br from-cyan-500/15 to-blue-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-gradient-to-br from-lime-500/10 to-green-500/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }}></div>
          </div>

          {/* Floating Particles */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-green-400/30 rounded-full animate-float"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 5}s`,
                  animationDuration: `${3 + Math.random() * 4}s`
                }}
              ></div>
            ))}
          </div>

          {/* Custom CSS for animations */}
          <style jsx>{`
            @keyframes float {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-20px); }
            }
            @keyframes gradient-x {
              0%, 100% { background-position: 0% 50%; }
              50% { background-position: 100% 50%; }
            }
            @keyframes fade-in-up {
              0% { opacity: 0; transform: translateY(30px); }
              100% { opacity: 1; transform: translateY(0); }
            }
            .animate-float {
              animation: float 3s ease-in-out infinite;
            }
            .animate-gradient-x {
              background-size: 200% 200%;
              animation: gradient-x 3s ease infinite;
            }
            .animate-fade-in-up {
              animation: fade-in-up 0.8s ease-out forwards;
              opacity: 0;
            }
          `}</style>
        </div>

        {/* Main Footer Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            
            {/* Brand Section */}
            <div className="lg:col-span-4 space-y-6">
              {/* Logo */}
              <div className="flex items-center space-x-2 group cursor-pointer">
                <div className="p-3 rounded-full bg-green-500/20 group-hover:bg-green-500/30 transition-all duration-300">
                  <Leaf className="w-7 h-7 text-green-400 group-hover:rotate-12 transition-transform duration-300" />
                </div>
                <span className="text-2xl font-bold">
                  <span className="text-green-400">Eco</span>
                  <span className="text-lime-300">Green</span>
                  <span className="text-cyan-400">360</span>
                </span>
              </div>

              {/* Description */}
              <p className="text-gray-400 leading-relaxed">
                Empowering the world's transition to sustainable solutions through innovative technology, 
                strategic partnerships, and impactful climate action.
              </p>

              {/* Enhanced Newsletter Signup */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white">Stay Updated</h4>
                <div className="space-y-3">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Enter your email"
                      disabled={isLoading || isSubscribed}
                      className="w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300 disabled:opacity-50"
                    />
                  </div>
                  <button
                    onClick={handleSubscribe}
                    disabled={isLoading || isSubscribed}
                    className="w-full flex items-center justify-center space-x-2 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Subscribing...</span>
                      </>
                    ) : isSubscribed ? (
                      <>
                        <Heart className="w-4 h-4 text-red-400" />
                        <span>Subscribed!</span>
                      </>
                    ) : (
                      <>
                        <span>Subscribe</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {/* Message Display */}
                  {message && (
                    <div className={`flex items-start space-x-2 p-3 rounded-lg backdrop-blur-sm ${
                      messageType === 'success' 
                        ? 'bg-green-500/20 border border-green-500/30' 
                        : messageType === 'error'
                        ? 'bg-red-500/20 border border-red-500/30'
                        : 'bg-blue-500/20 border border-blue-500/30'
                    }`}>
                      {messageType === 'success' && <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />}
                      {messageType === 'error' && <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />}
                      {messageType === 'info' && <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />}
                      <p className={`text-sm ${
                        messageType === 'success' 
                          ? 'text-green-100' 
                          : messageType === 'error'
                          ? 'text-red-100'
                          : 'text-blue-100'
                      }`}>
                        {message}
                      </p>
                    </div>
                  )}

                  {/* Reset Button (appears after successful subscription) */}
                  {isSubscribed && (
                    <button
                      onClick={resetSubscription}
                      className="w-full py-2 text-sm text-white/70 hover:text-white transition-colors duration-300"
                    >
                      Subscribe another email?
                    </button>
                  )}
                </div>
              </div>

              {/* Social Links */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white">Follow Us</h4>
                <div className="flex space-x-3">
                  {socialLinks.map((social, index) => {
                    const Icon = social.icon;
                    return (
                      <a
                        key={index}
                        href={social.href}
                        aria-label={social.label}
                        className={`p-3 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 transition-all duration-300 hover:scale-110 hover:bg-white/20 ${social.color}`}
                      >
                        <Icon className="w-5 h-5" />
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Links Sections */}
            <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-8">
              {footerSections.map((section, index) => (
                <div key={index} className="space-y-4">
                  <h4 className="text-lg font-semibold text-white mb-4">{section.title}</h4>
                  <ul className="space-y-3">
                    {section.links.map((link, linkIndex) => {
                      const Icon = link.icon;
                      return (
                        <li key={linkIndex}>
                          <a
                            href={link.href || '#'}
                            className="flex items-center space-x-2 text-gray-400 hover:text-green-400 transition-colors duration-300 group"
                          >
                            {Icon && <Icon className="w-4 h-4 group-hover:scale-110 transition-transform" />}
                            <span>{link.name}</span>
                            {link.trending && (
                              <span className="px-2 py-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs rounded-full animate-pulse">
                                HOT
                              </span>
                            )}
                            {link.badge && (
                              <span className="px-2 py-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs rounded-full">
                                {link.badge}
                              </span>
                            )}
                            {!Icon && (
                              <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="border-t border-white/10 bg-white/5 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start space-x-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Mail className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <div className="text-sm text-gray-400">Email Us</div>
                  <div className="text-white font-medium">ecogreen360.contact@gmail.com
</div>
                </div>
              </div>
              
              <div className="flex items-center justify-center md:justify-start space-x-3">
                <div className="p-2 bg-cyan-500/20 rounded-lg">
                  <Phone className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <div className="text-sm text-gray-400">Call Us</div>
                  <div className="text-white font-medium">+9477 300 7426</div>
                </div>
              </div>
              
              <div className="flex items-center justify-center md:justify-start space-x-3">
                <div className="p-2 bg-lime-500/20 rounded-lg">
                  <MapPin className="w-5 h-5 text-lime-400" />
                </div>
                <div>
                  <div className="text-sm text-gray-400">Visit Us</div>
                  <div className="text-white font-medium">Beliatta,Srilanka</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
              <div className="text-gray-400 text-sm text-center md:text-left">
                © 2025 EcoGreen360. All rights reserved. Building a sustainable future together.
              </div>
              
              <div className="flex items-center space-x-6 text-sm">
                <a href="#" className="text-gray-400 hover:text-green-400 transition-colors duration-300">
                  Privacy Policy
                </a>
                <a href="#" className="text-gray-400 hover:text-green-400 transition-colors duration-300">
                  Terms of Service
                </a>
                <a href="#" className="text-gray-400 hover:text-green-400 transition-colors duration-300">
                  Cookie Policy
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default ClimateFooter;