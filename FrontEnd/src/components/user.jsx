import React, { useState, useEffect, useRef } from 'react';
import { Send, User, MessageCircle, Phone, Mail, Hash, FileText, Clock } from 'lucide-react';

const UserChatSupport = () => {
  const [currentStep, setCurrentStep] = useState('ticket'); // ticket, verification, chat
  const [ticketData, setTicketData] = useState({
    userEmail: '',
    userName: '',
    subject: '',
    category: 'general',
    priority: 'medium'
  });
  const [verificationData, setVerificationData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    registrationNumber: '',
    accountNumber: '',
    additionalInfo: ''
  });
  const [ticketId, setTicketId] = useState('');
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [ws, setWs] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Step 1: Create Support Ticket
  const handleCreateTicket = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8086/support/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ticketData),
      });

      const result = await response.json();
      
      if (result.success) {
        setTicketId(result.ticketId);
        setCurrentStep('verification');
        setVerificationData(prev => ({
          ...prev,
          email: ticketData.userEmail
        }));
      } else {
        alert('Failed to create ticket: ' + result.error);
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
      alert('Error creating ticket. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Submit Verification
  const handleVerification = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`http://localhost:8086/support/tickets/${ticketId}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(verificationData),
      });

      const result = await response.json();
      
      if (result.success) {
        setCurrentStep('chat');
        initializeWebSocket();
        loadChatMessages();
      } else {
        alert('Verification failed: ' + result.error);
      }
    } catch (error) {
      console.error('Error submitting verification:', error);
      alert('Verification error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize WebSocket connection
  const initializeWebSocket = () => {
    const websocket = new WebSocket(`ws://localhost:8086/support/ws/user/${ticketId}`);
    
    websocket.onopen = () => {
      console.log('Connected to support chat');
      setIsConnected(true);
      setWs(websocket);
    };

    websocket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setMessages(prev => [...prev, {
        id: message.messageId || Date.now(),
        content: message.content,
        sender: message.senderType,
        senderName: message.senderName,
        timestamp: new Date(message.timestamp),
        type: message.type || 'text'
      }]);
    };

    websocket.onclose = () => {
      console.log('Disconnected from support chat');
      setIsConnected(false);
      setWs(null);
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };
  };

  // Load chat messages
  const loadChatMessages = async () => {
    try {
      const response = await fetch(`http://localhost:8086/support/tickets/${ticketId}/messages`);
      const result = await response.json();
      
      if (result.success) {
        const formattedMessages = result.messages.map(msg => ({
          id: msg.messageId,
          content: msg.content,
          sender: msg.senderType,
          senderName: msg.senderName,
          timestamp: new Date(msg.timestamp),
          type: msg.messageType
        }));
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !ws || !isConnected) return;

    const messageData = {
      senderId: 'user-' + Date.now(),
      senderName: ticketData.userName,
      content: newMessage,
      ticketId: ticketId,
      timestamp: new Date().toISOString()
    };

    // Send via WebSocket
    ws.send(JSON.stringify(messageData));

    // Also save via REST API
    try {
      await fetch(`http://localhost:8086/support/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          senderId: messageData.senderId,
          senderType: 'user',
          senderName: messageData.senderName,
          content: messageData.content,
          messageType: 'text'
        }),
      });
    } catch (error) {
      console.error('Error saving message:', error);
    }

    setNewMessage('');
  };

  // Render ticket creation form
  const renderTicketForm = () => (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-8">
        <MessageCircle className="w-16 h-16 text-blue-500 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Customer Support</h1>
        <p className="text-gray-600">We're here to help! Please fill out the form below to get started.</p>
      </div>

      <form onSubmit={handleCreateTicket} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 inline mr-2" />
              Your Name *
            </label>
            <input
              type="text"
              required
              value={ticketData.userName}
              onChange={(e) => setTicketData(prev => ({...prev, userName: e.target.value}))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your full name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="w-4 h-4 inline mr-2" />
              Email Address *
            </label>
            <input
              type="email"
              required
              value={ticketData.userEmail}
              onChange={(e) => setTicketData(prev => ({...prev, userEmail: e.target.value}))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your email"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Subject *
          </label>
          <input
            type="text"
            required
            value={ticketData.subject}
            onChange={(e) => setTicketData(prev => ({...prev, subject: e.target.value}))}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Brief description of your issue"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={ticketData.category}
              onChange={(e) => setTicketData(prev => ({...prev, category: e.target.value}))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="general">General Inquiry</option>
              <option value="technical">Technical Support</option>
              <option value="billing">Billing</option>
              <option value="account">Account Issues</option>
              <option value="bug">Bug Report</option>
              <option value="feature">Feature Request</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
            <select
              value={ticketData.priority}
              onChange={(e) => setTicketData(prev => ({...prev, priority: e.target.value}))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200"
        >
          {isLoading ? 'Creating Ticket...' : 'Create Support Ticket'}
        </button>
      </form>
    </div>
  );

  // Render verification form
  const renderVerificationForm = () => (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Verify Your Identity</h2>
        <p className="text-gray-600">Please provide the following information to verify your identity before connecting to an agent.</p>
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800"><strong>Ticket ID:</strong> {ticketId}</p>
        </div>
      </div>

      <form onSubmit={handleVerification} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 inline mr-2" />
              Full Name *
            </label>
            <input
              type="text"
              required
              value={verificationData.fullName}
              onChange={(e) => setVerificationData(prev => ({...prev, fullName: e.target.value}))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="Your full legal name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="w-4 h-4 inline mr-2" />
              Email Address *
            </label>
            <input
              type="email"
              required
              value={verificationData.email}
              onChange={(e) => setVerificationData(prev => ({...prev, email: e.target.value}))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="Your registered email"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Phone className="w-4 h-4 inline mr-2" />
              Phone Number *
            </label>
            <input
              type="tel"
              required
              value={verificationData.phoneNumber}
              onChange={(e) => setVerificationData(prev => ({...prev, phoneNumber: e.target.value}))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="Your phone number"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Hash className="w-4 h-4 inline mr-2" />
              Registration Number *
            </label>
            <input
              type="text"
              required
              value={verificationData.registrationNumber}
              onChange={(e) => setVerificationData(prev => ({...prev, registrationNumber: e.target.value}))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="Your registration/customer ID"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Account Number (Optional)
          </label>
          <input
            type="text"
            value={verificationData.accountNumber}
            onChange={(e) => setVerificationData(prev => ({...prev, accountNumber: e.target.value}))}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            placeholder="Your account number (if applicable)"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Information
          </label>
          <textarea
            value={verificationData.additionalInfo}
            onChange={(e) => setVerificationData(prev => ({...prev, additionalInfo: e.target.value}))}
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            placeholder="Any additional information that might help verify your identity"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200"
        >
          {isLoading ? 'Verifying...' : 'Verify Identity & Connect to Agent'}
        </button>
      </form>
    </div>
  );

  // Render chat interface
  const renderChatInterface = () => (
    <div className="max-w-4xl mx-auto h-screen flex flex-col bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Chat Header */}
      <div className="bg-blue-500 text-white p-4 flex items-center justify-between">
        <div className="flex items-center">
          <MessageCircle className="w-6 h-6 mr-3" />
          <div>
            <h3 className="font-semibold">Support Chat</h3>
            <p className="text-sm opacity-90">Ticket: {ticketId}</p>
          </div>
        </div>
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-2 ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
          <span className="text-sm">{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                message.sender === 'user'
                  ? 'bg-blue-500 text-white'
                  : message.sender === 'system'
                  ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                  : 'bg-white text-gray-800 border border-gray-200'
              }`}
            >
              <div className="flex items-center mb-1">
                <span className="text-xs font-medium opacity-75">
                  {message.senderName || message.sender}
                </span>
                <Clock className="w-3 h-3 ml-2 opacity-50" />
                <span className="text-xs opacity-50 ml-1">
                  {message.timestamp?.toLocaleTimeString() || 'now'}
                </span>
              </div>
              <p className="text-sm">{message.content}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={isConnected ? "Type your message..." : "Connecting..."}
            disabled={!isConnected}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
          />
          <button
            type="submit"
            disabled={!isConnected || !newMessage.trim()}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white p-2 rounded-lg transition-colors duration-200"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      {currentStep === 'ticket' && renderTicketForm()}
      {currentStep === 'verification' && renderVerificationForm()}
      {currentStep === 'chat' && renderChatInterface()}
    </div>
  );
};

export default UserChatSupport;