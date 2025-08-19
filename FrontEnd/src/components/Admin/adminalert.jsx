import React, { useState, useEffect, useRef } from 'react';
import { Bell, Plus, Edit2, Trash2, Filter, X, CheckCircle, AlertTriangle, Info, Zap } from 'lucide-react';

const AlertApp = () => {
  const [alerts, setAlerts] = useState([]);
  const [filteredAlerts, setFilteredAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [realtimeMessages, setRealtimeMessages] = useState([]);
  const [username, setUsername] = useState('');
  const [isUsernameSet, setIsUsernameSet] = useState(false);

  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);

  const [formData, setFormData] = useState({
    description: '',
    category: 'info'
  });

  const categories = [
    { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-800', icon: AlertTriangle },
    { value: 'warning', label: 'Warning', color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle },
    { value: 'info', label: 'Info', color: 'bg-blue-100 text-blue-800', icon: Info },
    { value: 'success', label: 'Success', color: 'bg-green-100 text-green-800', icon: CheckCircle }
  ];

  // Connect to WebSocket
  const connectWebSocket = () => {
    if (!username.trim()) return;

    try {
      wsRef.current = new WebSocket(`ws://localhost:9091/subscribe/${encodeURIComponent(username)}`);

      wsRef.current.onopen = () => {
        setWsConnected(true);
        addRealtimeMessage('Connected to real-time alerts', 'success');
      };

      wsRef.current.onmessage = (event) => {
        addRealtimeMessage(event.data, 'info');
        fetchAlerts(); // Refresh alerts on message
      };

      wsRef.current.onclose = () => {
        setWsConnected(false);
        addRealtimeMessage('Disconnected from real-time alerts', 'error');
      };

      wsRef.current.onerror = () => {
        addRealtimeMessage('WebSocket connection error', 'error');
      };
    } catch (err) {
      addRealtimeMessage('Failed to connect to real-time alerts', 'error');
    }
  };

  const addRealtimeMessage = (message, type) => {
    const newMessage = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date().toLocaleTimeString()
    };
    setRealtimeMessages(prev => [...prev.slice(-9), newMessage]); // Keep last 10
  };

  // Fetch alerts
  const fetchAlerts = async (category = '') => {
    setLoading(true);
    setError('');
    try {
      const url = category
        ? `http://localhost:8070/api/alerts?category=${category}`
        : 'http://localhost:8070/api/alerts';

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch alerts');

      const data = await response.json();
      setAlerts(data);
      setFilteredAlerts(data);
    } catch (err) {
      setError('Failed to load alerts: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Create or update alert
  const handleSubmit = async () => {
    if (!formData.description.trim()) return;

    setLoading(true);
    setError('');
    try {
      const url = editingAlert
        ? `http://localhost:8070/api/alerts/${editingAlert.id}`
        : 'http://localhost:8070/api/alerts';

      const method = editingAlert ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to save alert');

      setSuccess(editingAlert ? 'Alert updated successfully!' : 'Alert created successfully!');
      setIsFormOpen(false);
      setEditingAlert(null);
      setFormData({ description: '', category: 'info' });
      fetchAlerts(selectedCategory);
    } catch (err) {
      setError('Failed to save alert: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete alert
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this alert?')) return;

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8070/api/alerts/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete alert');

      setSuccess('Alert deleted successfully!');
      fetchAlerts(selectedCategory);
    } catch (err) {
      setError('Failed to delete alert: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter alerts
  const handleCategoryFilter = (category) => {
    setSelectedCategory(category);
    fetchAlerts(category);
  };

  // Edit alert
  const handleEdit = (alert) => {
    setEditingAlert(alert);
    setFormData({
      description: alert.description,
      category: alert.category
    });
    setIsFormOpen(true);
  };

  // Clear messages
  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  // Set username
  const handleUsernameSubmit = () => {
    if (username.trim()) {
      setIsUsernameSet(true);
      connectWebSocket();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    fetchAlerts();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [selectedCategory]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [realtimeMessages]);

  // Username setup screen
  if (!isUsernameSet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <Bell className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900">Alert System</h1>
            <p className="text-gray-600 mt-2">Enter your name to get started</p>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your name"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <button
              onClick={handleUsernameSubmit}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition duration-200 font-medium"
            >
              Connect to Alerts
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <Bell className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Alert Management</h1>
                <p className="text-sm text-gray-600">Welcome back, {username}</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-600">
                  {wsConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>

              <button
                onClick={() => setIsFormOpen(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200 flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>New Alert</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="text-red-700">{error}</span>
            </div>
            <button onClick={clearMessages} className="text-red-600 hover:text-red-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-700">{success}</span>
            </div>
            <button onClick={clearMessages} className="text-green-600 hover:text-green-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Alert List */}
          <div className="lg:col-span-2">
            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
              <div className="flex items-center space-x-4">
                <Filter className="w-5 h-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Filter by category:</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleCategoryFilter('')}
                    className={`px-3 py-1 rounded-full text-sm transition duration-200 ${
                      selectedCategory === '' 
                        ? 'bg-gray-200 text-gray-800' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    All
                  </button>
                  {categories.map(category => (
                    <button
                      key={category.value}
                      onClick={() => handleCategoryFilter(category.value)}
                      className={`px-3 py-1 rounded-full text-sm transition duration-200 ${
                        selectedCategory === category.value
                          ? category.color
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {category.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Alert List */}
            <div className="space-y-4">
              {loading ? (
                <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 mt-2">Loading alerts...</p>
                </div>
              ) : filteredAlerts.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                  <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No alerts found</p>
                </div>
              ) : (
                filteredAlerts.map(alert => {
                  const category = categories.find(cat => cat.value === alert.category) || categories[2];
                  const IconComponent = category.icon;

                  return (
                    <div key={alert.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition duration-200">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4 flex-1">
                          <IconComponent
                            className={`w-6 h-6 mt-1 ${
                              category.value === 'critical'
                                ? 'text-red-600'
                                : category.value === 'warning'
                                ? 'text-yellow-600'
                                : category.value === 'success'
                                ? 'text-green-600'
                                : 'text-blue-600'
                            }`}
                          />
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${category.color}`}>
                                {category.label}
                              </span>
                              <span className="text-sm text-gray-500">#{alert.id}</span>
                            </div>
                            <p className="text-gray-900 mb-2">{alert.description}</p>
                            <p className="text-sm text-gray-500">{alert.timestamp}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEdit(alert)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition duration-200"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(alert.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition duration-200"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Real-time Messages Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center space-x-2">
                  <Zap className="w-5 h-5 text-yellow-600" />
                  <h3 className="font-medium text-gray-900">Real-time Updates</h3>
                </div>
              </div>

              <div className="p-4 h-96 overflow-y-auto">
                {realtimeMessages.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center mt-8">
                    No messages yet. Create or update alerts to see real-time notifications.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {realtimeMessages.map(msg => (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-lg text-sm ${
                          msg.type === 'success'
                            ? 'bg-green-50 text-green-800'
                            : msg.type === 'error'
                            ? 'bg-red-50 text-red-800'
                            : 'bg-blue-50 text-blue-800'
                        }`}
                      >
                        <p className="font-medium">{msg.message}</p>
                        <p className="text-xs opacity-70 mt-1">{msg.timestamp}</p>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingAlert ? 'Edit Alert' : 'Create New Alert'}
                </h2>
                <button
                  onClick={() => {
                    setIsFormOpen(false);
                    setEditingAlert(null);
                    setFormData({ description: '', category: 'info' });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter alert description..."
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {categories.map(category => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    setIsFormOpen(false);
                    setEditingAlert(null);
                    setFormData({ description: '', category: 'info' });
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition duration-200"
                >
                  {loading ? 'Saving...' : editingAlert ? 'Update Alert' : 'Create Alert'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlertApp;