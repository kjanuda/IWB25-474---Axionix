import React, { useState, useEffect } from 'react';
import { Users, Mail, Phone, Globe, MessageCircle, Search, Filter, Eye, Calendar, Trash2, AlertCircle } from 'lucide-react';

const AdminContactDashboard = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedContact, setSelectedContact] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(null);

  // Backend API base URL
  const API_BASE = 'http://localhost:8091';

  // Fetch contacts from API
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`${API_BASE}/contact`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Your Ballerina backend returns a ContactMessage[] directly
        if (Array.isArray(data)) {
          setContacts(data);
        } else {
          console.error('Unexpected data format:', data);
          setError('Received unexpected data format from server');
          setContacts([]);
        }
        
      } catch (error) {
        console.error('Error fetching contacts:', error);
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          setError('Cannot connect to backend server. Please ensure the Ballerina service is running on http://localhost:8091');
        } else {
          setError(`Failed to load contacts: ${error.message}`);
        }
        setContacts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, []);

  // Delete contact function
  const deleteContact = async (contactId) => {
    if (!window.confirm('Are you sure you want to delete this contact?')) {
      return;
    }

    try {
      setDeleteLoading(contactId);
      
      const response = await fetch(`${API_BASE}/contact/${contactId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        // Remove the contact from the local state
        setContacts(prevContacts => 
          prevContacts.filter(contact => contact.id !== contactId)
        );
        
        // Close modal if the deleted contact was being viewed
        if (selectedContact && selectedContact.id === contactId) {
          closeModal();
        }
        
        alert('Contact deleted successfully');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete contact');
      }
    } catch (error) {
      console.error('Error deleting contact:', error);
      alert(`Failed to delete contact: ${error.message}`);
    } finally {
      setDeleteLoading(null);
    }
  };

  // Force clean database function
  const forceCleanDatabase = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`${API_BASE}/contact/force-clean`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        setContacts([]);
        setError(null);
        closeModal();
        alert(`Database force cleaned successfully. Deleted ${result.deletedCount || 0} contacts.`);
        // Retry fetching after cleanup
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        throw new Error('Failed to force clean database');
      }
    } catch (error) {
      console.error('Error force cleaning database:', error);
      alert(`Failed to force clean database: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Get unique countries for filter
  const countries = [...new Set(contacts.map(contact => contact.country || 'Unknown').filter(country => country))];

  // Filter contacts based on search and filters
  const filteredContacts = contacts.filter(contact => {
    // Add safety checks for undefined properties
    const fullName = contact.fullName || '';
    const email = contact.email || '';
    const phone = contact.phone || '';
    const country = contact.country || '';
    
    const matchesSearch = fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         phone.includes(searchTerm);
    
    const matchesCountry = selectedCountry === 'all' || country === selectedCountry;
    
    // Note: Your backend doesn't have status field, so we'll treat all as 'pending'
    const contactStatus = contact.status || 'pending';
    const matchesStatus = selectedStatus === 'all' || contactStatus === selectedStatus;
    
    return matchesSearch && matchesCountry && matchesStatus;
  });

  // Get statistics (since backend doesn't have status, all are pending)
  const stats = {
    total: contacts.length,
    pending: contacts.filter(c => (c.status || 'pending') === 'pending').length,
    contacted: contacts.filter(c => c.status === 'contacted').length,
    resolved: contacts.filter(c => c.status === 'resolved').length,
  };

  const openModal = (contact) => {
    setSelectedContact(contact);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedContact(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading contacts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg max-w-lg">
            <AlertCircle className="mx-auto mb-2 h-8 w-8" />
            <h2 className="font-bold mb-2">Connection Error</h2>
            <p className="mb-4 text-sm">{error}</p>
            <div className="space-y-2">
              <div className="space-x-2">
                <button 
                  onClick={() => window.location.reload()}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Retry Connection
                </button>
                <button 
                  onClick={forceCleanDatabase}
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                >
                  Force Clean Database
                </button>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                If you're getting HTTP 500 errors, try "Force Clean Database" first
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Customer Contact Dashboard</h1>
            <p className="text-gray-600">Manage and view customer inquiries and contact information</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={forceCleanDatabase}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 flex items-center"
            >
              <Trash2 size={16} className="mr-2" />
              Force Clean DB
            </button>
            <a 
              href={`${API_BASE}/health`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center"
            >
              <AlertCircle size={16} className="mr-2" />
              Check Health
            </a>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <Users size={24} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Contacts</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                <Calendar size={24} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <Phone size={24} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Contacted</p>
                <p className="text-2xl font-bold text-gray-900">{stats.contacted}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                <MessageCircle size={24} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Resolved</p>
                <p className="text-2xl font-bold text-gray-900">{stats.resolved}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">All Countries</option>
              {countries.map(country => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="contacted">Contacted</option>
              <option value="resolved">Resolved</option>
            </select>

            <div className="flex items-center text-sm text-gray-600">
              <Filter size={16} className="mr-2" />
              Showing {filteredContacts.length} of {contacts.length} contacts
            </div>
          </div>
        </div>

        {/* Contacts Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {contacts.length === 0 ? (
            <div className="p-8 text-center">
              <Users size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No contacts found</h3>
              <p className="text-gray-500">No customer contacts have been submitted yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer Info
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Interests
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredContacts.map((contact) => (
                    <tr key={contact.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                              <Users className="h-5 w-5 text-green-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{contact.fullName || 'N/A'}</div>
                            <div className="text-sm text-gray-500 flex items-center">
                              <Globe size={12} className="mr-1" />
                              {contact.country || 'Unknown'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 flex items-center mb-1">
                          <Mail size={12} className="mr-2 text-gray-400" />
                          {contact.email || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <Phone size={12} className="mr-2 text-gray-400" />
                          {contact.phone || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {(contact.interests || []).slice(0, 2).map((interest, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                            >
                              {interest}
                            </span>
                          ))}
                          {(contact.interests || []).length > 2 && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              +{(contact.interests || []).length - 2} more
                            </span>
                          )}
                          {(!contact.interests || contact.interests.length === 0) && (
                            <span className="text-xs text-gray-400">No interests specified</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          (contact.status || 'pending') === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          contact.status === 'contacted' ? 'bg-blue-100 text-blue-800' :
                          contact.status === 'resolved' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {contact.status || 'pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openModal(contact)}
                            className="text-green-600 hover:text-green-900 flex items-center"
                          >
                            <Eye size={16} className="mr-1" />
                            View
                          </button>
                          <button
                            onClick={() => deleteContact(contact.id)}
                            disabled={deleteLoading === contact.id}
                            className="text-red-600 hover:text-red-900 flex items-center disabled:opacity-50"
                          >
                            {deleteLoading === contact.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-1"></div>
                            ) : (
                              <Trash2 size={16} className="mr-1" />
                            )}
                            Delete
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

        {/* Contact Detail Modal */}
        {showModal && selectedContact && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Contact Details</h2>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <p className="text-gray-900 bg-gray-50 p-2 rounded">{selectedContact.fullName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                    <p className="text-gray-900 bg-gray-50 p-2 rounded">{selectedContact.country}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <p className="text-gray-900 bg-gray-50 p-2 rounded">{selectedContact.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <p className="text-gray-900 bg-gray-50 p-2 rounded">{selectedContact.phone}</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact ID</label>
                  <p className="text-gray-900 bg-gray-50 p-2 rounded font-mono text-sm">{selectedContact.id}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Interests</label>
                  <div className="flex flex-wrap gap-2">
                    {(selectedContact.interests || []).map((interest, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800"
                      >
                        {interest}
                      </span>
                    ))}
                    {(!selectedContact.interests || selectedContact.interests.length === 0) && (
                      <span className="text-gray-500 italic">No interests specified</span>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-gray-900 whitespace-pre-wrap">{selectedContact.message}</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-between">
                <button
                  onClick={() => deleteContact(selectedContact.id)}
                  disabled={deleteLoading === selectedContact.id}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center"
                >
                  {deleteLoading === selectedContact.id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Trash2 size={16} className="mr-2" />
                  )}
                  Delete Contact
                </button>
                
                <div className="space-x-3">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Close
                  </button>
                  <a
                    href={`mailto:${selectedContact.email}`}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 inline-flex items-center"
                  >
                    <Mail size={16} className="mr-2" />
                    Email Customer
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminContactDashboard;