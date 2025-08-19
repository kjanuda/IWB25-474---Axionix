import React, { useState, useEffect } from 'react';
import { Search, Plus, ThumbsUp, ThumbsDown, MessageCircle, Tag, User, Clock, Eye, Check, Upload, X, Filter, TrendingUp, Users, FileText, Award } from 'lucide-react';

// API Configuration
const API_BASE_URL = 'http://localhost:9093/api/v1';
const CURRENT_USER_ID = 'user123'; // In real app, this would come from auth

// API Helper Functions
const apiCall = async (endpoint, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': CURRENT_USER_ID,
      ...options.headers,
    },
    ...options,
  });
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }
  
  return response.json();
};

const apiCallMultipart = async (endpoint, formData) => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'X-User-Id': CURRENT_USER_ID,
    },
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }
  
  return response.json();
};

// Main App Component
const CommunityQA = () => {
  const [currentView, setCurrentView] = useState('questions');
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [tags, setTags] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({ tags: '', solved: '', userId: '' });
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });

  // Load initial data
  useEffect(() => {
    loadQuestions();
    loadTags();
    loadStats();
  }, []);

  // API Functions
  const loadQuestions = async (page = 1, searchFilters = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pagination.pageSize.toString(),
        ...searchFilters,
      });
      
      const data = await apiCall(`/questions?${params}`);
      setQuestions(data.questions);
      setPagination(prev => ({ ...prev, ...data.pagination }));
    } catch (error) {
      console.error('Error loading questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTags = async () => {
    try {
      const data = await apiCall('/tags');
      setTags(data.tags);
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  };

  const loadStats = async () => {
    try {
      const data = await apiCall('/stats/overview');
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadQuestionDetails = async (questionId) => {
    setLoading(true);
    try {
      const data = await apiCall(`/questions/${questionId}`);
      setCurrentQuestion(data);
    } catch (error) {
      console.error('Error loading question details:', error);
    } finally {
      setLoading(false);
    }
  };

  const createQuestion = async (questionData, files) => {
    try {
      const formData = new FormData();
      formData.append('data', JSON.stringify(questionData));
      
      if (files) {
        Array.from(files).forEach((file, index) => {
          formData.append(`file${index}`, file);
        });
      }
      
      await apiCallMultipart('/questions', formData);
      loadQuestions();
      setCurrentView('questions');
    } catch (error) {
      console.error('Error creating question:', error);
      throw error;
    }
  };

  const createAnswer = async (questionId, content, files) => {
    try {
      const formData = new FormData();
      formData.append('data', JSON.stringify({ content }));
      
      if (files) {
        Array.from(files).forEach((file, index) => {
          formData.append(`file${index}`, file);
        });
      }
      
      await apiCallMultipart(`/questions/${questionId}/answers`, formData);
      loadQuestionDetails(questionId);
    } catch (error) {
      console.error('Error creating answer:', error);
      throw error;
    }
  };

  const vote = async (targetId, targetType, voteType) => {
    try {
      await apiCall(`/vote?targetId=${targetId}&targetType=${targetType}`, {
        method: 'POST',
        body: JSON.stringify({ voteType }),
      });
      
      if (currentQuestion) {
        loadQuestionDetails(currentQuestion.question.id);
      } else {
        loadQuestions(pagination.page, filters);
      }
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const acceptAnswer = async (answerId) => {
    try {
      await apiCall(`/answers/${answerId}/accept`, { method: 'PUT' });
      loadQuestionDetails(currentQuestion.question.id);
    } catch (error) {
      console.error('Error accepting answer:', error);
    }
  };

  const addReply = async (parentId, parentType, content) => {
    try {
      await apiCall(`/replies?parentId=${parentId}&parentType=${parentType}`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
      loadQuestionDetails(currentQuestion.question.id);
    } catch (error) {
      console.error('Error adding reply:', error);
    }
  };

  // Header Component
  const Header = () => (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <h1 className="text-2xl font-bold text-gray-900 cursor-pointer" 
                onClick={() => { setCurrentView('questions'); setCurrentQuestion(null); }}>
              Community Q&A
            </h1>
            <nav className="flex space-x-6">
              <button
                onClick={() => { setCurrentView('questions'); setCurrentQuestion(null); }}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  currentView === 'questions' ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Questions
              </button>
              <button
                onClick={() => setCurrentView('tags')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  currentView === 'tags' ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Tags
              </button>
              <button
                onClick={() => setCurrentView('stats')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  currentView === 'stats' ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Stats
              </button>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <SearchBar />
            <button
              onClick={() => setCurrentView('ask')}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Ask Question</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );

  // Search Bar Component
  const SearchBar = () => {
    const handleSearch = (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const query = formData.get('search');
      setSearchQuery(query);
      loadQuestions(1, { query });
    };

    return (
      <form onSubmit={handleSearch} className="flex-1 max-w-lg">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            name="search"
            type="text"
            placeholder="Search questions..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </form>
    );
  };

  // Filter Panel Component
  const FilterPanel = () => (
    <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
      <div className="flex items-center space-x-4">
        <Filter className="w-4 h-4 text-gray-500" />
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
            <input
              type="text"
              placeholder="javascript, python, react"
              value={filters.tags}
              onChange={(e) => setFilters(prev => ({ ...prev, tags: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.solved}
              onChange={(e) => setFilters(prev => ({ ...prev, solved: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Questions</option>
              <option value="true">Solved</option>
              <option value="false">Unsolved</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => loadQuestions(1, filters)}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Questions List Component
  const QuestionsList = () => (
    <div className="space-y-6">
      <FilterPanel />
      
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {questions.map((question) => (
              <QuestionCard key={question.id} question={question} />
            ))}
          </div>
          
          {questions.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No questions found</h3>
              <p className="text-gray-500">Be the first to ask a question!</p>
            </div>
          )}
          
          <Pagination />
        </>
      )}
    </div>
  );

  // Question Card Component
  const QuestionCard = ({ question }) => (
    <div className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start space-x-4">
        <div className="flex flex-col items-center space-y-2 text-sm text-gray-500">
          <div className="flex items-center space-x-1">
            <ThumbsUp className="w-4 h-4" />
            <span>{question.votes || 0}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Eye className="w-4 h-4" />
            <span>{question.views || 0}</span>
          </div>
          {question.solved && (
            <div className="flex items-center space-x-1 text-green-600">
              <Check className="w-4 h-4" />
              <span>Solved</span>
            </div>
          )}
        </div>
        
        <div className="flex-1">
          <h3 
            className="text-lg font-semibold text-gray-900 mb-2 cursor-pointer hover:text-blue-600"
            onClick={() => {
              setCurrentView('question');
              loadQuestionDetails(question.id);
            }}
          >
            {question.title}
          </h3>
          
          <p className="text-gray-600 mb-3 line-clamp-2">{question.problem}</p>
          
          <div className="flex flex-wrap gap-2 mb-3">
            {question.tags?.map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full cursor-pointer hover:bg-blue-200"
                onClick={() => {
                  setFilters(prev => ({ ...prev, tags: tag }));
                  loadQuestions(1, { tags: tag });
                }}
              >
                {tag}
              </span>
            ))}
          </div>
          
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <User className="w-4 h-4" />
                <span>{question.username}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>{new Date(question.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Question Details Component
  const QuestionDetails = () => {
    const [newAnswer, setNewAnswer] = useState('');
    const [files, setFiles] = useState(null);
    const [replyContent, setReplyContent] = useState({});
    const [showReplyForm, setShowReplyForm] = useState({});

    if (!currentQuestion) return null;

    const { question, answers, questionReplies, answerReplies } = currentQuestion;

    const handleAnswerSubmit = async (e) => {
      e.preventDefault();
      if (newAnswer.trim().length < 20) {
        alert('Answer must be at least 20 characters');
        return;
      }
      
      try {
        await createAnswer(question.id, newAnswer, files);
        setNewAnswer('');
        setFiles(null);
      } catch (error) {
        alert('Error posting answer');
      }
    };

    const handleReplySubmit = async (parentId, parentType) => {
      const content = replyContent[`${parentId}-${parentType}`];
      if (!content || content.trim().length < 10) {
        alert('Reply must be at least 10 characters');
        return;
      }
      
      try {
        await addReply(parentId, parentType, content);
        setReplyContent(prev => ({ ...prev, [`${parentId}-${parentType}`]: '' }));
        setShowReplyForm(prev => ({ ...prev, [`${parentId}-${parentType}`]: false }));
      } catch (error) {
        alert('Error posting reply');
      }
    };

    return (
      <div className="space-y-6">
        {/* Question */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-start space-x-4">
            <div className="flex flex-col items-center space-y-2">
              <button
                onClick={() => vote(question.id, 'question', 1)}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <ThumbsUp className="w-5 h-5 text-gray-600" />
              </button>
              <span className="font-semibold text-lg">{question.votes || 0}</span>
              <button
                onClick={() => vote(question.id, 'question', -1)}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <ThumbsDown className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">{question.title}</h1>
              
              <div className="prose max-w-none mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Problem:</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{question.problem}</p>
                
                <h3 className="text-lg font-semibold text-gray-900 mt-4">Expected:</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{question.expecting}</p>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {question.tags?.map((tag, index) => (
                  <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
              
              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center space-x-4">
                  <span>Asked by {question.username}</span>
                  <span>{new Date(question.createdAt).toLocaleDateString()}</span>
                  <span>{question.views} views</span>
                </div>
                <button
                  onClick={() => setShowReplyForm(prev => ({ ...prev, [`${question.id}-question`]: !prev[`${question.id}-question`] }))}
                  className="flex items-center space-x-1 text-blue-600 hover:text-blue-700"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Reply</span>
                </button>
              </div>
              
              {showReplyForm[`${question.id}-question`] && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <textarea
                    value={replyContent[`${question.id}-question`] || ''}
                    onChange={(e) => setReplyContent(prev => ({ ...prev, [`${question.id}-question`]: e.target.value }))}
                    placeholder="Write your reply..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                  />
                  <div className="flex justify-end space-x-2 mt-2">
                    <button
                      onClick={() => setShowReplyForm(prev => ({ ...prev, [`${question.id}-question`]: false }))}
                      className="px-3 py-1 text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleReplySubmit(question.id, 'question')}
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Reply
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Question Replies */}
        {questionReplies?.length > 0 && (
          <div className="ml-12 space-y-2">
            {questionReplies.map((reply) => (
              <div key={reply.id} className="bg-gray-50 p-3 rounded border-l-4 border-blue-200">
                <p className="text-gray-700">{reply.content}</p>
                <div className="text-xs text-gray-500 mt-1">
                  {reply.username} • {new Date(reply.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Answers */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {answers?.length || 0} Answer{answers?.length !== 1 ? 's' : ''}
          </h2>
          
          {answers?.map((answer) => (
            <div key={answer.id} className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-start space-x-4">
                <div className="flex flex-col items-center space-y-2">
                  <button
                    onClick={() => vote(answer.id, 'answer', 1)}
                    className="p-2 rounded-full hover:bg-gray-100"
                  >
                    <ThumbsUp className="w-5 h-5 text-gray-600" />
                  </button>
                  <span className="font-semibold text-lg">{answer.votes || 0}</span>
                  <button
                    onClick={() => vote(answer.id, 'answer', -1)}
                    className="p-2 rounded-full hover:bg-gray-100"
                  >
                    <ThumbsDown className="w-5 h-5 text-gray-600" />
                  </button>
                  {answer.accepted && (
                    <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
                      <Check className="w-5 h-5 text-green-600" />
                    </div>
                  )}
                  {!answer.accepted && question.userId === CURRENT_USER_ID && (
                    <button
                      onClick={() => acceptAnswer(answer.id)}
                      className="text-xs text-green-600 hover:text-green-700 border border-green-300 rounded px-2 py-1"
                    >
                      Accept
                    </button>
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="prose max-w-none mb-4">
                    <p className="text-gray-700 whitespace-pre-wrap">{answer.content}</p>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center space-x-4">
                      <span>Answered by {answer.username}</span>
                      <span>{new Date(answer.createdAt).toLocaleDateString()}</span>
                    </div>
                    <button
                      onClick={() => setShowReplyForm(prev => ({ ...prev, [`${answer.id}-answer`]: !prev[`${answer.id}-answer`] }))}
                      className="flex items-center space-x-1 text-blue-600 hover:text-blue-700"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Reply</span>
                    </button>
                  </div>
                  
                  {showReplyForm[`${answer.id}-answer`] && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <textarea
                        value={replyContent[`${answer.id}-answer`] || ''}
                        onChange={(e) => setReplyContent(prev => ({ ...prev, [`${answer.id}-answer`]: e.target.value }))}
                        placeholder="Write your reply..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                      />
                      <div className="flex justify-end space-x-2 mt-2">
                        <button
                          onClick={() => setShowReplyForm(prev => ({ ...prev, [`${answer.id}-answer`]: false }))}
                          className="px-3 py-1 text-gray-600 hover:text-gray-800"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleReplySubmit(answer.id, 'answer')}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Reply
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Answer Replies */}
                  {answerReplies?.[answer.id]?.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {answerReplies[answer.id].map((reply) => (
                        <div key={reply.id} className="bg-gray-50 p-3 rounded border-l-4 border-green-200">
                          <p className="text-gray-700">{reply.content}</p>
                          <div className="text-xs text-gray-500 mt-1">
                            {reply.username} • {new Date(reply.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Answer Form */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Answer</h3>
          <form onSubmit={handleAnswerSubmit}>
            <textarea
              value={newAnswer}
              onChange={(e) => setNewAnswer(e.target.value)}
              placeholder="Write your answer here... (minimum 20 characters)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={6}
              required
            />
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Attachments (optional)
              </label>
              <input
                type="file"
                multiple
                onChange={(e) => setFiles(e.target.files)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
            
            <div className="flex justify-end mt-4">
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
              >
                Post Answer
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Ask Question Form Component
  const AskQuestionForm = () => {
    const [formData, setFormData] = useState({
      title: '',
      problem: '',
      expecting: '',
      tags: '',
    });
    const [files, setFiles] = useState(null);

    const handleSubmit = async (e) => {
      e.preventDefault();
      
      const tagsArray = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      
      if (formData.title.length < 10) {
        alert('Title must be at least 10 characters');
        return;
      }
      
      if (formData.problem.length < 20) {
        alert('Problem description must be at least 20 characters');
        return;
      }
      
      if (tagsArray.length === 0) {
        alert('At least one tag is required');
        return;
      }
      
      try {
        await createQuestion({
          ...formData,
          tags: tagsArray,
        }, files);
      } catch (error) {
        alert('Error creating question');
      }
    };

    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Ask a Question</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Be specific and imagine you're asking a question to another person"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <p className="text-sm text-gray-500 mt-1">Minimum 10 characters</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Problem Description *
              </label>
              <textarea
                value={formData.problem}
                onChange={(e) => setFormData(prev => ({ ...prev, problem: e.target.value }))}
                placeholder="Describe your problem in detail..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={6}
                required
              />
              <p className="text-sm text-gray-500 mt-1">Minimum 20 characters</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What are you expecting? *
              </label>
              <textarea
                value={formData.expecting}
                onChange={(e) => setFormData(prev => ({ ...prev, expecting: e.target.value }))}
                placeholder="Describe what you expect to happen or what solution you're looking for..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={4}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags *
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="javascript, react, nodejs (comma-separated)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <p className="text-sm text-gray-500 mt-1">Add comma-separated tags to help others find your question</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Attachments (optional)
              </label>
              <input
                type="file"
                multiple
                onChange={(e) => setFiles(e.target.files)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="text-sm text-gray-500 mt-1">Images, PDFs, and other files to help explain your question</p>
            </div>
            
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => setCurrentView('questions')}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
              >
                Post Question
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Tags View Component
  const TagsView = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Popular Tags</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tags.map((tag) => (
          <div
            key={tag.name}
            className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => {
              setFilters(prev => ({ ...prev, tags: tag.name }));
              setCurrentView('questions');
              loadQuestions(1, { tags: tag.name });
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Tag className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-gray-900">{tag.name}</span>
              </div>
              <span className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full">
                {tag.count}
              </span>
            </div>
            {tag.description && (
              <p className="text-gray-600 text-sm mt-2">{tag.description}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  // Stats View Component
  const StatsView = () => {
    if (!stats) return <div>Loading stats...</div>;

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Platform Statistics</h2>
        
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <FileText className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{stats.overview.totalQuestions}</p>
                <p className="text-gray-600">Total Questions</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <MessageCircle className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{stats.overview.totalAnswers}</p>
                <p className="text-gray-600">Total Answers</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{stats.overview.totalUsers}</p>
                <p className="text-gray-600">Total Users</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <TrendingUp className="w-8 h-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{stats.overview.solutionRate.toFixed(1)}%</p>
                <p className="text-gray-600">Solution Rate</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Top Contributors */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Contributors</h3>
          <div className="space-y-4">
            {stats.topContributors.map((user, index) => (
              <div key={user.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
                    <span className="text-sm font-bold text-gray-600">#{index + 1}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{user.username}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Award className="w-4 h-4 text-yellow-500" />
                  <span className="font-semibold text-gray-900">{user.reputation}</span>
                  <span className="text-gray-500">rep</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Pagination Component
  const Pagination = () => {
    if (pagination.totalPages <= 1) return null;

    const pages = [];
    const currentPage = pagination.page;
    const totalPages = pagination.totalPages;

    // Add first page
    if (currentPage > 3) {
      pages.push(1);
      if (currentPage > 4) pages.push('...');
    }

    // Add current page and surrounding pages
    for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
      pages.push(i);
    }

    // Add last page
    if (currentPage < totalPages - 2) {
      if (currentPage < totalPages - 3) pages.push('...');
      pages.push(totalPages);
    }

    return (
      <div className="flex justify-center items-center space-x-2 mt-8">
        <button
          onClick={() => loadQuestions(currentPage - 1, filters)}
          disabled={currentPage === 1}
          className="px-3 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        
        {pages.map((page, index) => (
          <button
            key={index}
            onClick={() => typeof page === 'number' && loadQuestions(page, filters)}
            disabled={page === '...'}
            className={`px-3 py-2 border rounded-md ${
              page === currentPage
                ? 'bg-blue-600 text-white border-blue-600'
                : page === '...'
                ? 'border-gray-300 text-gray-400 cursor-not-allowed'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {page}
          </button>
        ))}
        
        <button
          onClick={() => loadQuestions(currentPage + 1, filters)}
          disabled={currentPage === totalPages}
          className="px-3 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    );
  };

  // Main Render
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'questions' && <QuestionsList />}
        {currentView === 'question' && <QuestionDetails />}
        {currentView === 'ask' && <AskQuestionForm />}
        {currentView === 'tags' && <TagsView />}
        {currentView === 'stats' && <StatsView />}
      </main>
    </div>
  );
};

export default CommunityQA;