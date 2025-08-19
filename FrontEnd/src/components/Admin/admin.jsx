import React, { useState, useEffect } from 'react';
import { 
  Users, Mail, Briefcase, TrendingUp, Eye, Send, Plus, Search, 
  Filter, MoreVertical, Calendar, DollarSign, MapPin, Building2,
  Bell, Settings, User, LogOut, RefreshCw, Download, Edit,
  Trash2, CheckCircle, AlertCircle, X, Upload, Palette, Clock
} from 'lucide-react';

const UnifiedAdminDashboard = () => {
  // API Base URLs
  const JOB_API_BASE = 'http://localhost:8087';
  const NEWSLETTER_API_BASE = 'http://localhost:9092';
  const CUSTOMER_API_BASE = 'http://localhost:8075';

  // State management
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  
  // Jobs state
  const [jobs, setJobs] = useState([]);
  const [jobApplications, setJobApplications] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showApplications, setShowApplications] = useState(false);
  const [showPostForm, setShowPostForm] = useState(false);
  const [applicationsPagination, setApplicationsPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalApplications: 0
  });
  
  // Job form state
  const [formData, setFormData] = useState({
    positionName: '',
    companyName: '',
    roleOverview: '',
    keyResponsibilities: '',
    requiredQualifications: '',
    location: '',
    employmentType: 'full-time',
    salaryRange: ''
  });
  const [companyLogo, setCompanyLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  
  // Newsletter state
  const [subscribers, setSubscribers] = useState([]);
  const [newSubscriberEmail, setNewSubscriberEmail] = useState('');
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
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  
  // Customer state
  const [customers, setCustomers] = useState([]);
  const [customerStats, setCustomerStats] = useState({
    totalCustomers: 0,
    pending: 0,
    contacted: 0,
    completed: 0
  });
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  
  // Dashboard stats
  const [stats, setStats] = useState({
    totalJobs: 0,
    activeJobs: 0,
    totalApplications: 0,
    totalSubscribers: 0,
    activeSubscribers: 0,
    unsubscribed: 0,
    monthlyViews: 0,
    totalCustomers: 0
  });

  // Utility functions
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Job API functions
  const fetchJobs = async () => {
    setLoading(true);
    try {
      console.log('🔍 Attempting to fetch jobs from:', `${JOB_API_BASE}/jobs`);
      
      const params = new URLSearchParams({
        pageLimit: '50'
      });
      
      const response = await fetch(`${JOB_API_BASE}/jobs?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        mode: 'cors'
      });
      
      console.log('📡 Job API Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Fetched jobs successfully:', data);
        
        if (data.success && Array.isArray(data.jobs)) {
          setJobs(data.jobs);
          setStats(prev => ({
            ...prev,
            totalJobs: data.jobs.length,
            activeJobs: data.jobs.filter(job => job.status !== 'paused').length,
            monthlyViews: data.jobs.reduce((sum, job) => sum + (job.views || 0), 0)
          }));
          showNotification(`Loaded ${data.jobs.length} jobs successfully!`, 'success');
        } else if (Array.isArray(data)) {
          // Handle case where API returns array directly
          setJobs(data);
          setStats(prev => ({
            ...prev,
            totalJobs: data.length,
            activeJobs: data.filter(job => job.status !== 'paused').length,
            monthlyViews: data.reduce((sum, job) => sum + (job.views || 0), 0)
          }));
          showNotification(`Loaded ${data.length} jobs successfully!`, 'success');
        } else {
          console.error('❌ Unexpected job data format:', data);
          showNotification('Unexpected data format received from job server', 'error');
        }
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to fetch jobs:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        
        if (response.status === 404) {
          showNotification('Job API endpoint not found. Check if server is running on port 8086.', 'error');
        } else if (response.status === 0) {
          showNotification('Cannot connect to job server. Check if CORS is enabled and server is running.', 'error');
        } else {
          showNotification(`Job server error (${response.status}): ${response.statusText}`, 'error');
        }
      }
    } catch (error) {
      console.error('❌ Network error fetching jobs:', error);
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        showNotification('Cannot connect to job server. Please check if the server is running on port 8086.', 'error');
      } else {
        showNotification('Job API network error: ' + error.message, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchJobApplications = async (jobId, page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageLimit: '10'
      });
      const response = await fetch(`${JOB_API_BASE}/jobs/${jobId}/applications?${params}`);
      const data = await response.json();
      if (data.success) {
        setJobApplications(data.applications);
        setApplicationsPagination(data.pagination);
        setStats(prev => ({
          ...prev,
          totalApplications: data.pagination.totalApplications
        }));
      } else {
        showNotification('Error fetching applications: ' + data.error, 'error');
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      showNotification('Error fetching applications', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateApplicationStatus = async (applicationId, newStatus) => {
    try {
      const response = await fetch(`${JOB_API_BASE}/applications/${applicationId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      const result = await response.json();
      if (result.success) {
        fetchJobApplications(selectedJob.id, applicationsPagination.currentPage);
        const emailMessage = result.emailSent 
          ? " An email notification has been sent to the applicant."
          : " No email was sent (status unchanged).";
        showNotification(`Application ${newStatus} successfully!${emailMessage}`);
      } else {
        showNotification('Error updating application status: ' + result.error, 'error');
      }
    } catch (error) {
      console.error('Error updating application status:', error);
      showNotification('Error updating application status', 'error');
    }
  };

  const handleViewDetails = async (job) => {
    setSelectedJob(job);
    setShowApplications(true);
    await fetchJobApplications(job.id);
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCompanyLogo(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitJob = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setLoading(true);
    try {
      const formDataToSend = new FormData();
      Object.keys(formData).forEach(key => {
        formDataToSend.append(key, formData[key]);
      });
      if (companyLogo) {
        formDataToSend.append('companyLogo', companyLogo);
      }
      const response = await fetch(`${JOB_API_BASE}/jobs`, {
        method: 'POST',
        body: formDataToSend
      });
      const result = await response.json();
      if (result.success) {
        showNotification('Job posted successfully!');
        setShowPostForm(false);
        setFormData({
          positionName: '',
          companyName: '',
          roleOverview: '',
          keyResponsibilities: '',
          requiredQualifications: '',
          location: '',
          employmentType: 'full-time',
          salaryRange: ''
        });
        setCompanyLogo(null);
        setLogoPreview(null);
        fetchJobs();
      } else {
        showNotification('Error posting job: ' + result.error, 'error');
      }
    } catch (error) {
      console.error('Error posting job:', error);
      showNotification('Error posting job', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Customer API functions
  const fetchCustomers = async () => {
    setLoading(true);
    try {
      console.log('🔍 Attempting to fetch customers from:', `${CUSTOMER_API_BASE}/api/greenhouse/customer-info`);
      
      const response = await fetch(`${CUSTOMER_API_BASE}/api/greenhouse/customer-info`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        mode: 'cors'
      });
      
      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Fetched customers successfully:', data);
        console.log('📊 Number of customers:', data.length);
        
        if (Array.isArray(data)) {
          setCustomers(data);
          setStats(prev => ({
            ...prev,
            totalCustomers: data.length
          }));
          showNotification(`Loaded ${data.length} customers successfully!`, 'success');
        } else {
          console.error('❌ Expected array but got:', typeof data, data);
          showNotification('Unexpected data format received from server', 'error');
        }
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to fetch customers:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        
        if (response.status === 404) {
          showNotification('Customer API endpoint not found. Check if server is running on port 8075.', 'error');
        } else if (response.status === 0) {
          showNotification('Cannot connect to server. Check if CORS is enabled and server is running.', 'error');
        } else {
          showNotification(`Server error (${response.status}): ${response.statusText}`, 'error');
        }
      }
    } catch (error) {
      console.error('❌ Network error fetching customers:', error);
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        showNotification('Cannot connect to customer server. Please check if the server is running on port 8075.', 'error');
      } else {
        showNotification('Network error: ' + error.message, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerStats = async () => {
    try {
      console.log('🔍 Fetching customer stats from:', `${CUSTOMER_API_BASE}/api/greenhouse/customer-info/stats`);
      
      const response = await fetch(`${CUSTOMER_API_BASE}/api/greenhouse/customer-info/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        mode: 'cors'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Fetched customer stats:', data);
        
        setCustomerStats({
          totalCustomers: data.totalCustomers || 0,
          pending: data.statusBreakdown?.pending || 0,
          contacted: data.statusBreakdown?.contacted || 0,
          completed: data.statusBreakdown?.completed || 0
        });
        setStats(prev => ({
          ...prev,
          totalCustomers: data.totalCustomers || 0
        }));
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to fetch customer stats:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
      }
    } catch (error) {
      console.error('❌ Error fetching customer stats:', error);
    }
  };

  const updateCustomerStatus = async (customerId, newStatus) => {
    try {
      const response = await fetch(`${CUSTOMER_API_BASE}/api/greenhouse/customer-info/${customerId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (response.ok) {
        showNotification(`Customer status updated to ${newStatus}`);
        fetchCustomers();
        fetchCustomerStats();
      } else {
        showNotification('Failed to update customer status', 'error');
      }
    } catch (error) {
      console.error('Error updating customer status:', error);
      showNotification('Error updating customer status', 'error');
    }
  };

  const resendCustomerEmails = async (customerId) => {
    setLoading(true);
    try {
      const response = await fetch(`${CUSTOMER_API_BASE}/api/greenhouse/customer-info/${customerId}/resend-emails`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          showNotification('Emails resent successfully!');
        } else {
          showNotification('Failed to resend some emails', 'error');
        }
      } else {
        showNotification('Failed to resend emails', 'error');
      }
    } catch (error) {
      console.error('Error resending emails:', error);
      showNotification('Error resending emails', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleViewCustomerDetails = (customer) => {
    setSelectedCustomer(customer);
    setShowCustomerDetails(true);
  };

  // Newsletter API functions
  const fetchSubscribers = async () => {
    try {
      const response = await fetch(`${NEWSLETTER_API_BASE}/subscribers`);
      if (response.ok) {
        const data = await response.json();
        setSubscribers(data);
      } else {
        const errorData = await response.json().catch(() => ({}));
        showNotification(`Failed to fetch subscribers: ${errorData.message || response.statusText}`, 'error');
      }
    } catch (error) {
      console.error("Fetch subscribers error:", error);
      showNotification('Error connecting to newsletter server: ' + error.message, 'error');
    }
  };

  const fetchNewsletterStats = async () => {
    try {
      const response = await fetch(`${NEWSLETTER_API_BASE}/subscribers/count`);
      if (response.ok) {
        const data = await response.json();
        setStats(prev => ({
          ...prev,
          totalSubscribers: data.totalSubscribers,
          activeSubscribers: data.activeSubscribers,
          unsubscribed: data.unsubscribed
        }));
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to fetch newsletter stats:', errorData.message || response.statusText);
      }
    } catch (error) {
      console.error('Error fetching newsletter stats:', error);
    }
  };

  const addSubscriber = async (e) => {
    if (e) e.preventDefault();
    if (!newSubscriberEmail) return;
    setLoading(true);
    try {
      const response = await fetch(`${NEWSLETTER_API_BASE}/subscribers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newSubscriberEmail })
      });
      if (response.ok) {
        const result = await response.json();
        showNotification(result.message, result.status === 'subscribed' ? 'success' : 'info');
        setNewSubscriberEmail('');
        fetchSubscribers();
        fetchNewsletterStats();
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
      const response = await fetch(`${NEWSLETTER_API_BASE}/subscribers/${encodeURIComponent(subscriberId)}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        const result = await response.json();
        showNotification(result.message, 'success');
        fetchSubscribers();
        fetchNewsletterStats();
      } else {
        const errorData = await response.json().catch(() => ({}));
        showNotification(`Failed to remove subscriber: ${errorData.message || response.statusText}`, 'error');
      }
    } catch (error) {
      console.error("Remove subscriber error:", error);
      showNotification('Error removing subscriber: ' + error.message, 'error');
    }
  };

  const generateEmailHTML = () => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${emailBuilder.subject || 'Newsletter'}</title>
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
      border: 1px solid #e0e0e0;
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
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${emailBuilder.title || 'Newsletter'}</h1>
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
      <p>Thank you for subscribing to our newsletter!</p>
    </div>
  </div>
</body>
</html>`;
  };

  const sendNewsletter = async () => {
    if (!emailBuilder.subject || !emailBuilder.content) {
      showNotification('Please fill in subject and content', 'error');
      return;
    }
    if (!confirm('Are you sure you want to send this newsletter to all subscribers?')) return;
    setLoading(true);
    try {
      const htmlContent = generateEmailHTML();
      const response = await fetch(`${NEWSLETTER_API_BASE}/subscribers/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: emailBuilder.subject,
          htmlContent: htmlContent,
          textContent: emailBuilder.content
        })
      });

      if (response.ok) {
        const result = await response.json();
        showNotification(`Newsletter sent to ${result.sentCount} subscribers!`, 'success');
        setEmailBuilder({
          subject: '', title: '', content: '', imageUrl: '',
          buttonText: '', buttonLink: '', backgroundColor: '#f8f9fa', primaryColor: '#4CAF50'
        });
        setShowEmailPreview(false);
      } else {
        const errorData = await response.json().catch(() => ({}));
        showNotification(`Failed to send newsletter: ${errorData.message || response.statusText}`, 'error');
      }
    } catch (error) {
      console.error("Send newsletter network error:", error);
      showNotification('Error sending newsletter: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Initialize data
  useEffect(() => {
    fetchJobs();
    fetchSubscribers();
    fetchNewsletterStats();
    fetchCustomers();
    fetchCustomerStats();
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

    // Customer Card Component
  const CustomerCard = ({ customer }) => {
    const getStatusColor = (status) => {
      switch (status) {
        case 'pending_review': return 'bg-yellow-100 text-yellow-800';
        case 'contacted': return 'bg-blue-100 text-blue-800';
        case 'completed': return 'bg-green-100 text-green-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    };

    const formatStatus = (status) => {
      if (!status) return 'Unknown';
      return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    const formatDate = (dateString) => {
      if (!dateString) return 'N/A';
      try {
        return new Date(dateString).toLocaleDateString();
      } catch {
        return dateString; // Return as-is if not a valid date
      }
    };

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 overflow-hidden">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-lg">
                  {(customer.name || 'U')[0].toUpperCase()}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">{customer.name || 'N/A'}</h3>
                <p className="text-gray-600 font-medium text-sm">{customer.email || 'N/A'}</p>
                <p className="text-gray-500 text-xs">{customer.phone || 'N/A'}</p>
              </div>
            </div>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(customer.status)}`}>
              {formatStatus(customer.status)}
            </span>
          </div>
          
          <div className="space-y-2 mb-4">
            <div className="flex items-center text-gray-600 text-sm">
              <User className="w-4 h-4 mr-2 text-gray-400" />
              <span className="text-xs">ID:</span>
              <span className="ml-1 font-mono">{customer.customerId || customer.id || 'N/A'}</span>
            </div>
            <div className="flex items-start text-gray-600 text-sm">
              <MapPin className="w-4 h-4 mr-2 text-gray-400 mt-0.5 flex-shrink-0" />
              <span className="text-xs leading-relaxed">{customer.address || 'N/A'}</span>
            </div>
            <div className="flex items-center text-gray-600 text-sm">
              <Calendar className="w-4 h-4 mr-2 text-gray-400" />
              <span className="text-xs">Plant Date:</span>
              <span className="ml-1">{customer.date || 'N/A'}</span>
            </div>
            <div className="flex items-center text-gray-600 text-sm">
              <Building2 className="w-4 h-4 mr-2 text-gray-400" />
              <span className="text-xs">Plant ID:</span>
              <span className="ml-1 font-mono">{customer.plantId || 'N/A'}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <span className="text-xs text-gray-500">
              Submitted: {formatDate(customer.submissionTimestamp)}
            </span>
            <button 
              onClick={() => handleViewCustomerDetails(customer)}
              className="bg-gradient-to-r from-green-600 to-teal-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:from-green-700 hover:to-teal-700 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              View Details
            </button>
          </div>
        </div>
      </div>
    );
  };

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

  // Stats Card Component
  const StatsCard = ({ title, value, change, icon: Icon, color }) => (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
          {change && (
            <p className={`text-sm mt-2 flex items-center ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
              <TrendingUp className="w-4 h-4 mr-1" />
              {change > 0 ? '+' : ''}{change}% from last month
            </p>
          )}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  // Job Card Component
  const JobCard = ({ job }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-4">
            {job.company_logo_url ? (
              <img
                src={job.company_logo_url}
                alt={`${job.company_name} logo`}
                className="w-12 h-12 rounded-lg object-cover border border-gray-200"
              />
            ) : (
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
            )}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">{job.position_name}</h3>
              <p className="text-gray-600 font-medium">{job.company_name}</p>
            </div>
          </div>
          <div className="flex items-center space-x-1 text-gray-500 text-sm">
            <Eye className="w-4 h-4" />
            <span>{job.views || 0}</span>
          </div>
        </div>
        <div className="space-y-3 mb-4">
          {job.location && (
            <div className="flex items-center text-gray-600 text-sm">
              <MapPin className="w-4 h-4 mr-2 text-gray-400" />
              {job.location}
            </div>
          )}
          <div className="flex items-center text-gray-600 text-sm">
            <Clock className="w-4 h-4 mr-2 text-gray-400" />
            <span className="capitalize bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
              {job.employment_type?.replace('-', ' ') || 'Full Time'}
            </span>
          </div>
          {job.salary_range && (
            <div className="flex items-center text-gray-600 text-sm">
              <DollarSign className="w-4 h-4 mr-2 text-gray-400" />
              {job.salary_range}
            </div>
          )}
        </div>
        <div className="mb-4">
          <p className="text-gray-700 text-sm line-clamp-3 leading-relaxed">
            {job.role_overview}
          </p>
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <span className="text-xs text-gray-500">
            Posted {new Date(job.created_at).toLocaleDateString()}
          </span>
          <button 
            onClick={() => handleViewDetails(job)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            View Applications
          </button>
        </div>
      </div>
    </div>
  );

  // Application Card Component
  const ApplicationCard = ({ application }) => {
    const getStatusColor = (status) => {
      switch (status) {
        case 'submitted': return 'bg-blue-100 text-blue-800';
        case 'reviewed': return 'bg-yellow-100 text-yellow-800';
        case 'shortlisted': return 'bg-green-100 text-green-800';
        case 'rejected': return 'bg-red-100 text-red-800';
        case 'hired': return 'bg-purple-100 text-purple-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    };

    const viewResume = () => {
      if (application.resume_url) {
        window.open(application.resume_url, '_blank');
      }
    };

    return (
      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 hover:border-gray-300 transition-colors">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-4 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-lg">
                  {application.first_name?.[0] || 'U'}{application.last_name?.[0] || 'U'}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {application.first_name} {application.last_name}
                </h3>
                <p className="text-gray-600">{application.email}</p>
                <p className="text-gray-600 text-sm">{application.phone_number}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span>Applied: {new Date(application.applied_at).toLocaleDateString()}</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(application.status)}`}>
                {application.status}
              </span>
            </div>
          </div>
          <div className="flex flex-col space-y-2">
            {application.resume_url && (
              <>
                <button
                  onClick={viewResume}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <Eye className="w-4 h-4" />
                  <span>View CV</span>
                </button>
                <button
                  onClick={() => window.open(application.resume_url, '_blank')}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
          <button
            onClick={() => updateApplicationStatus(application.id, 'reviewed')}
            disabled={application.status === 'reviewed'}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              application.status === 'reviewed' 
                ? 'bg-yellow-100 text-yellow-800 cursor-not-allowed' 
                : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
            }`}
          >
            📧 Mark Reviewed
          </button>
          <button
            onClick={() => updateApplicationStatus(application.id, 'shortlisted')}
            disabled={application.status === 'shortlisted' || application.status === 'hired'}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              application.status === 'shortlisted' || application.status === 'hired'
                ? 'bg-green-100 text-green-800 cursor-not-allowed' 
                : 'bg-green-50 text-green-700 hover:bg-green-100'
            }`}
          >
            ✅ Shortlist
          </button>
          <button
            onClick={() => updateApplicationStatus(application.id, 'hired')}
            disabled={application.status === 'hired'}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              application.status === 'hired'
                ? 'bg-purple-100 text-purple-800 cursor-not-allowed' 
                : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
            }`}
          >
            🎉 Hire
          </button>
          <button
            onClick={() => updateApplicationStatus(application.id, 'rejected')}
            disabled={application.status === 'rejected'}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              application.status === 'rejected'
                ? 'bg-red-100 text-red-800 cursor-not-allowed' 
                : 'bg-red-50 text-red-700 hover:bg-red-100'
            }`}
          >
            ❌ Reject
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notification */}
      <Notification notification={notification} onClose={() => setNotification(null)} />
      
      {/* Header */}
      <br></br>
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="flex justify-between items-center h-12">
      {/* Logo / Brand */}
      <div className="flex items-center space-x-6">
        <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Admin
        </h1>

        {/* Navigation Links */}
        <nav className="hidden md:flex space-x-6">
          <a
            href="/newsadmin"
            className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
          >
           News.Admin
          </a>
          <a
            href="/about"
            className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
          >
            Forms
          </a>
          <a
            href="/AdminAlert"
            className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
          >
            Alert Admin
          </a>

          <a
            href="/shedule"
            className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
          >
            Admin Meet Shedule
          </a>
        </nav>
      </div>

      {/* Right Side: Refresh + Profile */}
      <div className="flex items-center space-x-3">
        {/* Refresh Button */}
        <button
          onClick={() => {
            fetchJobs();
            fetchSubscribers();
            fetchNewsletterStats();
            fetchCustomers();
            fetchCustomerStats();
          }}
          disabled={loading}
          className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Refresh data"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>

        {/* Profile Button */}
        <div className="relative">
          <button className="flex items-center space-x-2 p-1.5 rounded-lg hover:bg-gray-100 transition">
            <div className="w-7 h-7 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-xs font-medium text-gray-700 hidden sm:inline">Admin</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-8">
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'jobs', label: 'Job Management', icon: Briefcase },
            { id: 'newsletter', label: 'Newsletter', icon: Mail },
            { id: 'subscribers', label: 'Subscribers', icon: Users },
            { id: 'customers', label: 'Customers', icon: User }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center px-4 py-2 rounded-md font-medium transition-colors ${
                activeTab === id 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              <Icon className="w-4 h-4 mr-2" />
              {label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <StatsCard
                title="Total Jobs Posted"
                value={stats.totalJobs}
                change={12}
                icon={Briefcase}
                color="bg-blue-500"
              />
              <StatsCard
                title="Total Applications"
                value={stats.totalApplications}
                change={8}
                icon={Users}
                color="bg-green-500"
              />
              <StatsCard
                title="Newsletter Subscribers"
                value={stats.activeSubscribers}
                change={-2}
                icon={Mail}
                color="bg-purple-500"
              />
              <StatsCard
                title="Monthly Views"
                value={stats.monthlyViews.toLocaleString()}
                change={15}
                icon={Eye}
                color="bg-orange-500"
              />
              <StatsCard
                title="Active Jobs"
                value={stats.activeJobs}
                icon={Building2}
                color="bg-teal-500"
              />
              <StatsCard
                title="Total Customers"
                value={stats.totalCustomers}
                icon={User}
                color="bg-teal-500"
              />
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent Jobs */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-6 border-b border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Jobs</h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {jobs.slice(0, 5).map((job) => (
                    <div key={job.id} className="p-6 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{job.position_name}</h4>
                          <p className="text-sm text-gray-500">{job.company_name} • {job.location}</p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            <span className="flex items-center">
                              <Eye className="w-3 h-3 mr-1" />
                              {job.views || 0} views
                            </span>
                            <span className="flex items-center">
                              <Calendar className="w-3 h-3 mr-1" />
                              {new Date(job.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          Active
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-6 border-b border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
                </div>
                <div className="p-6 space-y-4">
                  <button 
                    onClick={() => setShowPostForm(true)}
                    className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg hover:from-blue-100 hover:to-blue-200 transition-colors"
                  >
                    <div className="flex items-center">
                      <Plus className="w-5 h-5 text-blue-600 mr-3" />
                      <span className="font-medium text-blue-900">Post New Job</span>
                    </div>
                  </button>
                  
                  <button 
                    onClick={() => setActiveTab('newsletter')}
                    className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg hover:from-green-100 hover:to-green-200 transition-colors"
                  >
                    <div className="flex items-center">
                      <Send className="w-5 h-5 text-green-600 mr-3" />
                      <span className="font-medium text-green-900">Send Newsletter</span>
                    </div>
                  </button>
                  
                  <button 
                    onClick={() => setActiveTab('customers')}
                    className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-teal-50 to-teal-100 rounded-lg hover:from-teal-100 hover:to-teal-200 transition-colors"
                  >
                    <div className="flex items-center">
                      <User className="w-5 h-5 text-teal-600 mr-3" />
                      <span className="font-medium text-teal-900">Manage Customers</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Customers Tab */}
        {activeTab === 'customers' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Customer Management</h2>
                <p className="text-gray-600 mt-1">Manage greenhouse customer registrations</p>
              </div>
              <div className="flex gap-3">
                <button className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                  <Download className="w-4 h-4 mr-2" />
                  Export Data
                </button>
              </div>
            </div>

            {/* Customer Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Customers</p>
                    <p className="text-2xl font-bold text-gray-900">{customerStats.totalCustomers}</p>
                  </div>
                  <User className="w-8 h-8 text-gray-400" />
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending Review</p>
                    <p className="text-2xl font-bold text-yellow-600">{customerStats.pending}</p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-400" />
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Contacted</p>
                    <p className="text-2xl font-bold text-blue-600">{customerStats.contacted}</p>
                  </div>
                  <Mail className="w-8 h-8 text-blue-400" />
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Completed</p>
                    <p className="text-2xl font-bold text-green-600">{customerStats.completed}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
              </div>
            </div>

            {/* Customers Grid */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Customer List ({customers.length} customers)
                </h3>
                <button
                  onClick={() => {
                    console.log('Refreshing customer data...');
                    fetchCustomers();
                    fetchCustomerStats();
                  }}
                  disabled={loading}
                  className="flex items-center px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
              
              {/* Debug Information */}
              {customers.length === 0 && !loading && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-blue-800 mb-2">Troubleshooting Guide</h4>
                      <div className="text-sm text-blue-700 space-y-2">
                        <p><strong>API Endpoint:</strong> <code className="bg-blue-100 px-1 rounded">{CUSTOMER_API_BASE}/api/greenhouse/customer-info</code></p>
                        
                        <div className="mt-3">
                          <p className="font-medium mb-1">Common Solutions:</p>
                          <ul className="list-disc list-inside space-y-1 ml-2">
                            <li>Check if your Ballerina server is running on port 8075</li>
                            <li>Verify MongoDB is connected and has customer data</li>
                            <li>Ensure CORS is enabled for your frontend domain</li>
                            <li>Test API directly: <a href={`${CUSTOMER_API_BASE}/api/greenhouse/customer-info`} target="_blank" rel="noopener" className="underline">Open in new tab</a></li>
                          </ul>
                        </div>
                        
                        <div className="mt-3">
                          <p className="font-medium mb-1">Expected API Response Format:</p>
                          <pre className="bg-blue-100 p-2 rounded text-xs overflow-x-auto">
{`[
  {
    "id": "uuid-string",
    "name": "Customer Name", 
    "customerId": "CUST001",
    "email": "email@example.com",
    "phone": "+1234567890",
    "address": "Customer Address",
    "date": "2024-01-15",
    "plantId": "PLANT001",
    "submissionTimestamp": "2024-01-15 10:30:00",
    "status": "pending_review"
  }
]`}
                          </pre>
                        </div>
                        
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => {
                              console.log('🔄 Manual API test initiated');
                              fetchCustomers();
                            }}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                          >
                            Test API Connection
                          </button>
                          <button
                            onClick={() => {
                              window.open(`${CUSTOMER_API_BASE}/api/greenhouse/customer-info`, '_blank');
                            }}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                          >
                            Open API in Browser
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {loading ? (
              <div className="flex flex-col justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
                <p className="text-gray-600">Loading customer data...</p>
              </div>
            ) : customers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {customers.map((customer, index) => {
                  console.log(`Rendering customer ${index}:`, customer); // Debug log
                  return <CustomerCard key={customer.id || index} customer={customer} />;
                })}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <div className="text-gray-400 text-xl mb-2">No customers found</div>
                <p className="text-gray-600 mb-4">
                  {loading ? 'Loading...' : 'Customer registrations will appear here when available'}
                </p>
                <button
                  onClick={() => {
                    console.log('Manual refresh triggered');
                    fetchCustomers();
                    fetchCustomerStats();
                  }}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </button>
              </div>
            )}
          </div>
        )}

        {/* Jobs Management Tab */}
        {activeTab === 'jobs' && (
          <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Job Management</h2>
                <p className="text-gray-600 mt-1">Manage job postings and applications</p>
              </div>
              <div className="flex gap-3">
                <button className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </button>
                <button 
                  onClick={() => setShowPostForm(true)}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Post Job
                </button>
              </div>
            </div>

            {/* Job Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Jobs</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalJobs}</p>
                  </div>
                  <Briefcase className="w-8 h-8 text-gray-400" />
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Jobs</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.activeJobs}</p>
                  </div>
                  <Eye className="w-8 h-8 text-blue-400" />
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Applications</p>
                    <p className="text-2xl font-bold text-green-600">{stats.totalApplications}</p>
                  </div>
                  <Users className="w-8 h-8 text-green-400" />
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Views</p>
                    <p className="text-2xl font-bold text-orange-600">{stats.monthlyViews}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-orange-400" />
                </div>
              </div>
            </div>

            {/* Job List Section */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Job Listings ({jobs.length} jobs)
                </h3>
                <button
                  onClick={() => {
                    console.log('Refreshing job data...');
                    fetchJobs();
                  }}
                  disabled={loading}
                  className="flex items-center px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
              
              {/* Debug Information for Jobs */}
              {jobs.length === 0 && !loading && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-orange-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-orange-800 mb-2">Job API Troubleshooting</h4>
                      <div className="text-sm text-orange-700 space-y-2">
                        <p><strong>API Endpoint:</strong> <code className="bg-orange-100 px-1 rounded">{JOB_API_BASE}/jobs</code></p>
                        
                        <div className="mt-3">
                          <p className="font-medium mb-1">Check:</p>
                          <ul className="list-disc list-inside space-y-1 ml-2">
                            <li>Job server running on port 8086</li>
                            <li>Database has job records</li>
                            <li>CORS enabled for your frontend</li>
                          </ul>
                        </div>
                        
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => {
                              console.log('🔄 Manual job API test initiated');
                              fetchJobs();
                            }}
                            className="px-3 py-1 bg-orange-600 text-white rounded text-xs hover:bg-orange-700"
                          >
                            Test Job API
                          </button>
                          <button
                            onClick={() => {
                              window.open(`${JOB_API_BASE}/jobs`, '_blank');
                            }}
                            className="px-3 py-1 bg-orange-100 text-orange-700 rounded text-xs hover:bg-orange-200"
                          >
                            Open Jobs API
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Jobs Grid */}
            {loading ? (
              <div className="flex flex-col justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-600">Loading job postings...</p>
              </div>
            ) : jobs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {jobs.map((job, index) => {
                  console.log(`Rendering job ${index}:`, job); // Debug log
                  return <JobCard key={job.id || index} job={job} />;
                })}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <div className="text-gray-400 text-xl mb-2">No jobs found</div>
                <p className="text-gray-600 mb-4">
                  {loading ? 'Loading...' : 'Job postings will appear here when available'}
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setShowPostForm(true)}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Post Your First Job
                  </button>
                  <button
                    onClick={() => {
                      console.log('Manual job refresh triggered');
                      fetchJobs();
                    }}
                    className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry Loading
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Newsletter Tab */}
        {activeTab === 'newsletter' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Newsletter Management</h2>
              <p className="text-gray-600 mt-1">Create and send newsletters to subscribers</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Email Builder */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold mb-6 flex items-center">
                  <Mail className="w-5 h-5 mr-2" />
                  Compose Newsletter
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                    <input
                      type="text"
                      value={emailBuilder.subject}
                      onChange={(e) => setEmailBuilder({...emailBuilder, subject: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Newsletter subject..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                    <input
                      type="text"
                      value={emailBuilder.title}
                      onChange={(e) => setEmailBuilder({...emailBuilder, title: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Newsletter title..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
                    <textarea
                      rows={8}
                      value={emailBuilder.content}
                      onChange={(e) => setEmailBuilder({...emailBuilder, content: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Write your newsletter content here..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Image URL (Optional)</label>
                    <input
                      type="url"
                      value={emailBuilder.imageUrl}
                      onChange={(e) => setEmailBuilder({...emailBuilder, imageUrl: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Button Text</label>
                      <input
                        type="text"
                        value={emailBuilder.buttonText}
                        onChange={(e) => setEmailBuilder({...emailBuilder, buttonText: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Learn More"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Button Link</label>
                      <input
                        type="url"
                        value={emailBuilder.buttonLink}
                        onChange={(e) => setEmailBuilder({...emailBuilder, buttonLink: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="https://example.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
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
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
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
                  
                  <div className="flex flex-wrap justify-between items-center pt-6 gap-2">
                    <button
                      onClick={() => setShowEmailPreview(!showEmailPreview)}
                      className="flex items-center px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      {showEmailPreview ? 'Hide Preview' : 'Show Preview'}
                    </button>
                    <button
                      onClick={sendNewsletter}
                      disabled={loading || !emailBuilder.subject || !emailBuilder.content}
                      className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
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

              {/* Newsletter Stats & Preview */}
              <div className="space-y-6">
                {showEmailPreview && (
                  <div className="bg-white rounded-lg shadow-sm border flex flex-col">
                    <div className="px-4 py-2 bg-gray-50 border-b rounded-t-lg">
                      <p className="text-sm font-medium flex items-center">
                        <Eye className="w-4 h-4 mr-2" /> Email Preview
                      </p>
                    </div>
                    <div
                      className="p-4 flex-grow overflow-y-auto bg-white"
                      style={{ minHeight: '300px' }}
                    >
                      <div dangerouslySetInnerHTML={{ __html: generateEmailHTML() }} />
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold mb-4">Newsletter Statistics</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                      <span className="text-sm font-medium text-blue-900">Total Subscribers</span>
                      <span className="text-lg font-bold text-blue-600">{stats.totalSubscribers}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <span className="text-sm font-medium text-green-900">Active Subscribers</span>
                      <span className="text-lg font-bold text-green-600">{stats.activeSubscribers}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                      <span className="text-sm font-medium text-red-900">Unsubscribed</span>
                      <span className="text-lg font-bold text-red-600">{stats.unsubscribed}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Subscribers Tab */}
        {activeTab === 'subscribers' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Subscriber Management</h2>
                <p className="text-gray-600 mt-1">Manage newsletter subscribers</p>
              </div>
              <div className="flex gap-3">
                <button className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                  <Download className="w-4 h-4 mr-2" />
                  Export List
                </button>
              </div>
            </div>

            {/* Add New Subscriber Form */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold mb-4">Add New Subscriber</h3>
              <div className="flex gap-4">
                <input
                  type="email"
                  placeholder="Enter email address"
                  value={newSubscriberEmail}
                  onChange={(e) => setNewSubscriberEmail(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addSubscriber(e)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <button 
                  onClick={addSubscriber}
                  disabled={loading || !newSubscriberEmail}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center disabled:opacity-50"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Subscriber
                </button>
              </div>
            </div>

            {/* Subscribers List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold">Subscribers ({subscribers.length})</h3>
              </div>
              {loading ? (
                <div className="p-8 text-center">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" />
                  <p className="text-gray-500">Loading subscribers...</p>
                </div>
              ) : subscribers.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No subscribers found.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                  {subscribers.map((subscriber) => (
                    <div key={subscriber.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-3">
                          <span className="text-white text-sm font-medium">
                            {subscriber.email[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{subscriber.email}</div>
                          <div className="text-sm text-gray-500">
                            Subscribed: {new Date(subscriber.subscribedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => removeSubscriber(subscriber.id, subscriber.email)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Job Posting Modal */}
      {showPostForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Post New Job</h2>
                <button
                  onClick={() => setShowPostForm(false)}
                  className="text-gray-500 hover:text-gray-700 p-1"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <form onSubmit={handleSubmitJob} className="p-6 space-y-6">
              {/* Company Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Logo
                </label>
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <Upload className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              </div>

              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Position Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.positionName}
                    onChange={(e) => setFormData({ ...formData, positionName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g. Senior Software Engineer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g. TechCorp Solutions"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g. San Francisco, CA"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Employment Type
                  </label>
                  <select
                    value={formData.employmentType}
                    onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="full-time">Full Time</option>
                    <option value="part-time">Part Time</option>
                    <option value="contract">Contract</option>
                    <option value="internship">Internship</option>
                    <option value="remote">Remote</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Salary Range
                </label>
                <input
                  type="text"
                  value={formData.salaryRange}
                  onChange={(e) => setFormData({ ...formData, salaryRange: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g. $80,000 - $120,000"
                />
              </div>

              {/* Detailed Information */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role Overview *
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.roleOverview}
                  onChange={(e) => setFormData({ ...formData, roleOverview: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Brief description of the role and what the candidate will do..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Key Responsibilities
                </label>
                <textarea
                  rows={4}
                  value={formData.keyResponsibilities}
                  onChange={(e) => setFormData({ ...formData, keyResponsibilities: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="• Lead development of web applications&#10;• Mentor junior developers&#10;• Collaborate with cross-functional teams"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Required Qualifications
                </label>
                <textarea
                  rows={4}
                  value={formData.requiredQualifications}
                  onChange={(e) => setFormData({ ...formData, requiredQualifications: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="• Bachelor's degree in Computer Science&#10;• 3+ years of experience&#10;• Proficiency in JavaScript, React"
                />
              </div>

              {/* Submit Button */}
              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPostForm(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
                >
                  {loading ? 'Posting...' : 'Post Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Job Applications Modal */}
      {showApplications && selectedJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Job Applications</h2>
                  <p className="text-gray-600 mt-1">
                    {selectedJob?.position_name} at {selectedJob?.company_name}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Total Applications: {applicationsPagination.totalApplications}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowApplications(false);
                    setSelectedJob(null);
                    setJobApplications([]);
                  }}
                  className="text-gray-500 hover:text-gray-700 p-1"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6">
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : jobApplications.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-xl mb-4">No applications yet</div>
                  <p className="text-gray-600">This job hasn't received any applications</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {jobApplications.map((application) => (
                      <ApplicationCard key={application.id} application={application} />
                    ))}
                  </div>
                  {/* Applications Pagination */}
                  {applicationsPagination.totalPages > 1 && (
                    <div className="flex justify-center items-center space-x-2 mt-8">
                      <button
                        onClick={() => fetchJobApplications(selectedJob.id, applicationsPagination.currentPage - 1)}
                        disabled={!applicationsPagination.hasPrev}
                        className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Previous
                      </button>
                      <span className="px-4 py-2 text-gray-600">
                        Page {applicationsPagination.currentPage} of {applicationsPagination.totalPages}
                      </span>
                      <button
                        onClick={() => fetchJobApplications(selectedJob.id, applicationsPagination.currentPage + 1)}
                        disabled={!applicationsPagination.hasNext}
                        className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Customer Details Modal */}
      {showCustomerDetails && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Customer Details</h2>
                  <p className="text-gray-600 mt-1">{selectedCustomer.name}</p>
                </div>
                <button
                  onClick={() => {
                    setShowCustomerDetails(false);
                    setSelectedCustomer(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 p-1"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Customer Information */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                      <p className="text-sm text-gray-900 bg-white p-2 rounded border">{selectedCustomer.name || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Customer ID</label>
                      <p className="text-sm text-gray-900 bg-white p-2 rounded border font-mono">{selectedCustomer.customerId || selectedCustomer.id || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <p className="text-sm text-gray-900 bg-white p-2 rounded border">{selectedCustomer.email || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <p className="text-sm text-gray-900 bg-white p-2 rounded border">{selectedCustomer.phone || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                      <p className="text-sm text-gray-900 bg-white p-2 rounded border min-h-[40px]">{selectedCustomer.address || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Plant Date</label>
                      <p className="text-sm text-gray-900 bg-white p-2 rounded border">{selectedCustomer.date || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Plant ID</label>
                      <p className="text-sm text-gray-900 bg-white p-2 rounded border font-mono">{selectedCustomer.plantId || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Submission Time</label>
                      <p className="text-sm text-gray-900 bg-white p-2 rounded border">
                        {selectedCustomer.submissionTimestamp ? 
                          new Date(selectedCustomer.submissionTimestamp).toLocaleString() : 
                          'N/A'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Management */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Management</h3>
                <div className="flex flex-wrap gap-3 mb-4">
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                    selectedCustomer.status === 'pending_review' 
                      ? 'bg-yellow-100 text-yellow-800' 
                      : selectedCustomer.status === 'contacted'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    Current: {selectedCustomer.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => updateCustomerStatus(selectedCustomer.id, 'pending_review')}
                    disabled={selectedCustomer.status === 'pending_review'}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedCustomer.status === 'pending_review'
                        ? 'bg-yellow-100 text-yellow-800 cursor-not-allowed'
                        : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                    }`}
                  >
                    📋 Pending Review
                  </button>
                  <button
                    onClick={() => updateCustomerStatus(selectedCustomer.id, 'contacted')}
                    disabled={selectedCustomer.status === 'contacted'}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedCustomer.status === 'contacted'
                        ? 'bg-blue-100 text-blue-800 cursor-not-allowed'
                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                    }`}
                  >
                    📞 Contacted
                  </button>
                  <button
                    onClick={() => updateCustomerStatus(selectedCustomer.id, 'completed')}
                    disabled={selectedCustomer.status === 'completed'}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedCustomer.status === 'completed'
                        ? 'bg-green-100 text-green-800 cursor-not-allowed'
                        : 'bg-green-50 text-green-700 hover:bg-green-100'
                    }`}
                  >
                    ✅ Completed
                  </button>
                </div>
              </div>

              {/* Email Actions */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Actions</h3>
                <div className="flex gap-3">
                  <button
                    onClick={() => resendCustomerEmails(selectedCustomer.id)}
                    disabled={loading}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-2" />
                        Resend Welcome & Confirmation Emails
                      </>
                    )}
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  This will resend both the welcome email (with PDF guide) and submission confirmation email to the customer.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600">{stats.totalJobs}</p>
              <p className="text-sm text-gray-600">Total Jobs</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{stats.totalApplications}</p>
              <p className="text-sm text-gray-600">Applications</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">{stats.activeSubscribers}</p>
              <p className="text-sm text-gray-600">Active Subscribers</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-teal-600">{stats.totalCustomers}</p>
              <p className="text-sm text-gray-600">Customers</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default UnifiedAdminDashboard;