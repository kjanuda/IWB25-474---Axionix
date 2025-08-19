import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Send, Bot, User, Loader2, AlertCircle, Maximize2, Minimize2, 
  Settings, RefreshCw, Mail, Check, XCircle, Volume2, VolumeX, 
  Sparkles, MessageCircle, Copy, Download, Phone, HelpCircle 
} from 'lucide-react';

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [size, setSize] = useState('medium');
  const [position, setPosition] = useState('bottom-right');
  const [showSettings, setShowSettings] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [theme, setTheme] = useState('green');
  const [isMobile, setIsMobile] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "🌱 Welcome to EcoGreen360! I'm your AI greenhouse specialist.\n\nI can help you with:\n• Greenhouse design and setup\n• IoT monitoring systems\n• Plant cultivation advice\n• Cost estimates and ROI\n• Sustainable farming practices\n• Email information to colleagues\n\nHow can I assist with your greenhouse project today?",
      isBot: true,
      timestamp: new Date(),
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [customPosition, setCustomPosition] = useState(null);
  const [pendingEmailData, setPendingEmailData] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatRef = useRef(null);
  const audioRef = useRef(null);

  // Backend API URL (Update if different)
  const API_URL = 'http://localhost:8090';

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(mobile);
      if (window.innerWidth <= 480 && isOpen) {
        setIsFullscreen(true);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [isOpen]);

  // Theme config
  const themeConfig = {
    green: {
      primary: 'from-green-500 to-emerald-600',
      primaryHover: 'from-green-600 to-emerald-700',
      accent: 'bg-green-500',
      accentHover: 'bg-green-600',
      ring: 'ring-green-500',
      text: 'text-green-600'
    },
    blue: {
      primary: 'from-blue-500 to-cyan-600',
      primaryHover: 'from-blue-600 to-cyan-700',
      accent: 'bg-blue-500',
      accentHover: 'bg-blue-600',
      ring: 'ring-blue-500',
      text: 'text-blue-600'
    },
    purple: {
      primary: 'from-purple-500 to-pink-600',
      primaryHover: 'from-purple-600 to-pink-700',
      accent: 'bg-purple-500',
      accentHover: 'bg-purple-600',
      ring: 'ring-purple-500',
      text: 'text-purple-600'
    }
  };

  const currentTheme = themeConfig[theme];

  // Responsive size
  const getSizeConfig = () => {
    if (isFullscreen || (isMobile && window.innerWidth <= 480)) {
      return {
        width: 'w-full',
        height: 'h-full',
        iconSize: 'w-5 h-5',
        padding: 'p-3',
        maxWidth: 'max-w-full',
        fontSize: 'text-sm'
      };
    }
    if (isMobile) {
      return {
        width: 'w-[95vw] max-w-sm',
        height: 'h-[80vh] max-h-[600px]',
        iconSize: 'w-5 h-5',
        padding: 'p-3',
        maxWidth: 'max-w-[90%]',
        fontSize: 'text-sm'
      };
    }
    return {
      small: { width: 'w-80', height: 'h-[400px]', iconSize: 'w-4 h-4', padding: 'p-3', maxWidth: 'max-w-[75%]', fontSize: 'text-xs' },
      medium: { width: 'w-96', height: 'h-[500px]', iconSize: 'w-5 h-5', padding: 'p-4', maxWidth: 'max-w-[80%]', fontSize: 'text-sm' },
      large: { width: 'w-[28rem]', height: 'h-[600px]', iconSize: 'w-6 h-6', padding: 'p-4', maxWidth: 'max-w-[85%]', fontSize: 'text-sm' }
    }[size];
  };

  const sizeConfig = getSizeConfig();

  // Position
  const getPositionStyles = () => {
    if (isFullscreen) {
      return { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 };
    }
    if (customPosition && !isMobile) {
      return { position: 'fixed', left: `${customPosition.x}px`, top: `${customPosition.y}px` };
    }
    if (isMobile) {
      return { position: 'fixed', bottom: '1rem', left: '50%', transform: 'translateX(-50%)' };
    }
    const positions = {
      'bottom-right': { bottom: '1.5rem', right: '1.5rem' },
      'bottom-left': { bottom: '1.5rem', left: '1.5rem' },
      'top-right': { top: '1.5rem', right: '1.5rem' },
      'top-left': { top: '1.5rem', left: '1.5rem' },
      'center': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
    };
    return positions[position] || positions['bottom-right'];
  };

  const resetToPresetPosition = () => {
    setCustomPosition(null);
    setIsFullscreen(false);
  };

  const playNotificationSound = () => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.play().catch(e => console.log('Audio play failed:', e));
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      if (isMobile) {
        setTimeout(() => inputRef.current?.focus(), 300);
      } else {
        inputRef.current?.focus();
      }
      setUnreadCount(0);
    }
  }, [isOpen, isMinimized, isMobile]);

  useEffect(() => {
    resetToPresetPosition();
  }, [position]);

  // Send message to Ballerina backend
  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      text: inputMessage.trim(),
      isBot: false,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setError(null);

    // If pending email confirmation
    if (pendingEmailData && ['send', 'submit', 'yes', 'cancel', 'no'].includes(inputMessage.trim().toLowerCase())) {
      try {
        const res = await fetch(`${API_URL}/chatbot/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: inputMessage.trim() })
        });

        const data = await res.json();

        let botMessage = {
          id: Date.now(),
          isBot: true,
          timestamp: new Date()
        };

        if (data.type === 'email_success') {
          botMessage.text = data.message;
          botMessage.isEmailResult = true;
          botMessage.emailSuccess = true;
        } else if (data.type === 'email_cancelled') {
          botMessage.text = data.message;
          botMessage.isEmailResult = true;
          botMessage.emailSuccess = false;
        } else if (data.message) {
          botMessage.text = data.message;
        }

        setMessages(prev => [...prev, botMessage]);
        setPendingEmailData(null);
        playNotificationSound();
      } catch (err) {
        setError(err.message);
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: "❌ Failed to process email confirmation.",
          isBot: true,
          timestamp: new Date(),
          isError: true
        }]);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Regular message
    try {
      const res = await fetch(`${API_URL}/chatbot/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: userMessage.text })
      });

      const data = await res.json();

      let botMessage = {
        id: Date.now(),
        isBot: true,
        timestamp: new Date()
      };

      if (data.type === 'email_request') {
        botMessage.isEmailPreview = true;
        botMessage.emailData = data.email_preview;
        botMessage.message = data.message;
        setPendingEmailData(data.email_preview);
      } else if (data.choices && data.choices[0]?.message?.content) {
        botMessage.text = data.choices[0].message.content;
      } else if (data.message) {
        botMessage.text = data.message;
      } else {
        botMessage.text = "I'm not sure how to respond to that.";
      }

      setMessages(prev => [...prev, botMessage]);
      playNotificationSound();
      if (!isOpen) setUnreadCount(prev => prev + 1);
    } catch (err) {
      console.error('API Error:', err);
      const errorMessage = {
        id: Date.now(),
        text: "😔 Sorry, I couldn't connect to the server.",
        isBot: true,
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const copyMessage = (text) => {
    navigator.clipboard.writeText(text);
  };

  const downloadChat = () => {
    const chatHistory = messages.map(msg => 
      `[${formatTime(msg.timestamp)}] ${msg.isBot ? 'Bot' : 'You'}: ${msg.text}`
    ).join('\n');
    const blob = new Blob([chatHistory], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ecogreen360-chat-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearChat = () => {
    setMessages([
      {
        id: 1,
        text: "🌱 Welcome to EcoGreen360! I'm your AI greenhouse specialist.\n\nI can help you with:\n• Greenhouse design and setup\n• IoT monitoring systems\n• Plant cultivation advice\n• Cost estimates and ROI\n• Sustainable farming practices\n• Email information to colleagues\n\nHow can I assist with your greenhouse project today?",
        isBot: true,
        timestamp: new Date()
      }
    ]);
    setError(null);
    setPendingEmailData(null);
  };

  // Drag handlers
  const handleMouseDown = (e) => {
    if (isMobile || isFullscreen) return;
    if (e.target.closest('.drag-handle')) {
      setIsDragging(true);
      const rect = chatRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      chatRef.current.style.transition = 'none';
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging && chatRef.current && !isMobile && !isFullscreen) {
      e.preventDefault();
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const elementWidth = chatRef.current.offsetWidth;
      const elementHeight = chatRef.current.offsetHeight;
      const padding = 10;

      const constrainedX = Math.max(padding, Math.min(newX, viewportWidth - elementWidth - padding));
      const constrainedY = Math.max(padding, Math.min(newY, viewportHeight - elementHeight - padding));

      chatRef.current.style.position = 'fixed';
      chatRef.current.style.left = `${constrainedX}px`;
      chatRef.current.style.top = `${constrainedY}px`;
      chatRef.current.style.bottom = 'auto';
      chatRef.current.style.right = 'auto';
      chatRef.current.style.transform = 'none';
      setCustomPosition({ x: constrainedX, y: constrainedY });
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      chatRef.current.style.transition = '';
    }
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  // Email Preview Component
  const EmailPreview = ({ emailData, message }) => (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-3 my-2 shadow-lg transform transition-all duration-300 hover:scale-[1.01] w-full">
      <div className="flex items-center mb-3">
        <div className="bg-amber-100 p-1.5 rounded-full mr-2">
          <Mail className="w-4 h-4 text-amber-600" />
        </div>
        <h4 className="font-bold text-amber-800 text-sm">📧 Email Preview</h4>
        <div className="ml-auto">
          <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
        </div>
      </div>
      <div className="bg-white border border-amber-200 rounded-lg p-3 mb-3 shadow-inner">
        <div className="space-y-2 text-xs">
          <div className="flex items-start">
            <span className="font-semibold text-gray-700 w-12 flex-shrink-0">To:</span>
            <span className="bg-blue-50 px-2 py-0.5 rounded text-blue-800 font-mono text-xs break-all">{emailData.recipient}</span>
          </div>
          <div className="flex items-start">
            <span className="font-semibold text-gray-700 w-12 flex-shrink-0">Subject:</span>
            <span className="text-gray-800 text-xs break-words">{emailData.subject}</span>
          </div>
          <div>
            <span className="font-semibold text-gray-700">Content:</span>
            <div className="bg-gray-50 border rounded-lg p-2 mt-1 text-xs font-mono whitespace-pre-wrap max-h-24 overflow-y-auto border-l-2 border-blue-300">
              {emailData.content}
            </div>
          </div>
        </div>
      </div>
      <div className="text-center">
        <p className="text-amber-700 font-medium mb-3 bg-amber-100 p-2 rounded-lg text-xs">{message}</p>
        <div className="flex justify-center space-x-2">
          <button
            onClick={() => {
              setInputMessage('SEND');
              sendMessage();
            }}
            className={`flex items-center px-4 py-2 ${currentTheme.accent} text-white rounded-lg hover:${currentTheme.accentHover} transition-all duration-200 text-xs font-bold shadow-lg transform hover:scale-105 touch-manipulation`}
            disabled={isLoading}
          >
            <Check className="w-3 h-3 mr-1" />
            SEND
          </button>
          <button
            onClick={() => {
              setInputMessage('CANCEL');
              sendMessage();
            }}
            className="flex items-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-200 text-xs font-bold shadow-lg transform hover:scale-105 touch-manipulation"
            disabled={isLoading}
          >
            <XCircle className="w-3 h-3 mr-1" />
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );

  if (!isOpen) {
    return (
      <div style={getPositionStyles()} className="fixed z-50">
        <button
          onClick={() => setIsOpen(true)}
          className={`group relative bg-gradient-to-r ${currentTheme.primary} hover:${currentTheme.primaryHover} text-white rounded-full ${isMobile ? 'p-3' : 'p-4'} shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-110 animate-pulse hover:animate-none touch-manipulation`}
        >
          <img 
            src="https://ik.imagekit.io/9dtagplxz/ChatGPT%20Image%20Jul%2010,%202025,%2012_04_45%20AM.png?updatedAt=1752086117483"
            alt="Chat"
            className={`${isMobile ? 'w-6 h-6' : sizeConfig.iconSize} rounded-full object-cover`}
            onError={(e) => e.target.style.display = 'none'}
          />
          <MessageCircle className={`${isMobile ? 'w-6 h-6' : sizeConfig.iconSize} hidden`} />
          {unreadCount > 0 && (
            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold animate-bounce">
              {unreadCount}
            </div>
          )}
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-ping"></div>
        </button>
        <audio ref={audioRef} preload="auto">
          <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBjiR1/LMeysEIHPE8d+QQAkTXqzf71Y=" type="audio/wav" />
        </audio>
      </div>
    );
  }

  return (
    <div ref={chatRef} className={`fixed z-50 ${sizeConfig.width} ${isMinimized ? 'h-16' : sizeConfig.height} ${isDragging ? 'cursor-grabbing' : ''}`} style={getPositionStyles()} onMouseDown={handleMouseDown}>
      {/* Full chat UI */}
      <div className={`bg-white rounded-2xl shadow-2xl border border-gray-200 ${isMinimized ? 'h-16' : sizeConfig.height} transition-all duration-300 flex flex-col overflow-hidden backdrop-blur-lg bg-white/95`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-t-2xl cursor-grab active:cursor-grabbing relative">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center ring-2 ring-white/30">
                <img src="https://ik.imagekit.io/9dtagplxz/ChatGPT%20Image%20Jul%2010,%202025,%2012_04_45%20AM.png?updatedAt=1752086117483" alt="AI" className="w-7 h-7 rounded-full object-cover" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
            </div>
            <div>
              <h3 className="font-bold text-sm flex items-center">EcoGreen360 AI <Sparkles className="w-4 h-4 ml-1 animate-pulse" /></h3>
              <p className="text-xs opacity-90">Greenhouse & IoT Expert</p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-2 hover:bg-white/20 rounded-lg">
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button onClick={() => setShowSettings(!showSettings)} className="p-2 hover:bg-white/20 rounded-lg">
              <Settings className="w-4 h-4" />
            </button>
            <button onClick={downloadChat} className="p-2 hover:bg-white/20 rounded-lg">
              <Download className="w-4 h-4" />
            </button>
            {!isMobile && <button onClick={() => setIsMinimized(!isMinimized)} className="p-2 hover:bg-white/20 rounded-lg">
              {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>}
            <button onClick={clearChat} className="p-2 hover:bg-white/20 rounded-lg">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/20 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Settings */}
        {showSettings && !isMinimized && (
          <div className="bg-gray-50 border-b p-3 space-y-3 text-xs">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block font-semibold mb-1">Size:</label>
                <select value={size} onChange={(e) => setSize(e.target.value)} className="w-full p-1 border rounded text-xs">
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Position:</label>
                <select value={position} onChange={(e) => setPosition(e.target.value)} className="w-full p-1 border rounded text-xs">
                  <option value="bottom-right">Bottom Right</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="top-right">Top Right</option>
                  <option value="top-left">Top Left</option>
                  <option value="center">Center</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Theme:</label>
                <select value={theme} onChange={(e) => setTheme(e.target.value)} className="w-full p-1 border rounded text-xs">
                  <option value="green">Green</option>
                  <option value="blue">Blue</option>
                  <option value="purple">Purple</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Chat Body */}
        {!isMinimized && (
          <>
            {error && (
              <div className="bg-red-50 border-b border-red-200 p-3">
                <div className="flex items-center space-x-2 text-red-700 text-sm">
                  <AlertCircle className="w-5 h-5" />
                  <span>{error}</span>
                </div>
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-gray-50 to-white">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'}`}>
                  <div className={`flex items-start space-x-2 max-w-[80%] ${msg.isBot ? 'flex-row' : 'flex-row-reverse space-x-reverse'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${msg.isBot ? 'bg-gradient-to-r from-green-100 to-emerald-200' : 'bg-gradient-to-r from-blue-100 to-cyan-200'} ring-2 ring-white`}>
                      {msg.isBot ? <Bot className="w-4 h-4 text-green-600" /> : <User className="w-4 h-4 text-blue-600" />}
                    </div>
                    <div className="flex-1 space-y-1">
                      {msg.isEmailPreview ? (
                        <EmailPreview emailData={msg.emailData} message={msg.message} />
                      ) : (
                        <div className={`px-3 py-2 rounded-2xl text-sm shadow-lg ${
                          msg.isBot
                            ? msg.isError
                              ? 'bg-red-100 text-red-800 border border-red-200'
                              : msg.isEmailResult && msg.emailSuccess
                                ? 'bg-green-100 text-green-800 border border-green-200'
                                : 'bg-white text-gray-800 border border-gray-200'
                            : `bg-gradient-to-r ${currentTheme.primary} text-white`
                        } rounded-bl-md`}>
                          <p className="whitespace-pre-wrap">{msg.text}</p>
                        </div>
                      )}
                      <div className={`text-xs text-gray-500 ${msg.isBot ? 'justify-start' : 'justify-end'} flex items-center space-x-2`}>
                        <span>{formatTime(msg.timestamp)}</span>
                        {!msg.isBot && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-100 to-emerald-200 ring-2 ring-white flex items-center justify-center">
                      <Bot className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="bg-white border rounded-2xl rounded-bl-md px-4 py-3 shadow-lg">
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                        <span className="text-sm text-gray-600">Thinking...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t bg-white p-4 rounded-b-2xl">
              <div className="flex items-end space-x-3">
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={pendingEmailData ? "Type 'SEND' or 'CANCEL'..." : "Ask about greenhouse setup..."}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl resize-none text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50 focus:bg-white"
                    rows="1"
                    style={{ minHeight: '44px', maxHeight: '120px' }}
                    disabled={isLoading}
                  />
                  <div className="absolute bottom-2 right-3 text-xs text-gray-400">{inputMessage.length}/500</div>
                </div>
                <button
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  className={`p-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 transition-all duration-200 shadow-lg transform hover:scale-105`}
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Chatbot;