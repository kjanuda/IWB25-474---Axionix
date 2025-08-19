import React, { useState, useEffect, useRef } from 'react';
import { useAuthContext } from '@asgardeo/auth-react';
import {
  Leaf,
  Menu,
  X,
  ChevronDown,
  User,
  LogIn,
  LogOut,
  UserPlus,
  Search,
  Bell,
  Globe,
  Zap,
  TrendingUp,
  Star,
  AlertCircle,
  Clock,
  ExternalLink,
  Loader2,
} from 'lucide-react';

// === Notification Service (Singleton) ===
class NotificationService {
  constructor() {
    this.listeners = [];
    this.notifications = [];
    this.unreadCount = 0;
    this.lastFetch = null;
    this.pollInterval = null;
  }

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((listener) => listener !== callback);
    };
  }

  notify() {
    this.listeners.forEach((callback) =>
      callback({
        notifications: this.notifications,
        unreadCount: this.unreadCount,
      })
    );
  }

  async fetchNotifications() {
    const API_BASE = 'http://localhost:8070/api';
    try {
      const response = await fetch(`${API_BASE}/alerts`);
      if (response.ok) {
        const alerts = await response.json();
        const alertNotifications = alerts
          .slice(-10)
          .reverse()
          .map((alert) => ({
            id: alert.id,
            message: alert.description,
            category: alert.category,
            timestamp: alert.timestamp,
            type: alert.category.toLowerCase(),
            read: this.notifications.find((n) => n.id === alert.id)?.read || false,
          }));

        this.notifications = alertNotifications;
        this.unreadCount = alertNotifications.filter((n) => !n.read).length;
        this.lastFetch = Date.now();
        this.notify();
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }

  markAsRead(id) {
    this.notifications = this.notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
    this.unreadCount = Math.max(0, this.unreadCount - 1);
    this.notify();
  }

  markAllAsRead() {
    this.notifications = this.notifications.map((n) => ({ ...n, read: true }));
    this.unreadCount = 0;
    this.notify();
  }

  startPolling() {
    if (!this.pollInterval) {
      this.fetchNotifications();
      this.pollInterval = setInterval(() => {
        this.fetchNotifications();
      }, 30000);
    }
  }

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }
}

const notificationService = new NotificationService();

