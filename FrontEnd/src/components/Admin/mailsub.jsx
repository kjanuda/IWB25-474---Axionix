import React, { useState, useEffect } from 'react';
import { Mail, Users, Send, Trash2, Plus, RefreshCw, AlertCircle, CheckCircle, X, Eye, Type, Image, Palette } from 'lucide-react';

const API_BASE = 'http://localhost:9092'; // Ensure this matches your Ballerina backend port

const EcoGreenAdmin = () => {
  const [subscribers, setSubscribers] = useState([]);
  const [stats, setStats] = useState({ activeSubscribers: 0, totalSubscribers: 0, unsubscribed: 0 });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [notification, setNotification] = useState(null);
  const [newSubscriberEmail, setNewSubscriberEmail] = useState('');

  // Email builder state
  const [emailBuilder, setEmailBuilder] = useState({
    subject: '',
    title: '',
    content: '',
    imageUrl: '',
    buttonText: '',
    buttonLink: '',
    backgroundColor: '#f8f9fa',
    primaryColor: '#4CAF50'
  });
  const [showPreview, setShowPreview] = useState(false);

  // Generate HTML email from builder data
  // This function now creates the complete, self-contained HTML email
  const generateEmailHTML = () => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${emailBuilder.subject || 'EcoGreen Newsletter'}</title>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      margin: 0; 
      padding: 0; 
      background-color: ${emailBuilder.backgroundColor}; 
    }
    .container { 
      max-width: 600px; 
      margin: 0 auto; 
      background: white; 
      border: 1px solid #e0e0e0; /* Optional border for email clients */
    }
    .header { 
      background: ${emailBuilder.primaryColor}; 
      color: white; 
      padding: 30px 20px; 
      text-align: center; 
    }
    .header h1 { 
      margin: 0; 
      font-size: 28px; 
    }
    .content { 
      padding: 30px 20px; 
    }
    .content h2 { 
      color: #333; 
      margin-top: 0; 
    }
    .content p { 
      color: #666; 
      line-height: 1.6; 
      margin: 15px 0; 
    }
    .image { 
      text-align: center; 
      margin: 20px 0; 
    }
    .image img { 
      max-width: 100%; 
      height: auto; 
      border-radius: 8px; 
    }
    .button { 
      text-align: center; 
      margin: 30px 0; 
    }
    .button a { 
      background: ${emailBuilder.primaryColor}; 
      color: white; 
      padding: 15px 30px; 
      text-decoration: none; 
      border-radius: 5px; 
      display: inline-block; 
      font-weight: bold; 
    }
    .footer { 
      background: #f8f9fa; 
      padding: 20px; 
      text-align: center; 
      font-size: 12px; 
      color: #666; 
    }
    /* Ensure styles work in various email clients */
    .button a:hover {
      background: ${emailBuilder.primaryColor}; /* Fallback for hover if supported */
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🌱 ${emailBuilder.title || 'EcoGreen Newsletter'}</h1>
    </div>
    <div class="content">
      ${emailBuilder.imageUrl ? `<div class="image"><img src="${emailBuilder.imageUrl}" alt="Newsletter Image"></div>` : ''}
      <div>
        ${emailBuilder.content.split('\n').map(p => `<p>${p}</p>`).join('')}
      </div>
      ${emailBuilder.buttonText && emailBuilder.buttonLink ? `
        <div class="button">
          <a href="${emailBuilder.buttonLink}" target="_blank" rel="noopener">${emailBuilder.buttonText}</a>
        </div>
      ` : ''}
    </div>
    <div class="footer">
      <p>🌍 Together for a greener planet | EcoGreen Newsletter</p>
      <p>You received this email because you subscribed to our newsletter. <br>
         <a href="mailto:${/* You might want to make this configurable or use a generic contact */ 'contact@ecogreen.example'}">Unsubscribe</a> | 
         <a href="http://localhost:5173">Visit our website</a> <!-- Update with your actual website -->
      </p>
    </div>
  </div>
</body>
</html>`;
  };

  const fetchSubscribers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/subscribers`);
      if (response.ok) {
        const data = await response.json();
        setSubscribers(data);
      } else {
        const errorData = await response.json().catch(() => ({}));
        showNotification(`Failed to fetch subscribers: ${errorData.message || response.statusText}`, 'error');
      }
    } catch (error) {
      console.error("Fetch subscribers error:", error);
      showNotification('Error connecting to server: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/subscribers/count`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to fetch stats:', errorData.message || response.statusText);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const addSubscriber = async (e) => {
    if (e) e.preventDefault();
    if (!newSubscriberEmail) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/subscribers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newSubscriberEmail })
      });
      if (response.ok) {
        const result = await response.json();
        showNotification(result.message, result.status === 'subscribed' ? 'success' : 'info');
        setNewSubscriberEmail('');
        fetchSubscribers(); // Refresh list
        fetchStats();       // Refresh stats
      } else {
        const errorData = await response.json().catch(() => ({}));
        showNotification(`Failed to add subscriber: ${errorData.message || response.statusText}`, 'error');
      }
    } catch (error) {
      console.error("Add subscriber error:", error);
      showNotification('Error adding subscriber: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const removeSubscriber = async (subscriberId, email) => {
    if (!confirm(`Are you sure you want to unsubscribe ${email}?`)) return;
    try {
      const response = await fetch(`${API_BASE}/subscribers/${encodeURIComponent(subscriberId)}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        const result = await response.json();
        showNotification(result.message, 'success');
        fetchSubscribers(); // Refresh list
        fetchStats();       // Refresh stats
      } else {
        const errorData = await response.json().catch(() => ({}));
        showNotification(`Failed to remove subscriber: ${errorData.message || response.statusText}`, 'error');
      }
    } catch (error) {
      console.error("Remove subscriber error:", error);
      showNotification('Error removing subscriber: ' + error.message, 'error');
    }
  };

  const sendNewsletter = async () => {
    if (!emailBuilder.subject || !emailBuilder.content) {
      showNotification('Please fill in subject and content', 'error');
      return;
    }
    if (!confirm('Are you sure you want to send this newsletter to all subscribers?')) return;
    setLoading(true);
    try {
      // Generate the full HTML content using the builder data
      const htmlContent = generateEmailHTML();
      // console.log("Sending HTML Content:", htmlContent); // For debugging

      const response = await fetch(`${API_BASE}/subscribers/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: emailBuilder.subject,
          htmlContent: htmlContent,     // Send the complete HTML
          textContent: emailBuilder.content // Optional: send plain text version
        })
      });

      if (response.ok) {
        const result = await response.json();
        showNotification(`Newsletter sent to ${result.sentCount} subscribers!`, 'success');
        // Reset form after successful send
        setEmailBuilder({
          subject: '', title: '', content: '', imageUrl: '',
          buttonText: '', buttonLink: '', backgroundColor: '#f8f9fa', primaryColor: '#4CAF50'
        });
        setShowPreview(false); // Optionally hide preview after sending
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("Send newsletter error response:", errorData);
        showNotification(`Failed to send newsletter: ${errorData.message || response.statusText}`, 'error');
      }
    } catch (error) {
      console.error("Send newsletter network error:", error);
      showNotification('Error sending newsletter: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type) => {
    setNotification({ message, type });
    // Clear notification after 5 seconds
    setTimeout(() => setNotification(null), 5000);
  };

  useEffect(() => {
    fetchSubscribers();
    fetchStats();
  }, []);

  // Notification Component
  const Notification = ({ notification, onClose }) => {
    if (!notification) return null;
    const bgColor = {
      success: 'bg-green-50 border-green-200 text-green-800',
      error: 'bg-red-50 border-red-200 text-red-800',
      info: 'bg-blue-50 border-blue-200 text-blue-800'
    }[notification.type];

    const Icon = notification.type === 'success' ? CheckCircle : AlertCircle;

    return (
      <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg border ${bgColor} shadow-lg max-w-sm`}>
        <div className="flex items-start">
          <Icon className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
          <p className="text-sm flex-1">{notification.message}</p>
          <button onClick={onClose} className="ml-2 text-gray-500 hover:text-gray-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notification Toast */}
      <Notification notification={notification} onClose={() => setNotification(null)} />

      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🌱 EcoGreen Newsletter Admin</h1>
              <p className="text-sm text-gray-500">Create beautiful newsletters and manage subscribers</p>
            </div>
            <button
              onClick={() => { fetchSubscribers(); fetchStats(); }}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[
            { icon: Users, title: 'Active Subscribers', value: stats.activeSubscribers, color: 'bg-green-600' },
            { icon: Mail, title: 'Total Subscribers', value: stats.totalSubscribers, color: 'bg-blue-600' },
            { icon: Trash2, title: 'Unsubscribed', value: stats.unsubscribed, color: 'bg-gray-600' }
          ].map(({ icon: Icon, title, value, color }) => (
            <div key={title} className="bg-white rounded-lg p-6 shadow-sm border">
              <div className="flex items-center">
                <div className={`p-3 rounded-full ${color} mr-4`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">{title}</p>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 mb-8 border-b">
          {[
            { id: 'dashboard', label: 'Subscribers', icon: Users },
            { id: 'newsletter', label: 'Create Newsletter', icon: Mail }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center px-4 py-2 rounded-t-lg font-medium transition-colors ${
                activeTab === id 
                  ? 'bg-white text-green-700 border-t border-l border-r border-gray-200 -mb-px z-10' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-4 h-4 mr-2" />
              {label}
            </button>
          ))}
        </div>

        {/* Dashboard Tab Content */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Add Subscriber Form */}
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Plus className="w-5 h-5 mr-2" />
                Add New Subscriber
              </h3>
              <div className="flex gap-4">
                <input
                  type="email"
                  placeholder="Enter email address"
                  value={newSubscriberEmail}
                  onChange={(e) => setNewSubscriberEmail(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addSubscriber(e)}
                  className="flex-1 px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:outline-none"
                />
                <button
                  onClick={addSubscriber}
                  disabled={loading || !newSubscriberEmail}
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Subscribers List */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b">
                <h3 className="text-lg font-semibold">Active Subscribers ({subscribers.length})</h3>
              </div>
              {loading ? (
                <div className="p-8 text-center">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" />
                  <p className="text-gray-500">Loading subscribers...</p>
                </div>
              ) : subscribers.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No active subscribers found.</p>
                </div>
              ) : (
                <div className="divide-y max-h-96 overflow-y-auto">
                  {subscribers.map((sub) => (
                    <div key={sub.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                      <div>
                        <p className="font-medium">{sub.email}</p>
                        <p className="text-sm text-gray-500">
                          Subscribed: {new Date(sub.subscribedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => removeSubscriber(sub.id, sub.email)}
                        className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-md transition-colors"
                        aria-label={`Remove ${sub.email}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Newsletter Builder Tab Content */}
        {activeTab === 'newsletter' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Builder Form */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg p-6 shadow-sm border">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Mail className="w-5 h-5 mr-2" />
                  Newsletter Builder
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Subject Line *</label>
                    <input
                      type="text"
                      placeholder="Your newsletter subject"
                      value={emailBuilder.subject}
                      onChange={(e) => setEmailBuilder({...emailBuilder, subject: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Newsletter Title</label>
                    <input
                      type="text"
                      placeholder="Main heading"
                      value={emailBuilder.title}
                      onChange={(e) => setEmailBuilder({...emailBuilder, title: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Content *</label>
                    <textarea
                      rows={6}
                      placeholder="Write your newsletter content here... (Use line breaks for paragraphs)"
                      value={emailBuilder.content}
                      onChange={(e) => setEmailBuilder({...emailBuilder, content: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Image URL (Optional)</label>
                    <input
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      value={emailBuilder.imageUrl}
                      onChange={(e) => setEmailBuilder({...emailBuilder, imageUrl: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Button Text</label>
                      <input
                        type="text"
                        placeholder="Learn More"
                        value={emailBuilder.buttonText}
                        onChange={(e) => setEmailBuilder({...emailBuilder, buttonText: e.target.value})}
                        className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Button Link</label>
                      <input
                        type="url"
                        placeholder="https://example.com"
                        value={emailBuilder.buttonLink}
                        onChange={(e) => setEmailBuilder({...emailBuilder, buttonLink: e.target.value})}
                        className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1 flex items-center">
                        <Palette className="w-4 h-4 mr-1" /> Primary Color
                      </label>
                      <input
                        type="color"
                        value={emailBuilder.primaryColor}
                        onChange={(e) => setEmailBuilder({...emailBuilder, primaryColor: e.target.value})}
                        className="w-full h-10 border rounded-md cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 flex items-center">
                        <Palette className="w-4 h-4 mr-1" /> Background Color
                      </label>
                      <input
                        type="color"
                        value={emailBuilder.backgroundColor}
                        onChange={(e) => setEmailBuilder({...emailBuilder, backgroundColor: e.target.value})}
                        className="w-full h-10 border rounded-md cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex flex-wrap justify-between items-center pt-6 gap-2">
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="flex items-center px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {showPreview ? 'Hide Preview' : 'Show Preview'}
                  </button>
                  <button
                    onClick={sendNewsletter}
                    disabled={loading || !emailBuilder.subject || !emailBuilder.content}
                    className="flex items-center px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Send to {stats.activeSubscribers} Subscribers
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Preview Panel */}
            {showPreview && (
              <div className="bg-white rounded-lg shadow-sm border flex flex-col">
                <div className="px-4 py-2 bg-gray-50 border-b rounded-t-lg">
                  <p className="text-sm font-medium flex items-center">
                    <Eye className="w-4 h-4 mr-2" /> Email Preview
                  </p>
                </div>
                <div
                  className="p-4 flex-grow overflow-y-auto bg-white"
                  style={{ minHeight: '400px' }} // Ensure minimum height for preview
                >
                  {/* Render the generated HTML safely for preview */}
                  <div dangerouslySetInnerHTML={{ __html: generateEmailHTML() }} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EcoGreenAdmin;