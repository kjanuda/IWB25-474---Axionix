import React, { useState, useEffect } from 'react';
import { Search, Clock, User, MapPin, Eye, TrendingUp, Globe, Filter, ChevronRight, Calendar, Share2, Heart, Bookmark } from 'lucide-react';

const API_BASE_URL = 'http://localhost:7087';

// Main App Component
const App = () => {
  const [currentView, setCurrentView] = useState('home');
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header currentView={currentView} setCurrentView={setCurrentView} />
      <Navigation currentView={currentView} setCurrentView={setCurrentView} selectedTopic={selectedTopic} setSelectedTopic={setSelectedTopic} />
      <MainContent 
        currentView={currentView} 
        selectedTopic={selectedTopic}
        selectedArticle={selectedArticle}
        setSelectedArticle={setSelectedArticle}
        setCurrentView={setCurrentView}
      />
    </div>
  );
};
<br></br>
// Header Component
const Header = ({ currentView, setCurrentView }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Handle search functionality
      console.log('Searching for:', searchQuery);
    }
  };

  return (
    
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <br></br>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div 
              className="flex items-center cursor-pointer group"
              onClick={() => setCurrentView('home')}
            ><br></br>
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg mr-3 flex items-center justify-center">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <br></br>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent group-hover:from-purple-600 group-hover:to-blue-600 transition-all duration-300">
                EcoNews360
              </h1>
            </div>
          </div>
          
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-2xl mx-8">
            <div className={`relative transition-all duration-300 ${isSearchFocused ? 'scale-105' : ''}`}>
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search breaking news, topics, or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                className="w-full pl-12 pr-6 py-3 border border-gray-200 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-all duration-300 text-gray-700 placeholder-gray-500"
              />
            </div>
          </form>

          {/* Date & Time */}
          <div className="hidden md:flex items-center text-sm text-gray-600">
            <Calendar className="w-4 h-4 mr-2" />
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>
      </div>
    </header>
  );
};

// Navigation Component
const Navigation = ({ currentView, setCurrentView, selectedTopic, setSelectedTopic }) => {
  const [topics, setTopics] = useState([]);

  useEffect(() => {
    fetchTopics();
  }, []);

  const fetchTopics = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/topics`);
      const data = await response.json();
      if (data.success) {
        setTopics(data.topics.slice(0, 8)); // Show only top 8 topics
      }
    } catch (error) {
      console.error('Error fetching topics:', error);
    }
  };

  const menuItems = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'breaking', label: 'Breaking', icon: '🚨' },
    { id: 'international', label: 'International', icon: '🌍' },
  
  ];

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-16 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4">
          {/* Main Navigation */}
          <div className="flex items-center space-x-8">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentView(item.id);
                  setSelectedTopic(null);
                }}
                className={`flex items-center px-4 py-2 rounded-full transition-all duration-300 font-medium ${
                  currentView === item.id && !selectedTopic
                    ? 'bg-blue-100 text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                }`}
              >
                <span className="mr-2">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>

          {/* Topics */}
         
        </div>
      </div>
    </nav>
  );
};

