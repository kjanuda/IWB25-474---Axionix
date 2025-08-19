import React, { useState, useEffect } from 'react';
import { useAuthContext } from "@asgardeo/auth-react";
import { Search, Plus, Edit, Trash2, Eye, Calendar, User, Tag, Image, Upload, X, Filter, Lock, AlertCircle, LogIn, BookOpen, Users, TrendingUp } from 'lucide-react';
import image1 from './images/1.jpg';

const API_BASE_URL = 'http://localhost:8085';

const BlogApp = () => {
  const { state, signIn } = useAuthContext();
  const [blogs, setBlogs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [authorFilter, setAuthorFilter] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingBlog, setEditingBlog] = useState(null);
  const [selectedBlog, setSelectedBlog] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    author: '',
    category: '',
    tags: '',
    image: null
  });

  // Get current user email/username
  const getCurrentUser = () => {
    return state.username || state.sub || state.email || 'Unknown User';
  };

  // Check if user can edit/delete a blog post
  const canModifyBlog = (blog) => {
    if (!state.isAuthenticated) return false;
    const currentUser = getCurrentUser();
    return blog.author === currentUser;
  };

  // Fetch blogs with filters
  const fetchBlogs = async (page = 1, search = '', category = '', author = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageLimit: '9'
      });
      
      if (search) params.append('q', search);
      if (category) params.append('category', category);
      if (author) params.append('author', author);

      const endpoint = search ? 'search' : 'blogs';
      const response = await fetch(`${API_BASE_URL}/${endpoint}?${params}`);
      const data = await response.json();

      if (data.success) {
        setBlogs(data.blogs || []);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages);
        }
      }
    } catch (error) {
      showNotification('Error fetching blogs: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/categories`);
      const data = await response.json();
      if (data.success) {
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // Show notification
  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 4000);
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'image') {
      setFormData(prev => ({ ...prev, image: files[0] }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Handle create blog with authentication check
  const handleCreateBlog = async (e) => {
    e.preventDefault();
    
    if (!state.isAuthenticated) {
      showNotification('Please login to create a blog post', 'error');
      return;
    }

    setLoading(true);

    try {
      const currentUser = getCurrentUser();
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('content', formData.content);
      formDataToSend.append('author', currentUser); // Use authenticated user
      formDataToSend.append('category', formData.category);
      formDataToSend.append('tags', formData.tags);
      
      if (formData.image) {
        formDataToSend.append('image', formData.image);
      }

      const response = await fetch(`${API_BASE_URL}/blogs`, {
        method: 'POST',
        body: formDataToSend
      });

      const data = await response.json();
      
      if (data.success) {
        showNotification('Blog post created successfully!');
        setShowCreateForm(false);
        setFormData({ title: '', content: '', author: '', category: '', tags: '', image: null });
        fetchBlogs(currentPage, searchQuery, selectedCategory, authorFilter);
        fetchCategories();
      } else {
        showNotification(data.error || 'Failed to create blog post', 'error');
      }
    } catch (error) {
      showNotification('Error creating blog post: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Update blog post with authorization check
  const handleUpdateBlog = async (e) => {
    e.preventDefault();
    
    if (!editingBlog || !canModifyBlog(editingBlog)) {
      showNotification('You can only edit your own blog posts', 'error');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/blogs/${editingBlog.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: formData.title,
          content: formData.content,
          category: formData.category,
          tags: formData.tags
        })
      });

      const data = await response.json();
      
      if (data.success) {
        showNotification('Blog post updated successfully!');
        setEditingBlog(null);
        setFormData({ title: '', content: '', author: '', category: '', tags: '', image: null });
        setShowCreateForm(false);
        fetchBlogs(currentPage, searchQuery, selectedCategory, authorFilter);
      } else {
        showNotification(data.error || 'Failed to update blog post', 'error');
      }
    } catch (error) {
      showNotification('Error updating blog post: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Delete blog post with authorization check
  const handleDeleteBlog = async (blogId, blog) => {
    if (!canModifyBlog(blog)) {
      showNotification('You can only delete your own blog posts', 'error');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this blog post?')) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/blogs/${blogId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (data.success) {
        showNotification('Blog post deleted successfully!');
        fetchBlogs(currentPage, searchQuery, selectedCategory, authorFilter);
        if (selectedBlog && selectedBlog.id === blogId) {
          setSelectedBlog(null);
        }
      } else {
        showNotification(data.error || 'Failed to delete blog post', 'error');
      }
    } catch (error) {
      showNotification('Error deleting blog post: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // View single blog post
  const handleViewBlog = async (blogId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/blogs/${blogId}`);
      const data = await response.json();
      
      if (data.success) {
        setSelectedBlog(data.blog);
      } else {
        showNotification(data.error || 'Blog post not found', 'error');
      }
    } catch (error) {
      showNotification('Error fetching blog post: ' + error.message, 'error');
    }
  };

  // Start editing blog with authorization check
  const startEditBlog = (blog) => {
    if (!canModifyBlog(blog)) {
      showNotification('You can only edit your own blog posts', 'error');
      return;
    }

    setEditingBlog(blog);
    setFormData({
      title: blog.title,
      content: blog.content,
      author: blog.author,
      category: blog.category || '',
      tags: blog.tags || '',
      image: null
    });
    setShowCreateForm(true);
  };

  // Handle create button click
  const handleCreateClick = () => {
    if (!state.isAuthenticated) {
      const shouldLogin = window.confirm('You need to login to create a blog post. Would you like to login now?');
      if (shouldLogin) {
        signIn();
      }
      return;
    }

    setShowCreateForm(true);
    setEditingBlog(null);
    setFormData({ 
      title: '', 
      content: '', 
      author: getCurrentUser(), 
      category: '', 
      tags: '', 
      image: null 
    });
  };

  // Search blogs
  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchBlogs(1, searchQuery, selectedCategory, authorFilter);
  };

  // Filter blogs
  const handleFilter = () => {
    setCurrentPage(1);
    fetchBlogs(1, searchQuery, selectedCategory, authorFilter);
  };

  // Reset filters
  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setAuthorFilter('');
    setCurrentPage(1);
    fetchBlogs(1, '', '', '');
  };

  useEffect(() => {
    fetchBlogs();
    fetchCategories();
  }, []);

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Truncate text
  const truncateText = (text, maxLength = 150) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Professional Blog Header Section */}
      <div 
        className="relative min-h-[500px] bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${image1})`,
        }}
      >
        {/* Professional overlay */}
        <div className="absolute inset-0 bg-black/40"></div>
        
        <div className="relative z-10 container mx-auto px-6 py-20">
          {/* Main Header Content */}
          <div className="max-w-4xl mx-auto text-center text-white">
            <div className="inline-flex items-center bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6 border border-white/30">
              <BookOpen className="w-5 h-5 mr-2" />
              <span className="text-sm font-medium">Environmental Blog</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Sustainable Future
              <span className="block text-green-400">Starts Here</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-white/90 mb-12 leading-relaxed max-w-3xl mx-auto">
              Discover actionable insights, expert advice, and inspiring stories from the global sustainability community
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              {state.isAuthenticated ? (
                <>
                  <button
                    onClick={handleCreateClick}
                    className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-lg font-semibold text-lg flex items-center gap-2 transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
                  >
                    <Plus size={20} />
                    Write Article
                  </button>
                  <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg px-6 py-4 border border-white/20">
                    <User className="w-5 h-5" />
                    <span className="font-medium">{getCurrentUser()}</span>
                  </div>
                </>
              ) : (
                <>
                  <button
                    onClick={() => signIn()}
                    className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-lg font-semibold text-lg flex items-center gap-2 transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
                  >
                    <LogIn size={20} />
                    Start Writing
                  </button>
                  <button className="bg-white/10 backdrop-blur-sm border border-white/30 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white/20 transition-all duration-200">
                    Explore Articles
                  </button>
                </>
              )}
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold mb-1">{blogs.length}+</div>
                <div className="text-white/80 text-sm uppercase tracking-wide">Articles</div>
              </div>
              <div className="text-center border-l border-r border-white/30">
                <div className="text-3xl font-bold mb-1">{new Set(blogs.map(blog => blog.author)).size}+</div>
                <div className="text-white/80 text-sm uppercase tracking-wide">Writers</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-1">{categories.length}+</div>
                <div className="text-white/80 text-sm uppercase tracking-wide">Topics</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent"></div>
      </div>

      {/* Quick Navigation Bar */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <h2 className="text-2xl font-bold text-gray-900">Latest Articles</h2>
              <div className="hidden md:flex items-center space-x-6">
                <button
                  onClick={() => {setSelectedCategory(''); setCurrentPage(1); fetchBlogs(1, searchQuery, '', authorFilter);}}
                  className={`text-sm font-medium transition-colors duration-200 ${selectedCategory === '' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-600 hover:text-gray-900'} pb-1`}
                >
                  All Posts
                </button>
                {categories.slice(0, 4).map((cat) => (
                  <button
                    key={cat.category}
                    onClick={() => {setSelectedCategory(cat.category); setCurrentPage(1); fetchBlogs(1, searchQuery, cat.category, authorFilter);}}
                    className={`text-sm font-medium transition-colors duration-200 ${selectedCategory === cat.category ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-600 hover:text-gray-900'} pb-1`}
                  >
                    {cat.category}
                  </button>
                ))}
              </div>
            </div>
            
            {state.isAuthenticated && (
              <button
                onClick={handleCreateClick}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors duration-200"
              >
                <Plus size={16} />
                New Post
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Authentication Status Alert */}
      {!state.isAuthenticated && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-400 p-4 mx-6 mt-6 rounded-r-lg shadow-sm">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-amber-500 mr-3" />
            <div>
              <p className="text-amber-800">
                <strong>Guest Mode:</strong> You can view and explore all blog posts. 
                <button 
                  onClick={() => signIn()}
                  className="text-green-600 hover:text-green-800 underline ml-1 mr-1 font-medium"
                >
                  Login with Asgardeo
                </button>
                to create, edit, and manage your own posts.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notification.show && (
        <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-lg shadow-2xl transform transition-all duration-300 ${
          notification.type === 'error' 
            ? 'bg-red-500 text-white' 
            : 'bg-green-500 text-white'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'error' ? (
              <AlertCircle size={20} />
            ) : (
              <Eye size={20} />
            )}
            {notification.message}
          </div>
        </div>
      )}

      <div className="container mx-auto px-6 py-8">
        {/* Enhanced Search and Filters */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-100">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Discover Content</h2>
            <p className="text-gray-600">Search through our collection of environmental articles and insights</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="col-span-1 md:col-span-2">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search blogs, topics, solutions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch(e)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent bg-gray-50 hover:bg-white transition-colors duration-200"
                />
              </div>
            </div>
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="border border-gray-300 rounded-xl py-3 px-4 focus:ring-2 focus:ring-green-500 focus:border-transparent bg-gray-50 hover:bg-white transition-colors duration-200"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.category} value={cat.category}>
                  {cat.category} ({cat.count})
                </option>
              ))}
            </select>
            
            <input
              type="text"
              placeholder="Filter by author..."
              value={authorFilter}
              onChange={(e) => setAuthorFilter(e.target.value)}
              className="border border-gray-300 rounded-xl py-3 px-4 focus:ring-2 focus:ring-green-500 focus:border-transparent bg-gray-50 hover:bg-white transition-colors duration-200"
            />
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleFilter}
              className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <Filter size={16} />
              Apply Filters
            </button>
            <button
              onClick={resetFilters}
              className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
            >
              Reset All
            </button>
            {state.isAuthenticated && (
              <button
                onClick={handleCreateClick}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg ml-auto"
              >
                <Plus size={16} />
                Quick Create
              </button>
            )}
          </div>
        </div>

        {/* Blog Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-500 mx-auto mb-4"></div>
              <p className="text-gray-600 text-lg">Loading amazing content...</p>
            </div>
          </div>
        ) : (
          <>
            {blogs.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-8xl mb-6">🌱</div>
                <h3 className="text-2xl font-bold text-gray-700 mb-4">No blog posts found</h3>
                <p className="text-gray-500 mb-8 text-lg">
                  {state.isAuthenticated 
                    ? 'Be the first to share your environmental insights!' 
                    : 'Login to join our community and start sharing your green journey!'
                  }
                </p>
                {state.isAuthenticated ? (
                  <button
                    onClick={handleCreateClick}
                    className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-xl font-semibold flex items-center gap-2 mx-auto transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                  >
                    <Plus size={20} />
                    Create First Post
                  </button>
                ) : (
                  <button
                    onClick={() => signIn()}
                    className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-xl font-semibold flex items-center gap-2 mx-auto transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                  >
                    <LogIn size={20} />
                    Join Community
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                {blogs.map((blog) => (
                  <article key={blog.id} className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 overflow-hidden group">
                    {blog.image_url && (
                      <div className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
                        <img
                          src={blog.image_url}
                          alt={blog.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                      </div>
                    )}
                    
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        {blog.category && (
                          <span className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium">
                            {blog.category}
                          </span>
                        )}
                        <div className="flex items-center text-gray-500 text-sm">
                          <Eye size={14} className="mr-1" />
                          {blog.views || 0}
                        </div>
                      </div>
                      
                      <h3 className="text-xl font-bold text-gray-800 mb-3 line-clamp-2 group-hover:text-green-600 transition-colors duration-200">
                        {blog.title}
                      </h3>
                      
                      <p className="text-gray-600 mb-4 line-clamp-3 leading-relaxed">
                        {truncateText(blog.content)}
                      </p>
                      
                      <div className="flex items-center text-sm text-gray-500 mb-4 pb-4 border-b border-gray-100">
                        <User size={14} className="mr-1" />
                        <span className="mr-4 font-medium">{blog.author}</span>
                        <Calendar size={14} className="mr-1" />
                        <span>{formatDate(blog.created_at)}</span>
                        {canModifyBlog(blog) && (
                          <span className="ml-auto bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                            Your Post
                          </span>
                        )}
                      </div>
                      
                      {blog.tags && (
                        <div className="flex items-center mb-6">
                          <Tag size={14} className="mr-2 text-gray-400" />
                          <div className="flex flex-wrap gap-1">
                            {blog.tags.split(',').slice(0, 3).map((tag, index) => (
                              <span key={index} className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs">
                                #{tag.trim()}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewBlog(blog.id)}
                          className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 font-medium shadow-md hover:shadow-lg"
                        >
                          <Eye size={16} />
                          Read More
                        </button>
                        
                        {/* Edit Button - Only show for post owner */}
                        {canModifyBlog(blog) ? (
                          <button
                            onClick={() => startEditBlog(blog)}
                            className="bg-amber-500 hover:bg-amber-600 text-white py-3 px-4 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
                            title="Edit your post"
                          >
                            <Edit size={16} />
                          </button>
                        ) : (
                          <button
                            disabled
                            className="bg-gray-200 text-gray-400 py-3 px-4 rounded-xl cursor-not-allowed"
                            title={state.isAuthenticated ? "You can only edit your own posts" : "Login to edit posts"}
                          >
                            <Lock size={16} />
                          </button>
                        )}
                        
                        {/* Delete Button - Only show for post owner */}
                        {canModifyBlog(blog) ? (
                          <button
                            onClick={() => handleDeleteBlog(blog.id, blog)}
                            className="bg-red-500 hover:bg-red-600 text-white py-3 px-4 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
                            title="Delete your post"
                          >
                            <Trash2 size={16} />
                          </button>
                        ) : (
                          <button
                            disabled
                            className="bg-gray-200 text-gray-400 py-3 px-4 rounded-xl cursor-not-allowed"
                            title={state.isAuthenticated ? "You can only delete your own posts" : "Login to delete posts"}
                          >
                            <Lock size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {/* Enhanced Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 bg-white rounded-2xl p-6 shadow-lg">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-6 py-3 bg-gray-100 border border-gray-200 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-all duration-200 font-medium"
                >
                  Previous
                </button>
                
                {[...Array(totalPages)].map((_, index) => {
                  const page = index + 1;
                  if (page === currentPage || page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
                          currentPage === page
                            ? 'bg-green-500 text-white shadow-lg'
                            : 'bg-gray-100 border border-gray-200 hover:bg-gray-200'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  } else if (page === currentPage - 2 || page === currentPage + 2) {
                    return <span key={page} className="px-2 text-gray-400">...</span>;
                  }
                  return null;
                })}
                
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-6 py-3 bg-gray-100 border border-gray-200 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-all duration-200 font-medium"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create/Edit Form Modal */}
      {showCreateForm && state.isAuthenticated && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-8 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
              <div>
                <h2 className="text-3xl font-bold text-gray-800 mb-2">
                  {editingBlog ? 'Edit Your Post' : 'Create New Post'}
                </h2>
                <p className="text-gray-600">
                  {editingBlog ? 'Update your environmental insights' : 'Share your environmental insights with the community'}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingBlog(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200 p-2 hover:bg-white rounded-full"
              >
                <X size={28} />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Post Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                    className="w-full border-2 border-gray-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-lg"
                    placeholder="Enter an engaging title for your post..."
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Content *</label>
                <textarea
                  name="content"
                  value={formData.content}
                  onChange={handleInputChange}
                  required
                  rows={10}
                  className="w-full border-2 border-gray-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none transition-all duration-200"
                  placeholder="Write your content here... Share your environmental insights, tips, research, or personal experiences that can help others on their sustainability journey."
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Author</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      name="author"
                      value={getCurrentUser()}
                      disabled
                      className="w-full pl-10 border-2 border-gray-200 rounded-xl py-3 px-4 bg-gray-50 text-gray-600"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Category</label>
                  <input
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full border-2 border-gray-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                    placeholder="e.g., Renewable Energy, Sustainability, Climate Change..."
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Tags</label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    name="tags"
                    value={formData.tags}
                    onChange={handleInputChange}
                    className="w-full pl-10 border-2 border-gray-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                    placeholder="solar energy, recycling, green technology (separate with commas)"
                  />
                </div>
              </div>
              
              {!editingBlog && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Featured Image</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-green-400 transition-all duration-200 bg-gray-50 hover:bg-green-50">
                    <input
                      type="file"
                      name="image"
                      onChange={handleInputChange}
                      accept="image/*"
                      className="hidden"
                      id="image-upload"
                    />
                    <label htmlFor="image-upload" className="cursor-pointer">
                      <div className="flex flex-col items-center">
                        <Upload className="h-16 w-16 text-gray-400 mb-4" />
                        <p className="text-lg font-medium text-gray-600 mb-2">
                          {formData.image ? formData.image.name : 'Click to upload featured image'}
                        </p>
                        <p className="text-sm text-gray-500">
                          Support: JPG, PNG, GIF up to 10MB
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              )}
              
              <div className="flex gap-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={editingBlog ? handleUpdateBlog : handleCreateBlog}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-4 px-8 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-3 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                  ) : (
                    <>
                      {editingBlog ? <Edit size={20} /> : <Plus size={20} />}
                      {editingBlog ? 'Update Post' : 'Publish Post'}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingBlog(null);
                  }}
                  className="px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Blog Detail Modal */}
      {selectedBlog && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="relative">
              {selectedBlog.image_url && (
                <div className="h-80 bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden rounded-t-2xl">
                  <img
                    src={selectedBlog.image_url}
                    alt={selectedBlog.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                </div>
              )}
              
              <button
                onClick={() => setSelectedBlog(null)}
                className="absolute top-6 right-6 bg-white bg-opacity-90 text-gray-600 hover:text-gray-800 p-3 rounded-full transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  {selectedBlog.category && (
                    <span className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 px-6 py-2 rounded-full text-sm font-semibold">
                      {selectedBlog.category}
                    </span>
                  )}
                  {canModifyBlog(selectedBlog) && (
                    <span className="bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 px-6 py-2 rounded-full text-sm font-semibold">
                      Your Post
                    </span>
                  )}
                </div>
                <div className="flex items-center text-gray-500 text-sm">
                  <Eye size={18} className="mr-2" />
                  {selectedBlog.views || 0} views
                </div>
              </div>
              
              <h1 className="text-4xl font-bold text-gray-800 mb-6 leading-tight">{selectedBlog.title}</h1>
              
              <div className="flex items-center text-gray-600 mb-8 pb-6 border-b border-gray-200">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center mr-4">
                    <User size={20} className="text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-lg">{selectedBlog.author}</div>
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar size={14} className="mr-1" />
                      {formatDate(selectedBlog.created_at)}
                    </div>
                  </div>
                </div>
              </div>
              
              {selectedBlog.tags && (
                <div className="flex items-center mb-8">
                  <Tag size={18} className="mr-3 text-gray-400" />
                  <div className="flex flex-wrap gap-2">
                    {selectedBlog.tags.split(',').map((tag, index) => (
                      <span
                        key={index}
                        className="bg-gray-100 text-gray-700 px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors duration-200"
                      >
                        #{tag.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="prose prose-lg max-w-none">
                <div className="text-gray-700 leading-relaxed whitespace-pre-line text-lg">
                  {selectedBlog.content}
                </div>
              </div>
              
              {/* Action buttons only for post owner */}
              {canModifyBlog(selectedBlog) && (
                <div className="flex gap-4 mt-12 pt-8 border-t border-gray-200">
                  <button
                    onClick={() => {
                      startEditBlog(selectedBlog);
                      setSelectedBlog(null);
                    }}
                    className="bg-amber-500 hover:bg-amber-600 text-white py-3 px-8 rounded-xl transition-all duration-200 flex items-center gap-3 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                  >
                    <Edit size={18} />
                    Edit Post
                  </button>
                  <button
                    onClick={() => {
                      handleDeleteBlog(selectedBlog.id, selectedBlog);
                      setSelectedBlog(null);
                    }}
                    className="bg-red-500 hover:bg-red-600 text-white py-3 px-8 rounded-xl transition-all duration-200 flex items-center gap-3 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                  >
                    <Trash2 size={18} />
                    Delete Post
                  </button>
                </div>
              )}
              
              {/* Info message for non-owners */}
              {!canModifyBlog(selectedBlog) && state.isAuthenticated && (
                <div className="mt-12 pt-8 border-t border-gray-200">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                    <div className="flex items-center">
                      <AlertCircle className="w-6 h-6 text-blue-500 mr-3" />
                      <p className="text-blue-700">
                        This post belongs to <strong>{selectedBlog.author}</strong>. Only the author can edit or delete this post.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Login prompt for guests */}
              {!state.isAuthenticated && (
                <div className="mt-12 pt-8 border-t border-gray-200">
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Lock className="w-6 h-6 text-green-500 mr-3" />
                        <div>
                          <p className="text-green-700 font-semibold mb-1">
                            Join Our Environmental Community
                          </p>
                          <p className="text-green-600 text-sm">
                            Login with Asgardeo to create your own blog posts and share your sustainability journey.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => signIn()}
                        className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                      >
                        Login Now
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlogApp;