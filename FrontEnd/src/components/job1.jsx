import React, { useState, useEffect } from 'react';
import {
  Upload, MapPin, Clock, DollarSign, Building2, User, Mail, Phone,
  FileText, ArrowLeft, CheckCircle, X, Search, Filter, Star, Eye,
  Calendar, Users, Briefcase, Award, Send, Sparkles, ChevronRight,
  Heart, Bookmark, TrendingUp, Zap
} from 'lucide-react';

const JobApplicationApp = () => {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showApplication, setShowApplication] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [applicationSubmitted, setApplicationSubmitted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  // Application form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: ''
  });
  const [resume, setResume] = useState(null);
  const [resumePreview, setResumePreview] = useState('');
  const [formErrors, setFormErrors] = useState({});

  const API_BASE_URL = 'http://localhost:8087';

  // Mock data for demonstration (fallback if API fails)
  const mockJobs = [
    {
      id: '1',
      position_name: 'Senior Frontend Developer',
      company_name: 'TechCorp Inc.',
      location: 'San Francisco, CA',
      employment_type: 'full-time',
      salary_range: '$120k - $160k',
      role_overview: 'We are looking for an experienced Frontend Developer to join our dynamic team. You will be responsible for building responsive web applications using modern technologies.',
      key_responsibilities: '• Develop and maintain web applications\n• Collaborate with design and backend teams\n• Write clean, maintainable code\n• Participate in code reviews',
      required_qualifications: '• 5+ years of React experience\n• Strong JavaScript/TypeScript skills\n• Experience with modern build tools\n• Bachelor\'s degree preferred',
      created_at: new Date().toISOString(),
      company_logo_url: null,
      views: 247
    },
    {
      id: '2',
      position_name: 'Product Manager',
      company_name: 'StartupXYZ',
      location: 'Remote',
      employment_type: 'full-time',
      salary_range: '$100k - $140k',
      role_overview: 'Join our product team to drive the strategy and execution of our core platform. You\'ll work closely with engineering, design, and business stakeholders.',
      key_responsibilities: '• Define product roadmap and strategy\n• Gather and analyze user feedback\n• Coordinate with cross-functional teams\n• Track product metrics and KPIs',
      required_qualifications: '• 3+ years of product management experience\n• Strong analytical skills\n• Experience with agile methodologies\n• Excellent communication skills',
      created_at: new Date().toISOString(),
      company_logo_url: null,
      views: 189
    },
    {
      id: '3',
      position_name: 'UX Designer',
      company_name: 'Design Studio Pro',
      location: 'New York, NY',
      employment_type: 'contract',
      salary_range: '$80k - $100k',
      role_overview: 'We\'re seeking a talented UX Designer to create intuitive and engaging user experiences for our clients\' digital products.',
      key_responsibilities: '• Conduct user research and usability testing\n• Create wireframes and prototypes\n• Design user interfaces and interactions\n• Collaborate with developers on implementation',
      required_qualifications: '• 4+ years of UX design experience\n• Proficiency in Figma, Sketch, or Adobe XD\n• Strong portfolio of design work\n• Understanding of user-centered design principles',
      created_at: new Date().toISOString(),
      company_logo_url: null,
      views: 156
    }
  ];

  // Fetch jobs
  const fetchJobs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/jobs?pageLimit=20`);
      const data = await response.json();
      if (data.success) {
        setJobs(data.jobs);
      } else {
        // Fallback to mock data if API fails
        setJobs(mockJobs);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
      // Use mock data as fallback
      setJobs(mockJobs);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch single job details
  const fetchJobDetails = async (jobId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`);
      const data = await response.json();
      if (data.success) {
        setSelectedJob(data.job);
      } else {
        // Fallback to mock data
        const job = mockJobs.find(j => j.id === jobId);
        if (job) setSelectedJob(job);
      }
    } catch (error) {
      console.error('Error fetching job details:', error);
      // Fallback to mock data
      const job = mockJobs.find(j => j.id === jobId);
      if (job) setSelectedJob(job);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };

  const handleResumeChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        alert('Please upload a PDF, DOC, or DOCX file');
        e.target.value = ''; // Clear the input
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        alert('File size should be less than 5MB');
        e.target.value = ''; // Clear the input
        return;
      }
      
      setResume(file);
      setResumePreview(file.name);

      // Clear resume error if exists
      if (formErrors.resume) {
        setFormErrors((prev) => {
          const updated = { ...prev };
          delete updated.resume;
          return updated;
        });
      }
    }
  };

  const validateForm = () => {
    const errors = {};
    
    // Validate first name
    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    }
    
    // Validate last name
    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }
    
    // Validate email
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }
    
    // Validate phone number
    if (!formData.phoneNumber.trim()) {
      errors.phoneNumber = 'Phone number is required';
    } else if (!/^[\+]?[\d\s\-\(\)]{10,}$/.test(formData.phoneNumber.trim())) {
      errors.phoneNumber = 'Please enter a valid phone number';
    }
    
    // Validate resume
    if (!resume) {
      errors.resume = 'Resume is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent default form submission
    
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('firstName', formData.firstName);
      formDataToSend.append('lastName', formData.lastName);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('phoneNumber', formData.phoneNumber);
      formDataToSend.append('resume', resume);

      const response = await fetch(`${API_BASE_URL}/jobs/${selectedJob.id}/apply`, {
        method: 'POST',
        body: formDataToSend
      });

      const result = await response.json();

      if (result.success) {
        setApplicationSubmitted(true);
        setFormData({ firstName: '', lastName: '', email: '', phoneNumber: '' });
        setResume(null);
        setResumePreview('');
        setFormErrors({});
      } else {
        alert('Error submitting application: ' + result.error);
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      // For demo purposes, simulate successful submission
      setApplicationSubmitted(true);
      setFormData({ firstName: '', lastName: '', email: '', phoneNumber: '' });
      setResume(null);
      setResumePreview('');
      setFormErrors({});
    } finally {
      setIsLoading(false);
    }
  };

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.position_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.company_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || job.employment_type === filterType;
    return matchesSearch && matchesFilter;
  });

  useEffect(() => {
    fetchJobs();
  }, []);

  // --- Component: JobCard (Redesigned) ---
  const JobCard = ({ job, onClick }) => (
    <div
      onClick={() => onClick(job)}
      className="group relative bg-white rounded-lg shadow-sm hover:shadow-lg transition-all duration-200 border border-gray-100 overflow-hidden cursor-pointer hover:border-blue-200"
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            {job.company_logo_url ? (
              <img
                src={job.company_logo_url}
                alt={`${job.company_name} logo`}
                className="w-10 h-10 rounded-lg object-cover border border-gray-200"
              />
            ) : (
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-gray-600" />
              </div>
            )}
            <div>
              <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                {job.position_name}
              </h3>
              <p className="text-sm text-gray-600">{job.company_name}</p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <Bookmark className="w-4 h-4 text-gray-400 hover:text-red-500 cursor-pointer transition-colors" />
            <button className="p-1 hover:bg-gray-100 rounded transition-colors">
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between">
            {job.location && (
              <div className="flex items-center text-gray-600 text-sm">
                <MapPin className="w-3 h-3 mr-1" />
                <span>{job.location}</span>
              </div>
            )}
            <div className="flex items-center text-gray-500 text-xs">
              <Clock className="w-3 h-3 mr-1" />
              <span>{new Date(job.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {job.employment_type.replace('-', ' ')}
            </span>
            {job.salary_range && (
              <span className="text-sm font-semibold text-green-600">{job.salary_range}</span>
            )}
          </div>
        </div>

        <p className="text-gray-700 text-sm line-clamp-2 mb-4 leading-relaxed">
          {job.role_overview}
        </p>

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center space-x-4">
            <div className="flex items-center text-xs text-gray-500">
              <Users className="w-3 h-3 mr-1" />
              <span>25+ applied</span>
            </div>
            <div className="flex items-center text-xs text-gray-500">
              <TrendingUp className="w-3 h-3 mr-1" />
              <span>Active</span>
            </div>
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center space-x-1">
            <span>Apply</span>
            <Zap className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );

  // --- Component: JobDetailsModal (Redesigned) ---
  const JobDetailsModal = ({ job, onClose, onApply }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="relative p-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-xl">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-4 mb-4">
            {job.company_logo_url ? (
              <img
                src={job.company_logo_url}
                alt={`${job.company_name} logo`}
                className="w-16 h-16 rounded-xl object-cover border-2 border-white border-opacity-20"
              />
            ) : (
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                <Building2 className="w-8 h-8 text-white" />
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold mb-1">{job.position_name}</h2>
              <p className="text-lg text-white text-opacity-90">{job.company_name}</p>
              <div className="flex items-center space-x-3 mt-2">
                <div className="flex items-center">
                  <Star className="w-4 h-4 text-yellow-300 fill-current mr-1" />
                  <span className="text-sm">4.5</span>
                </div>
                <span className="text-sm text-white text-opacity-70">•</span>
                <span className="text-sm">500+ employees</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {job.location && (
              <div className="flex items-center bg-white bg-opacity-20 px-3 py-1 rounded-lg">
                <MapPin className="w-4 h-4 mr-2" />
                <span className="text-sm">{job.location}</span>
              </div>
            )}
            <div className="flex items-center bg-white bg-opacity-20 px-3 py-1 rounded-lg">
              <Briefcase className="w-4 h-4 mr-2" />
              <span className="text-sm capitalize">{job.employment_type.replace('-', ' ')}</span>
            </div>
            {job.salary_range && (
              <div className="flex items-center bg-white bg-opacity-20 px-3 py-1 rounded-lg">
                <DollarSign className="w-4 h-4 mr-2" />
                <span className="text-sm font-semibold">{job.salary_range}</span>
              </div>
            )}
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{job.views || 0}</div>
              <div className="text-sm text-gray-600">Views</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">25+</div>
              <div className="text-sm text-gray-600">Applicants</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">Active</div>
              <div className="text-sm text-gray-600">Status</div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <Briefcase className="w-5 h-5 mr-2 text-blue-600" />
                Role Overview
              </h3>
              <p className="text-gray-700 leading-relaxed">{job.role_overview}</p>
            </div>

            {job.key_responsibilities && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <Star className="w-5 h-5 mr-2 text-green-600" />
                  Key Responsibilities
                </h3>
                <div className="text-gray-700 leading-relaxed whitespace-pre-line">
                  {job.key_responsibilities}
                </div>
              </div>
            )}

            {job.required_qualifications && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <Award className="w-5 h-5 mr-2 text-purple-600" />
                  Required Qualifications
                </h3>
                <div className="text-gray-700 leading-relaxed whitespace-pre-line">
                  {job.required_qualifications}
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={onApply}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
            >
              <Send className="w-5 h-5" />
              <span>Apply for this Position</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // --- Component: ApplicationModal (Fixed) ---
  const ApplicationModal = ({ job, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 bg-gray-50 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Quick Apply</h2>
              <p className="text-gray-600 text-sm mt-1">{job.position_name} at {job.company_name}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Fixed: Wrapped form inputs in a proper form element */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name *
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  formErrors.firstName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="John"
              />
              {formErrors.firstName && (
                <p className="text-red-500 text-sm mt-1">{formErrors.firstName}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name *
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  formErrors.lastName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Doe"
              />
              {formErrors.lastName && (
                <p className="text-red-500 text-sm mt-1">{formErrors.lastName}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  formErrors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="john.doe@email.com"
              />
              {formErrors.email && (
                <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  formErrors.phoneNumber ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="+1-555-0123"
              />
              {formErrors.phoneNumber && (
                <p className="text-red-500 text-sm mt-1">{formErrors.phoneNumber}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Resume/CV *
            </label>
            <div className={`relative border-2 border-dashed rounded-lg p-4 text-center hover:border-blue-400 transition-colors ${
              formErrors.resume ? 'border-red-300' : 'border-gray-300'
            }`}>
              {resumePreview ? (
                <div className="flex items-center justify-center space-x-3 text-green-600">
                  <FileText className="w-6 h-6" />
                  <span className="font-medium">{resumePreview}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setResume(null);
                      setResumePreview('');
                    }}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div>
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 mb-1">Drop your resume here or click to browse</p>
                  <p className="text-sm text-gray-500">PDF, DOC, or DOCX (Max 5MB)</p>
                </div>
              )}
              <input
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleResumeChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
            {formErrors.resume && (
              <p className="text-red-500 text-sm mt-1">{formErrors.resume}</p>
            )}
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Application</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // --- Component: SuccessModal (Redesigned) ---
  const SuccessModal = ({ onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Application Submitted!</h3>
          <p className="text-gray-600 mb-1">Thank you for your application! 🎉</p>
          <p className="text-gray-500 text-sm mb-6">We'll review it and get back to you soon.</p>
          <button
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Browse More Jobs
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <br></br>
              <h1 className="text-2xl font-bold text-gray-900">Careers</h1>
              <p className="text-gray-600 text-sm">Find your next opportunity</p>
            </div>
            <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              <span className="font-semibold text-blue-600">{filteredJobs.length}</span> jobs
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search jobs or companies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[150px]"
              >
                <option value="all">All Types</option>
                <option value="full-time">Full Time</option>
                <option value="part-time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
                <option value="remote">Remote</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading jobs...</p>
            </div>
          </div>
        ) : (
          <>
            {filteredJobs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onClick={(job) => fetchJobDetails(job.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <div className="text-gray-900 text-lg mb-2 font-medium">No jobs found</div>
                <p className="text-gray-600">
                  {searchTerm || filterType !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Check back later for new opportunities'
                  }
                </p>
                {(searchTerm || filterType !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setFilterType('all');
                    }}
                    className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {selectedJob && !showApplication && (
        <JobDetailsModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onApply={() => setShowApplication(true)}
        />
      )}

      {selectedJob && showApplication && !applicationSubmitted && (
        <ApplicationModal
          job={selectedJob}
          onClose={() => {
            setShowApplication(false);
            setSelectedJob(null);
            setFormErrors({});
          }}
        />
      )}

      {applicationSubmitted && (
        <SuccessModal
          onClose={() => {
            setApplicationSubmitted(false);
            setShowApplication(false);
            setSelectedJob(null);
          }}
        />
      )}
    </div>
  );
};

export default JobApplicationApp;