// Main Content Component
const MainContent = ({ currentView, selectedTopic, selectedArticle, setSelectedArticle, setCurrentView }) => {
  if (selectedArticle) {
    return <ArticleView article={selectedArticle} onBack={() => setSelectedArticle(null)} />;
  }

  const renderContent = () => {
    switch (currentView) {
      case 'home':
        return <HomePage setSelectedArticle={setSelectedArticle} />;
      case 'breaking':
        return <BreakingNews setSelectedArticle={setSelectedArticle} />;
      case 'international':
        return <InternationalNews setSelectedArticle={setSelectedArticle} />;
      case 'trending':
        return <TrendingNews setSelectedArticle={setSelectedArticle} />;
      case 'topic':
        return <TopicNews topic={selectedTopic} setSelectedArticle={setSelectedArticle} />;
      default:
        return <HomePage setSelectedArticle={setSelectedArticle} />;
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {renderContent()}
    </main>
  );
};

// Home Page Component
const HomePage = ({ setSelectedArticle }) => {
  const [featuredNews, setFeaturedNews] = useState([]);
  const [recentNews, setRecentNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHomeNews();
  }, []);

  const fetchHomeNews = async () => {
    try {
      setLoading(true);
      // Fetch breaking/high priority news for featured section
      const featuredResponse = await fetch(`${API_BASE_URL}/news?priority=breaking&pageLimit=3`);
      const featuredData = await featuredResponse.json();
      
      // Fetch recent news
      const recentResponse = await fetch(`${API_BASE_URL}/news?pageLimit=12`);
      const recentData = await recentResponse.json();
      
      if (featuredData.success) {
        setFeaturedNews(featuredData.news);
      }
      if (recentData.success) {
        setRecentNews(recentData.news);
      }
    } catch (error) {
      console.error('Error fetching home news:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Stay Informed, Stay Ahead</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Get the latest breaking news, in-depth analysis, and trending stories from around the world
          </p>
        </div>
      </section>

      {/* Featured News */}
      {featuredNews.length > 0 && (
        <section>
          <div className="flex items-center mb-6">
            <div className="bg-red-100 p-2 rounded-lg mr-3">
              <TrendingUp className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">Breaking & Featured</h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {featuredNews.map((article, index) => (
              <FeaturedCard 
                key={article.id} 
                article={article} 
                isLarge={index === 0}
                onClick={() => setSelectedArticle(article)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Recent News Grid */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-900">Latest News</h3>
          <button className="text-blue-600 hover:text-blue-700 font-medium flex items-center">
            View All <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {recentNews.map((article) => (
            <NewsCard 
              key={article.id} 
              article={article} 
              onClick={() => setSelectedArticle(article)}
            />
          ))}
        </div>
      </section>
    </div>
  );
};

// Featured Card Component (for hero section)
const FeaturedCard = ({ article, isLarge, onClick }) => {
  return (
    <div 
      className={`group cursor-pointer ${isLarge ? 'lg:col-span-2 lg:row-span-2' : ''}`}
      onClick={onClick}
    >
      <div className="relative bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 group-hover:scale-[1.02]">
        {article.image_url && (
          <div className={`relative ${isLarge ? 'h-64 lg:h-80' : 'h-48'} overflow-hidden`}>
            <img 
              src={article.image_url} 
              alt={article.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute top-4 left-4">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${getPriorityStyle(article.priority)}`}>
                {article.priority.toUpperCase()}
              </span>
            </div>
          </div>
        )}
        
        <div className="p-6">
          <div className="flex items-center mb-3 text-sm text-gray-500">
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium mr-3">
              {article.topic}
            </span>
            <Clock className="w-4 h-4 mr-1" />
            {getTimeAgo(article.created_at)}
          </div>
          
          <h3 className={`font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors ${
            isLarge ? 'text-xl lg:text-2xl' : 'text-lg'
          }`}>
            {article.title}
          </h3>
          
          <p className={`text-gray-600 mb-4 ${isLarge ? 'text-base' : 'text-sm'} line-clamp-3`}>
            {article.content}
          </p>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-gray-500">
              <User className="w-4 h-4 mr-1" />
              {article.author}
            </div>
            <div className="flex items-center text-sm text-gray-500">
              <Eye className="w-4 h-4 mr-1" />
              {article.views} views
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// News Card Component
const NewsCard = ({ article, onClick }) => {
  return (
    <div 
      className="group cursor-pointer bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100 hover:border-blue-200"
      onClick={onClick}
    >
      {article.image_url && (
        <div className="relative h-48 overflow-hidden">
          <img 
            src={article.image_url} 
            alt={article.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute top-3 left-3">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityStyle(article.priority)}`}>
              {article.priority}
            </span>
          </div>
        </div>
      )}
      
      <div className="p-4">
        <div className="flex items-center mb-2 text-xs">
          <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full mr-2">
            {article.topic}
          </span>
          <Clock className="w-3 h-3 mr-1 text-gray-400" />
          <span className="text-gray-500">{getTimeAgo(article.created_at)}</span>
        </div>
        
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {article.title}
        </h3>
        
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {article.content}
        </p>
        
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center">
            <User className="w-3 h-3 mr-1" />
            {article.author}
          </div>
          <div className="flex items-center">
            <Eye className="w-3 h-3 mr-1" />
            {article.views}
          </div>
        </div>
      </div>
    </div>
  );
};

// Breaking News Component
const BreakingNews = ({ setSelectedArticle }) => {
  const [breakingNews, setBreakingNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBreakingNews();
  }, []);

  const fetchBreakingNews = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/news/breaking`);
      const data = await response.json();
      if (data.success) {
        setBreakingNews(data.breakingNews);
      }
    } catch (error) {
      console.error('Error fetching breaking news:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <div className="text-center mb-8">
        <div className="inline-flex items-center bg-red-100 px-4 py-2 rounded-full mb-4">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse mr-2"></div>
          <span className="text-red-700 font-bold">BREAKING NEWS</span>
        </div>
        <h2 className="text-3xl font-bold text-gray-900">Latest Breaking Stories</h2>
      </div>
      
      {breakingNews.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Globe className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 text-lg">No breaking news at the moment</p>
          <p className="text-gray-400">Check back later for updates</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {breakingNews.map((article, index) => (
            <FeaturedCard 
              key={article.id} 
              article={article} 
              isLarge={index === 0}
              onClick={() => setSelectedArticle(article)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// International News Component
const InternationalNews = ({ setSelectedArticle }) => {
  const [internationalNews, setInternationalNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInternationalNews();
  }, []);

  const fetchInternationalNews = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/news?topic=International&pageLimit=20`);
      const data = await response.json();
      if (data.success) {
        setInternationalNews(data.news);
      }
    } catch (error) {
      console.error('Error fetching international news:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <div className="text-center mb-8">
        <div className="inline-flex items-center bg-blue-100 px-4 py-2 rounded-full mb-4">
          <Globe className="w-5 h-5 text-blue-600 mr-2" />
          <span className="text-blue-700 font-bold">INTERNATIONAL</span>
        </div>
        <h2 className="text-3xl font-bold text-gray-900">World News & Global Events</h2>
        <p className="text-gray-600 mt-2">Stay updated with international affairs and global developments</p>
      </div>
      
      {internationalNews.length === 0 ? (
        <div className="text-center py-16">
          <Globe className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No international news available</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Featured International Story */}
          {internationalNews[0] && (
            <div className="mb-12">
              <FeaturedCard 
                article={internationalNews[0]} 
                isLarge={true}
                onClick={() => setSelectedArticle(internationalNews[0])}
              />
            </div>
          )}
          
          {/* Other International Stories */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {internationalNews.slice(1).map((article) => (
              <NewsCard 
                key={article.id} 
                article={article} 
                onClick={() => setSelectedArticle(article)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Trending News Component
const TrendingNews = ({ setSelectedArticle }) => {
  const [trendingNews, setTrendingNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrendingNews();
  }, []);

  const fetchTrendingNews = async () => {
    try {
      // Fetch news sorted by views (trending)
      const response = await fetch(`${API_BASE_URL}/news?pageLimit=20`);
      const data = await response.json();
      if (data.success) {
        // Sort by views to get trending
        const sorted = data.news.sort((a, b) => b.views - a.views);
        setTrendingNews(sorted);
      }
    } catch (error) {
      console.error('Error fetching trending news:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <div className="text-center mb-8">
        <div className="inline-flex items-center bg-orange-100 px-4 py-2 rounded-full mb-4">
          <TrendingUp className="w-5 h-5 text-orange-600 mr-2" />
          <span className="text-orange-700 font-bold">TRENDING</span>
        </div>
        <h2 className="text-3xl font-bold text-gray-900">Most Popular Stories</h2>
        <p className="text-gray-600 mt-2">See what everyone is reading and talking about</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {trendingNews.map((article, index) => (
          <div key={article.id} className="relative">
            <div className="absolute -top-2 -left-2 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold z-10">
              {index + 1}
            </div>
            <NewsCard 
              article={article} 
              onClick={() => setSelectedArticle(article)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

// Topic News Component  
const TopicNews = ({ topic, setSelectedArticle }) => {
  const [topicNews, setTopicNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (topic) {
      fetchTopicNews();
    }
  }, [topic]);

  const fetchTopicNews = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/news?topic=${encodeURIComponent(topic)}&pageLimit=20`);
      const data = await response.json();
      if (data.success) {
        setTopicNews(data.news);
      }
    } catch (error) {
      console.error('Error fetching topic news:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">{topic} News</h2>
        <p className="text-gray-600">Latest stories and updates about {topic}</p>
      </div>
      
      {topicNews.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Filter className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 text-lg">No news found for {topic}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {topicNews.map((article) => (
            <NewsCard 
              key={article.id} 
              article={article} 
              onClick={() => setSelectedArticle(article)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Article View Component (Full Article Display)
const ArticleView = ({ article, onBack }) => {
  return (
    <div className="max-w-4xl mx-auto">
      <button 
        onClick={onBack}
        className="mb-6 flex items-center text-blue-600 hover:text-blue-700 font-medium"
      >
        <ChevronRight className="w-4 h-4 mr-1 transform rotate-180" />
        Back to News
      </button>

      <article className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {article.image_url && (
          <div className="relative h-64 md:h-96">
            <img 
              src={article.image_url} 
              alt={article.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            <div className="absolute bottom-6 left-6">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${getPriorityStyle(article.priority)}`}>
                {article.priority.toUpperCase()}
              </span>
            </div>
          </div>
        )}

        <div className="p-8">
          <div className="flex items-center mb-6 text-sm text-gray-500">
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium mr-3">
              {article.topic}
            </span>
            {article.subject && (
              <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full font-medium mr-3">
                {article.subject}
              </span>
            )}
            <Clock className="w-4 h-4 mr-1" />
            {getTimeAgo(article.created_at)}
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 leading-tight">
            {article.title}
          </h1>

          <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-200">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mr-4">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{article.author}</p>
                <p className="text-gray-500 text-sm">
                  {new Date(article.created_at).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center text-gray-500">
                <Eye className="w-4 h-4 mr-1" />
                {article.views} views
              </div>
              <button className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                <Heart className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-400 hover:text-blue-500 transition-colors">
                <Share2 className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-400 hover:text-yellow-500 transition-colors">
                <Bookmark className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="prose prose-lg max-w-none">
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-lg">
              {article.content}
            </p>
          </div>

          {article.location && (
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center text-gray-600">
                <MapPin className="w-4 h-4 mr-2" />
                <span className="font-medium">Location: {article.location}</span>
              </div>
            </div>
          )}

          {article.news_source && (
            <div className="mt-4 text-sm text-gray-500">
              <span className="font-medium">Source: </span>
              {article.news_source}
            </div>
          )}

          {article.video_url && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center mr-2">
                  <span className="text-white text-xs">▶</span>
                </div>
                Watch Video
              </h3>
              <div className="bg-gray-100 rounded-lg p-4 text-center">
                <p className="text-gray-600">Video content available</p>
                <a 
                  href={article.video_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-block mt-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Watch Now
                </a>
              </div>
            </div>
          )}
        </div>
      </article>
    </div>
  );
};

// Loading Spinner Component
const LoadingSpinner = () => {
  return (
    <div className="flex justify-center items-center py-20">
      <div className="relative">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200"></div>
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent absolute top-0 left-0"></div>
      </div>
    </div>
  );
};

// Utility Functions
const getPriorityStyle = (priority) => {
  switch (priority) {
    case 'breaking':
      return 'bg-red-500 text-white shadow-lg';
    case 'high':
      return 'bg-orange-500 text-white';
    case 'normal':
      return 'bg-blue-500 text-white';
    case 'low':
      return 'bg-gray-500 text-white';
    default:
      return 'bg-gray-500 text-white';
  }
};

const getTimeAgo = (dateString) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInMs = now - date;
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) {
    return 'Just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  } else {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: now.getFullYear() !== date.getFullYear() ? 'numeric' : undefined
    });
  }
};

export default App;