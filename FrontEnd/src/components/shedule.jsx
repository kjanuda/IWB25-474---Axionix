import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Mail, 
  Phone, 
  User, 
  MessageSquare, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Filter,
  Search,
  Plus,
  BarChart3,
  Link2,
  AlertCircle,
  Trash2,
  Edit,
  Send
} from 'lucide-react';

// Fixed API URL - was missing colon between localhost and port
const API_BASE_URL = 'http://localhost:5080/api/v1';

const MeetingSchedulerAdmin = () => {
  const [meetings, setMeetings] = useState([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    status: '',
    adminNotes: '',
    meetingDateTime: '',
    meetingLink: ''
  });
  const [createForm, setCreateForm] = useState({
    userName: '',
    email: '',
    phoneNumber: '',
    interest: '',
    textMessage: ''
  });

  // Enhanced fetch meetings with better error handling
  const fetchMeetings = async (status = '', page = 0) => {
    try {
      setLoading(true);
      setError('');
      
      // Build URL with proper query parameters
      let url = `${API_BASE_URL}/admin/meetings`;
      const params = new URLSearchParams();
      
      if (status && status !== 'all') {
        params.append('status', status);
      }
      params.append('offset', (page * 10).toString());
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      console.log('Fetching from URL:', url); // Debug log
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setMeetings(Array.isArray(data.data.meetings) ? data.data.meetings : []);
        setError('');
      } else {
        setError(data.message || 'Failed to fetch meetings');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError(`Failed to fetch meetings: ${err.message}`);
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  };

  // Enhanced fetch statistics with better error handling
  const fetchStats = async () => {
    try {
      console.log('Fetching stats from:', `${API_BASE_URL}/admin/stats`); // Debug log
      
      const response = await fetch(`${API_BASE_URL}/admin/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
      } else {
        console.error('Stats fetch failed:', data.message);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  // Test backend connection
  const testConnection = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      const data = await response.json();
      console.log('Backend health check:', data);
      return data.success;
    } catch (err) {
      console.error('Backend connection test failed:', err);
      return false;
    }
  };

  // Create new meeting request
  const createMeetingRequest = async () => {
    // Validation
    if (!createForm.userName.trim() || !createForm.email.trim() || 
        !createForm.phoneNumber.trim() || !createForm.interest.trim() || 
        !createForm.textMessage.trim()) {
      alert('All fields are required');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/meetings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createForm)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setShowCreateForm(false);
        setCreateForm({
          userName: '',
          email: '',
          phoneNumber: '',
          interest: '',
          textMessage: ''
        });
        fetchMeetings(filter, currentPage);
        fetchStats();
        alert('Meeting request created successfully!');
      } else {
        alert('Error: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Create meeting error:', err);
      alert('Failed to create meeting request: ' + err.message);
    }
  };

  // Update meeting status
  const updateMeetingStatus = async () => {
    if (!selectedMeeting) return;

    // Validation for approved meetings
    if (updateForm.status === 'approved') {
      if (!updateForm.meetingDateTime.trim() || !updateForm.meetingLink.trim()) {
        alert('Meeting date/time and link are required for approved meetings');
        return;
      }
    }

    try {
      const response = await fetch(`${API_BASE_URL}/admin/meetings/${selectedMeeting.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateForm)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setShowUpdateModal(false);
        setSelectedMeeting(null);
        setUpdateForm({
          status: '',
          adminNotes: '',
          meetingDateTime: '',
          meetingLink: ''
        });
        fetchMeetings(filter, currentPage);
        fetchStats();
        alert(`Meeting ${updateForm.status} successfully! ${data.data.emailSent ? 'Email sent.' : 'Email failed to send.'}`);
      } else {
        alert('Error: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Update meeting error:', err);
      alert('Failed to update meeting: ' + err.message);
    }
  };

  // Delete meeting
  const deleteMeeting = async (id) => {
    if (!confirm('Are you sure you want to delete this meeting request?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/admin/meetings/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        fetchMeetings(filter, currentPage);
        fetchStats();
        alert('Meeting request deleted successfully!');
      } else {
        alert('Error: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Delete meeting error:', err);
      alert('Failed to delete meeting request: ' + err.message);
    }
  };

  // Open update modal
  const openUpdateModal = (meeting) => {
    setSelectedMeeting(meeting);
    setUpdateForm({
      status: meeting.status || 'pending',
      adminNotes: meeting.admin_notes || '',
      meetingDateTime: meeting.meeting_datetime ? new Date(meeting.meeting_datetime).toISOString().slice(0, 16) : '',
      meetingLink: meeting.meeting_link || ''
    });
    setShowUpdateModal(true);
  };

  // Filter meetings
  const filteredMeetings = meetings.filter(meeting => {
    const matchesSearch = 
      meeting.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      meeting.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      meeting.interest?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  useEffect(() => {
    const initializeData = async () => {
      // Test connection first
      const isConnected = await testConnection();
      if (!isConnected) {
        setError('Cannot connect to backend server. Please ensure the Ballerina service is running on port 5080.');
        setLoading(false);
        return;
      }
      
      // If connected, fetch data
      await fetchMeetings(filter, currentPage);
      await fetchStats();
    };
    
    initializeData();
  }, [filter, currentPage]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600">Meeting Request Management System</p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Request
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Connection Status */}
        {error && error.includes('Cannot connect') && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Connection Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                  <p className="mt-2">Please check:</p>
                  <ul className="list-disc list-inside mt-1">
                    <li>Ballerina service is running</li>
                    <li>Service is accessible on http://localhost:5080</li>
                    <li>CORS is properly configured</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BarChart3 className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Requests</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pending</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.pending}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Approved</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.approved}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Rejected</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.rejected}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex items-center space-x-4">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="all">All Requests</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or interest..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
        </div>

        {/* Meeting Requests Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Meeting Requests</h2>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : error && !error.includes('Cannot connect') ? (
            <div className="flex justify-center items-center py-12 text-red-600">
              <AlertCircle className="w-5 h-5 mr-2" />
              {error}
            </div>
          ) : filteredMeetings.length === 0 ? (
            <div className="flex justify-center items-center py-12 text-gray-500">
              No meeting requests found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Applicant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Interest
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredMeetings.map((meeting) => (
                    <tr key={meeting.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <User className="h-8 w-8 text-gray-400" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {meeting.user_name}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center">
                              <Mail className="w-4 h-4 mr-1" />
                              {meeting.email}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center">
                              <Phone className="w-4 h-4 mr-1" />
                              {meeting.phone_number}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {meeting.interest}
                        </div>
                        <div className="text-sm text-gray-500 mt-1 max-w-xs truncate">
                          {meeting.text_message}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(meeting.status)}`}>
                          {getStatusIcon(meeting.status)}
                          <span className="ml-2 capitalize">{meeting.status}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(meeting.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openUpdateModal(meeting)}
                            className="text-green-600 hover:text-green-900 p-2 rounded-lg hover:bg-green-50 transition-colors"
                            title="Update Status"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteMeeting(meeting.id)}
                            className="text-red-600 hover:text-red-900 p-2 rounded-lg hover:bg-red-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Create New Meeting Request</h2>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <User className="w-4 h-4 inline mr-2" />
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={createForm.userName}
                      onChange={(e) => setCreateForm({ ...createForm, userName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Enter full name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Mail className="w-4 h-4 inline mr-2" />
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={createForm.email}
                      onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Enter email address"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Phone className="w-4 h-4 inline mr-2" />
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={createForm.phoneNumber}
                    onChange={(e) => setCreateForm({ ...createForm, phoneNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Enter phone number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Interest/Subject
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.interest}
                    onChange={(e) => setCreateForm({ ...createForm, interest: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="What would you like to discuss?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MessageSquare className="w-4 h-4 inline mr-2" />
                    Message
                  </label>
                  <textarea
                    required
                    value={createForm.textMessage}
                    onChange={(e) => setCreateForm({ ...createForm, textMessage: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Provide additional details..."
                  />
                </div>

                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={createMeetingRequest}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Request
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Modal */}
      {showUpdateModal && selectedMeeting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Update Meeting Request</h2>
                <button
                  onClick={() => setShowUpdateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              {/* Meeting Details */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-gray-900 mb-2">Request Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Name:</span> {selectedMeeting.user_name}
                  </div>
                  <div>
                    <span className="font-medium">Email:</span> {selectedMeeting.email}
                  </div>
                  <div>
                    <span className="font-medium">Phone:</span> {selectedMeeting.phone_number}
                  </div>
                  <div>
                    <span className="font-medium">Current Status:</span> 
                    <span className={`ml-2 px-2 py-1 rounded text-xs ${getStatusColor(selectedMeeting.status)}`}>
                      {selectedMeeting.status}
                    </span>
                  </div>
                  <div className="md:col-span-2">
                    <span className="font-medium">Interest:</span> {selectedMeeting.interest}
                  </div>
                  <div className="md:col-span-2">
                    <span className="font-medium">Message:</span> {selectedMeeting.text_message}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={updateForm.status}
                    onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                {updateForm.status === 'approved' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Calendar className="w-4 h-4 inline mr-2" />
                        Meeting Date & Time
                      </label>
                      <input
                        type="datetime-local"
                        value={updateForm.meetingDateTime}
                        onChange={(e) => setUpdateForm({ ...updateForm, meetingDateTime: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Link2 className="w-4 h-4 inline mr-2" />
                        Meeting Link
                      </label>
                      <input
                        type="url"
                        value={updateForm.meetingLink}
                        onChange={(e) => setUpdateForm({ ...updateForm, meetingLink: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="https://meet.google.com/..."
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MessageSquare className="w-4 h-4 inline mr-2" />
                    Admin Notes
                  </label>
                  <textarea
                    value={updateForm.adminNotes}
                    onChange={(e) => setUpdateForm({ ...updateForm, adminNotes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Add any notes or reasons for this decision..."
                  />
                </div>

                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => setShowUpdateModal(false)}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={updateMeetingStatus}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Update & Send Email
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingSchedulerAdmin;