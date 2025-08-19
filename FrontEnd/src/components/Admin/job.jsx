import React, { useState, useEffect } from 'react';
import { 
  Upload, Building2, MapPin, DollarSign, Clock, Eye, Plus, Search, X, Download 
} from 'lucide-react';

const JobPostingApp = () => {
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showPostForm, setShowPostForm] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobApplications, setJobApplications] = useState([]);
  const [showApplications, setShowApplications] = useState(false);
  const [applicationsPagination, setApplicationsPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalApplications: 0
  });
  const [filters, setFilters] = useState({
    location: '',
    employmentType: '',
    search: ''
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalJobs: 0
  });

  // Form state for job posting
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

  const API_BASE_URL = 'http://localhost:8087';

  // Fetch jobs
  const fetchJobs = async (page = 1) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageLimit: '6',
        ...(filters.location && { location: filters.location }),
        ...(filters.employmentType && { employmentType: filters.employmentType })
      });
      const response = await fetch(`${API_BASE_URL}/jobs?${params}`);
      const data = await response.json();
      if (data.success) {
        setJobs(data.jobs);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch job applications
  const fetchJobApplications = async (jobId, page = 1) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageLimit: '10'
      });
      const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/applications?${params}`);
      const data = await response.json();
      if (data.success) {
        setJobApplications(data.applications);
        setApplicationsPagination(data.pagination);
      } else {
        alert('Error fetching applications: ' + data.error);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      alert('Error fetching applications');
    } finally {
      setIsLoading(false);
    }
  };

  // Update application status
  const updateApplicationStatus = async (applicationId, newStatus) => {
    try {
      const response = await fetch(`${API_BASE_URL}/applications/${applicationId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      const result = await response.json();
      if (result.success) {
        // Refresh applications list
        fetchJobApplications(selectedJob.id, applicationsPagination.currentPage);
        // Show success message with email confirmation
        const emailMessage = result.emailSent 
          ? " An email notification has been sent to the applicant."
          : " No email was sent (status unchanged).";
        alert(`Application ${newStatus} successfully!${emailMessage}`);
      } else {
        alert('Error updating application status: ' + result.error);
      }
    } catch (error) {
      console.error('Error updating application status:', error);
      alert('Error updating application status');
    }
  };

  // View job details and applications
  const handleViewDetails = async (job) => {
    setSelectedJob(job);
    setShowApplications(true);
    await fetchJobApplications(job.id);
  };

  const searchJobs = async () => {
    if (!filters.search.trim()) {
      fetchJobs();
      return;
    }
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        q: filters.search,
        ...(filters.location && { location: filters.location }),
        ...(filters.employmentType && { employmentType: filters.employmentType })
      });
      const response = await fetch(`${API_BASE_URL}/search?${params}`);
      const data = await response.json();
      if (data.success) {
        setJobs(data.jobs);
        setPagination({ currentPage: 1, totalPages: 1, totalJobs: data.resultsCount });
      }
    } catch (error) {
      console.error('Error searching jobs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle logo upload
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

  // Submit job posting
  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setIsLoading(true);
    try {
      const formDataToSend = new FormData();
      Object.keys(formData).forEach(key => {
        formDataToSend.append(key, formData[key]);
      });
      if (companyLogo) {
        formDataToSend.append('companyLogo', companyLogo);
      }
      const response = await fetch(`${API_BASE_URL}/jobs`, {
        method: 'POST',
        body: formDataToSend
      });
      const result = await response.json();
      if (result.success) {
        alert('Job posted successfully!');
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
        alert('Error posting job: ' + result.error);
      }
    } catch (error) {
      console.error('Error posting job:', error);
      alert('Error posting job');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  // Job Card Component
  const JobCard = ({ job }) => (
    <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden">
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
            <span>{job.views}</span>
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
              {job.employment_type.replace('-', ' ')}
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
            View Details
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

    const downloadResume = () => {
      if (application.resume_url) {
        window.open(application.resume_url, '_blank');
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
                  {application.first_name[0]}{application.last_name[0]}
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
          {/* Resume Actions */}
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
                  onClick={downloadResume}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>
              </>
            )}
            {application.original_filename && (
              <p className="text-xs text-gray-500 text-center">
                {application.original_filename}
              </p>
            )}
          </div>
        </div>
        {/* Status Actions */}
        <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
          <button
            onClick={() => updateApplicationStatus(application.id, 'reviewed')}
            disabled={application.status === 'reviewed'}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              application.status === 'reviewed' 
                ? 'bg-yellow-100 text-yellow-800 cursor-not-allowed' 
                : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
            }`}
            title="Mark as reviewed and send email notification"
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
            title="Shortlist candidate and send email notification"
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
            title="Hire candidate and send congratulation email"
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
            title="Reject application and send notification email"
          >
            ❌ Reject
          </button>
        </div>
      </div>
    );
  };

  // Applications Modal
  const ApplicationsModal = () => (
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
          {isLoading ? (
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
  );

  // ✅ Main return statement added here to fix syntax error
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Job Portal
              </h1>
              <p className="text-gray-600 text-sm mt-1">Find your dream job or post opportunities</p>
            </div>
            <button
              onClick={() => setShowPostForm(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Post Job</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search jobs..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <select
                value={filters.location}
                onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Locations</option>
                <option value="San Francisco">San Francisco</option>
                <option value="New York">New York</option>
                <option value="Austin">Austin</option>
                <option value="Remote">Remote</option>
                <option value="Chicago">Chicago</option>
              </select>
            </div>
            <div>
              <select
                value={filters.employmentType}
                onChange={(e) => setFilters({ ...filters, employmentType: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Types</option>
                <option value="full-time">Full Time</option>
                <option value="part-time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
                <option value="remote">Remote</option>
              </select>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={searchJobs}
                className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Search
              </button>
              <button
                onClick={() => {
                  setFilters({ location: '', employmentType: '', search: '' });
                  fetchJobs();
                }}
                className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Jobs Grid */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
            {jobs.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 text-xl mb-4">No jobs found</div>
                <p className="text-gray-600">Try adjusting your search criteria</p>
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-center items-center space-x-2">
                <button
                  onClick={() => fetchJobs(pagination.currentPage - 1)}
                  disabled={!pagination.hasPrev}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-gray-600">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => fetchJobs(pagination.currentPage + 1)}
                  disabled={!pagination.hasNext}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
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
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
                  disabled={isLoading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
                >
                  {isLoading ? 'Posting...' : 'Post Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Job Applications Modal */}
      {showApplications && selectedJob && <ApplicationsModal />}
    </div>
  );
};

export default JobPostingApp;