// === Notification Dropdown Component ===
const NotificationDropdown = ({ isScrolled }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const getCategoryColor = (category) => {
    switch (category.toLowerCase()) {
      case 'security':
        return 'text-red-600 bg-red-100';
      case 'system':
        return 'text-yellow-600 bg-yellow-100';
      case 'network':
        return 'text-blue-600 bg-blue-100';
      case 'application':
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  useEffect(() => {
    const unsubscribe = notificationService.subscribe(({ notifications, unreadCount }) => {
      setNotifications(notifications);
      setUnreadCount(unreadCount);
      setLoading(false);
    });

    notificationService.startPolling();

    return () => {
      unsubscribe();
    };
  }, []);

  const handleToggleDropdown = async () => {
    if (!showDropdown) {
      setLoading(true);
      await notificationService.fetchNotifications();
    }
    setShowDropdown(!showDropdown);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleToggleDropdown}
        className={`relative p-2 rounded-lg transition-all duration-300 ${
          isScrolled
            ? 'text-white hover:text-green-400 hover:bg-white/10'
            : 'text-gray-600 hover:text-green-600 hover:bg-green-50'
        }`}
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-xs text-white font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </div>
        )}
      </button>

      {showDropdown && (
        <div
          className={`absolute right-0 top-full mt-2 w-96 rounded-2xl border shadow-2xl overflow-hidden z-50 ${
            isScrolled
              ? 'bg-black/95 backdrop-blur-xl border-white/10'
              : 'bg-white border-gray-200'
          }`}
        >
          <div
            className={`p-4 border-b flex items-center justify-between ${
              isScrolled ? 'border-white/10' : 'border-gray-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Bell
                className={`w-5 h-5 ${isScrolled ? 'text-green-400' : 'text-green-600'}`}
              />
              <h3
                className={`font-semibold ${isScrolled ? 'text-white' : 'text-gray-900'}`}
              >
                Notifications
              </h3>
              <span
                className={`px-2 py-1 rounded-full text-xs ${
                  isScrolled
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-green-100 text-green-600'
                }`}
              >
                {notifications.length}
              </span>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => notificationService.markAllAsRead()}
                className={`text-xs hover:underline ${
                  isScrolled ? 'text-green-400 hover:text-green-300' : 'text-green-600 hover:text-green-700'
                }`}
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
                <p
                  className={`text-sm mt-2 ${isScrolled ? 'text-gray-400' : 'text-gray-500'}`}
                >
                  Loading notifications...
                </p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell
                  className={`w-12 h-12 mx-auto mb-3 ${
                    isScrolled ? 'text-gray-600' : 'text-gray-400'
                  }`}
                />
                <p
                  className={`text-sm ${isScrolled ? 'text-gray-400' : 'text-gray-500'}`}
                >
                  No notifications yet
                </p>
                <p
                  className={`text-xs mt-1 ${isScrolled ? 'text-gray-500' : 'text-gray-400'}`}
                >
                  We'll notify you when something happens
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200/10">
                {notifications.slice(0, 5).map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => notificationService.markAsRead(notification.id)}
                    className={`p-4 cursor-pointer transition-all duration-200 ${
                      !notification.read
                        ? isScrolled
                          ? 'bg-white/5 border-l-2 border-green-400'
                          : 'bg-blue-50 border-l-2 border-blue-400'
                        : ''
                    } ${
                      isScrolled ? 'hover:bg-white/10' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div
                        className={`p-2 rounded-lg flex-shrink-0 ${getCategoryColor(
                          notification.category
                        )}`}
                      >
                        <AlertCircle className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span
                            className={`text-xs px-2 py-1 rounded-full font-medium ${getCategoryColor(
                              notification.category
                            )}`}
                          >
                            {notification.category}
                          </span>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                          )}
                        </div>
                        <p
                          className={`text-sm font-medium line-clamp-2 mb-1 ${
                            isScrolled ? 'text-white' : 'text-gray-900'
                          }`}
                        >
                          {notification.message}
                        </p>
                        <div className="flex items-center space-x-1">
                          <Clock
                            className={`w-3 h-3 ${
                              isScrolled ? 'text-gray-400' : 'text-gray-500'
                            }`}
                          />
                          <span
                            className={`text-xs ${
                              isScrolled ? 'text-gray-400' : 'text-gray-500'
                            }`}
                          >
                            {formatTime(notification.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {notifications.length > 5 && (
            <div
              className={`p-3 border-t ${
                isScrolled ? 'border-white/10' : 'border-gray-200'
              }`}
            >
              <button
                className={`w-full text-center text-sm font-medium py-2 rounded-lg flex items-center justify-center space-x-2 ${
                  isScrolled
                    ? 'text-green-400 hover:bg-white/10'
                    : 'text-green-600 hover:bg-green-50'
                }`}
              >
                <span>View All Notifications</span>
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// === Main Navbar Component ===
const GlobalNavbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { state, signIn, signOut } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const handleAuthAction = async (action) => {
    setIsLoading(true);
    try {
      if (action === 'signIn') {
        await signIn();
      } else if (action === 'signOut') {
        await signOut();
      }
    } catch (error) {
      console.error(`${action} failed:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      console.log('Searching for:', searchQuery);
      // Implement actual search logic here
    }
  };

  const navItems = [
    {
      name: 'Solutions',
      hasDropdown: true,
      items: [
        { name: 'Climate Tech', icon: Zap, trending: true, desc: 'Innovative climate technologies' },
        { name: 'Green Finance', icon: TrendingUp, desc: 'Sustainable investment solutions' },
        { name: 'Carbon Tracking', icon: Globe, desc: 'Monitor and reduce emissions' },
        { name: 'Innovation Hub', icon: Star, desc: 'Latest green innovations' },
      ],
    },
    {
      name: 'Ecosyst',
      hasDropdown: true,
      items: [
        { name: 'Innova', icon: User, desc: 'Connect with pioneers' },
        { name: 'Investors', icon: TrendingUp, desc: 'Find green investors' },
        { name: 'Corporates', icon: Globe, desc: 'Enterprise solutions' },
        { name: 'Government', icon: Star, desc: 'Policy and regulation' },
      ],
    },
    { name: 'Projects', hasDropdown: false },
    { name: 'Impact', hasDropdown: false },
    { name: 'Resources', hasDropdown: false },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      {/* Navbar */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled
            ? 'bg-black/80 backdrop-blur-xl border-b border-white/10 shadow-2xl'
            : 'bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-lg'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo */}
            <div className="flex items-center space-x-2 group cursor-pointer flex-shrink-0">
              <div
                className={`p-2 rounded-full transition-all duration-300 ${
                  isScrolled
                    ? 'bg-green-500/20 group-hover:bg-green-500/30'
                    : 'bg-green-100 group-hover:bg-green-200'
                }`}
              >
                <Leaf
                  className={`w-5 h-5 sm:w-6 sm:h-6 group-hover:rotate-12 transition-transform duration-300 ${
                    isScrolled ? 'text-green-400' : 'text-green-600'
                  }`}
                />
              </div>
              <span className="text-lg sm:text-xl font-bold whitespace-nowrap">
                <span className={isScrolled ? 'text-green-400' : 'text-green-600'}>Eco</span>
                <span className={isScrolled ? 'text-lime-300' : 'text-lime-600'}>Green</span>
                <span className={isScrolled ? 'text-cyan-400' : 'text-cyan-600'}>360</span>
              </span>
            </div>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center space-x-6 xl:space-x-8">
              {navItems.map((item) => (
                <div key={item.name} className="relative dropdown-container">
                  <button
                    onClick={() =>
                      item.hasDropdown &&
                      setActiveDropdown(activeDropdown === item.name ? null : item.name)
                    }
                    onMouseEnter={() => item.hasDropdown && setActiveDropdown(item.name)}
                    className={`flex items-center space-x-1 transition-all duration-300 font-medium py-2 px-3 rounded-lg ${
                      isScrolled
                        ? 'text-white hover:text-green-400 hover:bg-white/10'
                        : 'text-gray-700 hover:text-green-600 hover:bg-green-50'
                    }`}
                  >
                    <span>{item.name}</span>
                    {item.hasDropdown && (
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-300 ${
                          activeDropdown === item.name ? 'rotate-180' : ''
                        }`}
                      />
                    )}
                  </button>

                  {item.hasDropdown && activeDropdown === item.name && (
                    <div
                      className={`absolute top-full left-0 mt-2 w-72 rounded-2xl border shadow-2xl overflow-hidden ${
                        isScrolled
                          ? 'bg-black/95 backdrop-blur-xl border-white/10'
                          : 'bg-white border-gray-200'
                      }`}
                      onMouseLeave={() => setActiveDropdown(null)}
                    >
                      <div className="p-2">
                        {item.items.map((subItem, idx) => {
                          const Icon = subItem.icon;
                          return (
                            <button
                              key={idx}
                              onClick={() => setActiveDropdown(null)}
                              className={`w-full flex items-start space-x-3 p-4 rounded-xl transition-all duration-300 ${
                                isScrolled ? 'hover:bg-white/10' : 'hover:bg-gray-50'
                              }`}
                            >
                              <div
                                className={`p-2 rounded-lg ${
                                  isScrolled
                                    ? 'bg-green-500/20'
                                    : 'bg-green-100'
                                }`}
                              >
                                <Icon
                                  className={`w-4 h-4 ${
                                    isScrolled ? 'text-green-400' : 'text-green-600'
                                  }`}
                                />
                              </div>
                              <div className="flex-1 text-left">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span
                                    className={`font-medium ${
                                      isScrolled ? 'text-white' : 'text-gray-700'
                                    }`}
                                  >
                                    {subItem.name}
                                  </span>
                                  {subItem.trending && (
                                    <span className="px-2 py-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs rounded-full animate-pulse">
                                      HOT
                                    </span>
                                  )}
                                </div>
                                <p
                                  className={`text-sm ${
                                    isScrolled ? 'text-gray-400' : 'text-gray-500'
                                  }`}
                                >
                                  {subItem.desc}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Search Bar */}
            <div className="hidden md:flex items-center flex-1 max-w-sm lg:max-w-md mx-4 lg:mx-8">
              <form onSubmit={handleSearch} className="w-full relative">
                <Search
                  className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                    isScrolled ? 'text-gray-400' : 'text-gray-500'
                  } ${isSearchFocused ? 'text-green-500' : ''}`}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  placeholder="Search climate solutions..."
                  className={`w-full pl-10 pr-4 py-2.5 border rounded-full focus:outline-none focus:ring-2 transition-all duration-300 ${
                    isScrolled
                      ? 'bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-green-400/50 focus:ring-green-400/20'
                      : 'bg-gray-50 border-gray-300 text-gray-700 placeholder-gray-500 focus:border-green-500 focus:ring-green-500/20'
                  }`}
                />
              </form>
            </div>

            {/* Right Section */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              <NotificationDropdown isScrolled={isScrolled} />

              {state.isAuthenticated ? (
                <div className="hidden sm:flex items-center space-x-3">
                  <div
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                      isScrolled
                        ? 'text-white/90 hover:bg-white/10'
                        : 'text-gray-700 hover:bg-green-50'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    <span className="hidden lg:inline text-sm">
                      {state.username || state.displayName || 'User'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleAuthAction('signOut')}
                    disabled={isLoading}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                      isScrolled
                        ? 'text-white hover:text-red-400 hover:bg-white/10'
                        : 'text-gray-700 hover:text-red-600 hover:bg-red-50'
                    } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <LogOut className="w-4 h-4" />
                    )}
                    <span className="hidden lg:inline">
                      {isLoading ? 'Signing out...' : 'Logout'}
                    </span>
                  </button>
                </div>
              ) : (
                <div className="hidden sm:flex items-center space-x-3">
                  <button
                    onClick={() => handleAuthAction('signIn')}
                    disabled={isLoading}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                      isScrolled
                        ? 'text-white hover:text-green-400 hover:bg-white/10'
                        : 'text-gray-700 hover:text-green-600 hover:bg-green-50'
                    } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <LogIn className="w-4 h-4" />
                    )}
                    <span className="hidden lg:inline">
                      {isLoading ? 'Signing in...' : 'Login'}
                    </span>
                  </button>
                  <button
                    onClick={() => handleAuthAction('signIn')}
                    disabled={isLoading}
                    className={`flex items-center space-x-2 px-4 lg:px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-full font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-xl ${
                      isLoading ? 'opacity-50 cursor-not-allowed transform-none' : ''
                    }`}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <UserPlus className="w-4 h-4" />
                    )}
                    <span className="hidden lg:inline">
                      {isLoading ? 'Please wait...' : 'Sign Up'}
                    </span>
                  </button>
                </div>
              )}

              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={`lg:hidden p-2 rounded-lg ${
                  isScrolled
                    ? 'text-white hover:text-green-400 hover:bg-white/10'
                    : 'text-gray-700 hover:text-green-600 hover:bg-green-50'
                }`}
                aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          className={`lg:hidden border-t transition-all duration-300 overflow-hidden ${
            isMobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          } ${isScrolled ? 'bg-black/95 border-white/10' : 'bg-white border-gray-200'}`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
            <form onSubmit={handleSearch} className="relative">
              <Search
                className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                  isScrolled ? 'text-gray-400' : 'text-gray-500'
                }`}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search climate solutions..."
                className={`w-full pl-10 pr-4 py-3 border rounded-full focus:outline-none focus:ring-2 ${
                  isScrolled
                    ? 'bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-green-400/50'
                    : 'bg-gray-50 border-gray-300 text-gray-700 placeholder-gray-500 focus:border-green-500'
                }`}
              />
            </form>

            {navItems.map((item) => (
              <div key={item.name} className="space-y-2">
                <button
                  onClick={() =>
                    item.hasDropdown &&
                    setActiveDropdown(activeDropdown === item.name ? null : item.name)
                  }
                  className={`w-full flex items-center justify-between p-3 rounded-lg ${
                    isScrolled
                      ? 'text-white hover:text-green-400 hover:bg-white/10'
                      : 'text-gray-700 hover:text-green-600 hover:bg-green-50'
                  }`}
                >
                  <span>{item.name}</span>
                  {item.hasDropdown && (
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${
                        activeDropdown === item.name ? 'rotate-180' : ''
                      }`}
                    />
                  )}
                </button>
                {item.hasDropdown && activeDropdown === item.name && (
                  <div className="pl-4 space-y-1">
                    {item.items.map((sub, idx) => {
                      const Icon = sub.icon;
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            setActiveDropdown(null);
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center space-x-3 p-2 rounded-lg ${
                            isScrolled ? 'hover:bg-white/5' : 'hover:bg-gray-50'
                          }`}
                        >
                          <Icon
                            className={`w-4 h-4 ${
                              isScrolled ? 'text-green-400' : 'text-green-600'
                            }`}
                          />
                          <span
                            className={`text-sm ${
                              isScrolled ? 'text-white' : 'text-gray-700'
                            }`}
                          >
                            {sub.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            {/* Mobile Auth */}
            {state.isAuthenticated ? (
              <div className={`pt-4 border-t space-y-3 ${isScrolled ? 'border-white/10' : 'border-gray-200'}`}>
                <div
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                    isScrolled ? 'text-white/90' : 'text-gray-700'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>{state.username || state.displayName || 'User'}</span>
                </div>
                <button
                  onClick={() => {
                    handleAuthAction('signOut');
                    setIsMobileMenuOpen(false);
                  }}
                  disabled={isLoading}
                  className={`w-full flex items-center justify-center space-x-2 p-3 rounded-lg ${
                    isScrolled
                      ? 'text-white hover:text-red-400 hover:bg-white/10'
                      : 'text-gray-700 hover:text-red-600 hover:bg-red-50'
                  }`}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <LogOut className="w-4 h-4" />
                  )}
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className={`pt-4 border-t space-y-3 ${isScrolled ? 'border-white/10' : 'border-gray-200'}`}>
                <button
                  onClick={() => {
                    handleAuthAction('signIn');
                    setIsMobileMenuOpen(false);
                  }}
                  disabled={isLoading}
                  className={`w-full flex items-center justify-center space-x-2 p-3 rounded-lg ${
                    isScrolled
                      ? 'text-white hover:text-green-400 hover:bg-white/10'
                      : 'text-gray-700 hover:text-green-600 hover:bg-green-50'
                  }`}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <LogIn className="w-4 h-4" />
                  )}
                  <span>Login</span>
                </button>
                <button
                  onClick={() => {
                    handleAuthAction('signIn');
                    setIsMobileMenuOpen(false);
                  }}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center space-x-2 p-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full font-semibold hover:from-green-600 hover:to-emerald-700"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  <span>Sign Up</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
    </>
  );
};

export default GlobalNavbar;