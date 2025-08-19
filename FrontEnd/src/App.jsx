import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import './App.css';
import { AuthProvider, useAuthContext } from "@asgardeo/auth-react";
import ContactForm from './components/contact.jsx';

import Home1 from './components/Home1.jsx';
import Home from './components/home';
import Navbar from './components/navbar';
import Footer from './components/footer';
import Deployment from './components/deployment';
import Membership from './components/membership';
import Greenhouse from './components/greenhouse';
import Diagnosis from './components/diagnosis';
import AdminAlert from './components/Admin/adminalert.jsx';
import Login from './components/login';
import Mas from './components/mas';
import TreePlantingPage from './components/tree planting';
import Navbar1 from './components/navbar1.jsx';
import Nav2 from './components/nav2.jsx';
import services from './components/services.jsx';
import Fetchesdata from './components/fetchesdata.jsx';
import Mailsub from './components/Admin/mailsub.jsx';
import Community from './components/community.jsx';
import Diagnosisadmin from'./components/Admin/diagnosisadmin.jsx';
import Blog from './components/blog.jsx'
import Job from './components/Admin/job.jsx'
import Job1 from './components/job1.jsx'
import Newsapi from './components/newsapi.jsx'
import Solution from './components/solution.jsx'
import Admin from './components/Admin/admin.jsx'
import Newsadmin from './components/Admin/newsadmin.jsx'
import Shedule from './components/shedule.jsx'
import MeetShedule from './components/meetshedule.jsx'
import Form from'./components/Admin/form.jsx'
import About from './components/about.jsx'

// Import the Chatbot component
import Chatbot from './components/Chatbot.jsx';

// Import icons for loader animation
import { 
  Leaf, 
  Zap, 
  Globe, 
  Star, 
  TrendingUp, 
  User as UserIcon,
  Loader2,
  Plus,
  Lock,
  AlertCircle
} from 'lucide-react';

// Asgardeo Auth Configuration
const authConfig = {
  signInRedirectURL: "http://localhost:5173/",
  signOutRedirectURL: "http://localhost:5173/",
  clientID: "bMlAv0RgJrJsqhOVKHfmvAeC8M0a",
  baseUrl: "https://api.asgardeo.io/t/januda",
  scope: [
    "openid",
    "profile",
    "address",
    "email",
    "groups",
    "phone",
    "roles",
  ],
};

// Protected Route Component
const ProtectedRoute = ({ children, redirectTo = "/" }) => {
  const { state, signIn } = useAuthContext();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!state.isLoading && !state.isAuthenticated) {
      setShowLoginPrompt(true);
    }
  }, [state.isLoading, state.isAuthenticated]);

  // Show loading while auth state is being determined
  if (state.isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-green-900 via-emerald-800 to-cyan-900">
        <div className="text-center space-y-6 relative z-10">
          <div className="flex items-center justify-center space-x-3 mb-8">
            <div className="p-3 bg-green-500/20 rounded-full backdrop-blur-sm animate-pulse">
              <Leaf className="w-8 h-8 text-green-400 animate-bounce" />
            </div>
            <div className="text-3xl font-bold">
              <span className="text-green-400">Eco</span>
              <span className="text-lime-300">Green</span>
              <span className="text-cyan-400">360</span>
            </div>
          </div>
          <h2 className="text-2xl font-semibold text-white animate-pulse">
            Checking authentication...
          </h2>
          <div className="flex justify-center mt-6">
            <Loader2 className="w-6 h-6 text-green-400 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!state.isAuthenticated && showLoginPrompt) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="bg-white rounded-lg p-8 max-w-md mx-4 shadow-2xl">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="p-3 bg-red-100 rounded-full">
                <Lock className="w-8 h-8 text-red-500" />
              </div>
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Authentication Required
              </h2>
              <p className="text-gray-600">
                You need to be logged in to access this page. Please sign in to continue.
              </p>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => signIn()}
                className="flex-1 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate(redirectTo)}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If authenticated, render the protected content
  if (state.isAuthenticated) {
    return children;
  }

  // Fallback - redirect to home
  return <Navigate to={redirectTo} replace />;
};

// EcoGreen360 Loader Component
const EcoLoader = ({ isLoading }) => {
  const [currentIcon, setCurrentIcon] = useState(0);
  const [loadingText, setLoadingText] = useState('Initializing...');

  const icons = [
    { Icon: Leaf, color: 'text-green-400', name: 'Climate Solutions' },
    { Icon: Zap, color: 'text-yellow-400', name: 'Clean Energy' },
    { Icon: Globe, color: 'text-blue-400', name: 'Global Impact' },
    { Icon: Star, color: 'text-purple-400', name: 'Innovation' },
    { Icon: TrendingUp, color: 'text-emerald-400', name: 'Growth' },
    { Icon: UserIcon, color: 'text-cyan-400', name: 'Community' }
  ];

  const loadingSteps = [
    'Initializing EcoGreen360...',
    'Loading Climate Solutions...',
    'Connecting to Green Network...',
    'Preparing Your Dashboard...',
    'Almost Ready!'
  ];

  useEffect(() => {
    if (!isLoading) return;

    const iconInterval = setInterval(() => {
      setCurrentIcon((prev) => (prev + 1) % icons.length);
    }, 600);

    const textInterval = setInterval(() => {
      setLoadingText((prev) => {
        const currentIndex = loadingSteps.indexOf(prev);
        const nextIndex = (currentIndex + 1) % loadingSteps.length;
        return loadingSteps[nextIndex];
      });
    }, 1200);

    return () => {
      clearInterval(iconInterval);
      clearInterval(textInterval);
    };
  }, [isLoading]);

  if (!isLoading) return null;

  const CurrentIcon = icons[currentIcon].Icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-green-900 via-emerald-800 to-cyan-900">
      {/* Animated Background Particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-green-400/20 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`
            }}
          />
        ))}
      </div>

      {/* Main Loader Content */}
      <div className="text-center space-y-8 relative z-10">
        
        {/* Logo Section */}
        <div className="flex items-center justify-center space-x-3 mb-8">
          <div className="p-3 bg-green-500/20 rounded-full backdrop-blur-sm animate-pulse">
            <Leaf className="w-8 h-8 text-green-400 animate-bounce" />
          </div>
          <div className="text-3xl font-bold">
            <span className="text-green-400">Eco</span>
            <span className="text-lime-300">Green</span>
            <span className="text-cyan-400">360</span>
          </div>
        </div>

        {/* Main Loading Icon */}
        <div className="relative">
          {/* Rotating Ring */}
          <div className="w-32 h-32 mx-auto relative">
            <div className="absolute inset-0 border-4 border-white/10 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-transparent border-t-green-400 rounded-full animate-spin"></div>
            
            {/* Center Icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={`p-4 bg-black/20 rounded-full backdrop-blur-sm transition-all duration-500 ${icons[currentIcon].color}`}>
                <CurrentIcon className="w-12 h-12 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Orbiting Icons */}
          <div className="absolute inset-0 animate-spin" style={{ animationDuration: '8s' }}>
            {icons.map((icon, index) => {
              const Icon = icon.Icon;
              const angle = (index * 60) * (Math.PI / 180);
              const radius = 80;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              
              return (
                <div
                  key={index}
                  className="absolute w-8 h-8 flex items-center justify-center"
                  style={{
                    left: '50%',
                    top: '50%',
                    transform: `translate(${x - 16}px, ${y - 16}px)`
                  }}
                >
                  <div className={`p-1 bg-black/20 rounded-full backdrop-blur-sm ${icon.color} opacity-60 hover:opacity-100 transition-opacity`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Loading Text */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-white animate-pulse">
            {loadingText}
          </h2>
          
          {/* Progress Bar */}
          <div className="w-64 mx-auto bg-white/10 rounded-full h-2 backdrop-blur-sm">
            <div className="bg-gradient-to-r from-green-400 via-emerald-500 to-cyan-400 h-2 rounded-full animate-pulse" 
                 style={{ width: '70%' }}></div>
          </div>

          {/* Feature Preview */}
          <div className="mt-8 text-sm text-white/80 space-y-2">
            <p>🌱 Climate-focused solutions</p>
            <p>⚡ Real-time environmental data</p>
            <p>🌍 Global sustainability network</p>
          </div>
        </div>

        {/* Loading Spinner */}
        <div className="flex justify-center mt-6">
          <Loader2 className="w-6 h-6 text-green-400 animate-spin" />
        </div>
      </div>

      {/* Bottom Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/20 to-transparent"></div>
    </div>
  );
};

// Home1 Page Component with ContactForm (Public - No Authentication Required)
const Home1Page = () => {
  return (
    <div>
      <Home1 />
      <ContactForm />
    </div>
  );
};

// Public Home Component (accessible without authentication)
const PublicHome = () => {
  const { state, signIn } = useAuthContext();
  const navigate = useNavigate();

  // If user is authenticated, redirect to authenticated home
  useEffect(() => {
    if (state.isAuthenticated) {
      navigate('/home', { replace: true });
    }
  }, [state.isAuthenticated, navigate]);

  return <Home1Page />;
};

const AuthenticatedCreateButton = ({ 
  buttonText = "Create New Project", 
  onCreateAction, 
  className = "",
  requireAuth = true 
}) => {
  const { state, signIn } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateClick = async () => {
    if (requireAuth && !state.isAuthenticated) {
      const shouldLogin = window.confirm(
        "You need to be logged in to create a project. Would you like to login now?"
      );
      
      if (shouldLogin) {
        setIsLoading(true);
        try {
          await signIn();
        } catch (error) {
          console.error("Login failed:", error);
          alert("Login failed. Please try again.");
        } finally {
          setIsLoading(false);
        }
      }
      return;
    }

    if (onCreateAction) {
      setIsLoading(true);
      try {
        await onCreateAction();    
      } catch (error) {
        console.error("Create action failed:", error);
        alert("Action failed. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <button
      onClick={handleCreateClick}
      disabled={isLoading}
      className={`
        inline-flex items-center px-6 py-3 rounded-lg font-medium transition-all duration-200
        ${state.isAuthenticated 
          ? 'bg-green-500 hover:bg-green-600 text-white shadow-lg hover:shadow-xl' 
          : 'bg-gray-500 hover:bg-gray-600 text-white shadow-lg hover:shadow-xl'
        }
        ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
        ${className}
      `}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          {state.isAuthenticated ? (
            <Plus className="w-5 h-5 mr-2" />
          ) : (
            <Lock className="w-5 h-5 mr-2" />
          )}
          {state.isAuthenticated ? buttonText : 'Login to Create'}
        </>
      )}
    </button>
  );
};

// Authenticated Home Page Component
const AuthenticatedHomePage = () => {
  const { state } = useAuthContext();
  const navigate = useNavigate();

  const handleCreateProject = async () => {
    console.log("Creating new project for user:", state.username);
    navigate('/TreePlantingPage');
  };

  return (
    <div>
      <Home />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Welcome back, {state.username || 'User'}!
          </h2>
          <p className="text-gray-600 mb-8">
            Continue your green journey and make a positive environmental impact
          </p>
          
          <AuthenticatedCreateButton
            buttonText="Create New Project"
            onCreateAction={handleCreateProject}
            className="mr-4"
          />
          
          <AuthenticatedCreateButton
            buttonText="Start Campaign"
            onCreateAction={() => console.log("Starting campaign...")}
            className="bg-blue-500 hover:bg-blue-600"
          />
        </div>
      </div>
      
      <Deployment />
      <Membership />
      <ContactForm />
    </div>
  );
};

// Layout component that conditionally includes the navbar and chatbot
const Layout = ({ children, showNavbar = true, navbarType = 'default', showChatbot = true }) => {
  const { state } = useAuthContext();
  
  let CurrentNavbar;
  if (navbarType === 'nav2') {
    CurrentNavbar = Nav2;
  } else if (state.isAuthenticated) {
    CurrentNavbar = Navbar1;
  } else {
    CurrentNavbar = Navbar;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {showNavbar && <CurrentNavbar />}
      <main className={`flex-grow ${showNavbar ? 'pt-16' : ''}`}>
        {children}
      </main>
      <Footer />
      
      {/* Global Chatbot - Available on all pages */}
      {showChatbot && <Chatbot />}
    </div>
  );
};

// Main App Content Component
const AppContent = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { state } = useAuthContext();

  useEffect(() => {
    const loadingTimer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);

    return () => clearTimeout(loadingTimer);
  }, []);

  useEffect(() => {
    if (state.isLoading) {
      setIsLoading(true);
    }
  }, [state.isLoading]);

  return (
    <Router>
      <EcoLoader isLoading={isLoading} />
      
      {!isLoading && (
        <Routes>
          {/* Public route - accessible without authentication */}
          <Route path="/" element={
            <Layout showNavbar={true} navbarType="nav2" showChatbot={true}>
              <PublicHome />
            </Layout>
          } />
          
          {/* All other routes require authentication */}
          <Route path="/home" element={
            <ProtectedRoute>
              <Layout showChatbot={true}>
                <AuthenticatedHomePage />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/greenhouse" element={
            <ProtectedRoute>
              <Layout showChatbot={true}>
                <Greenhouse />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/TreePlantingPage" element={
            <ProtectedRoute>
              <Layout showChatbot={true}>
                <TreePlantingPage />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/diagnosis" element={
            <ProtectedRoute>
              <Layout showChatbot={true}>
                <Diagnosis />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/AdminAlert" element={
            <ProtectedRoute>
              <Layout showChatbot={true}>
                <AdminAlert />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/login" element={
            <ProtectedRoute>
              <Layout showChatbot={true}>
                <Login />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/mas" element={
            <ProtectedRoute>
              <Layout showChatbot={true}>
                <Mas />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/fetchesdata" element={
            <ProtectedRoute>
              <Layout showChatbot={true}>
                <Fetchesdata />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/mailsub" element={
            <ProtectedRoute>
              <Layout showChatbot={true}>
                <Mailsub />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/community" element={
            <ProtectedRoute>
              <Layout showChatbot={true}>
                <Community />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/diagnosisadmin" element={
            <ProtectedRoute>
              <Layout showChatbot={true}>
                <Diagnosisadmin />
              </Layout>
            </ProtectedRoute>
          } />

           <Route path="/blog" element={
            <ProtectedRoute>
              <Layout showChatbot={true}>
                <Blog />
              </Layout>
            </ProtectedRoute>
          } />

           <Route path="/job" element={
            <ProtectedRoute>
              <Layout showChatbot={true}>
                <Job />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/job1" element={
            <ProtectedRoute>
              <Layout showChatbot={true}>
                <Job1 />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/newsapi" element={
            <ProtectedRoute>
              <Layout showChatbot={true}>
                <Newsapi />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/solution" element={
            <ProtectedRoute>
              <Layout showChatbot={true}>
                <Solution />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/newsadmin" element={
            <ProtectedRoute>
              <Layout showChatbot={true}>
                <Newsadmin />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/shedule" element={
            <ProtectedRoute>
              <Layout showChatbot={true}>
                <Shedule />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/meetshedule" element={
            <ProtectedRoute>
              <Layout showChatbot={true}>
                <MeetShedule />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/form" element={
            <ProtectedRoute>
              <Layout showChatbot={true}>
                <Form />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/about" element={
            <ProtectedRoute>
              <Layout showChatbot={true}>
                <About />
              </Layout>
            </ProtectedRoute>
          } />



          <Route path="/admin" element={
            <ProtectedRoute>
              <Layout showChatbot={true}>
                <Admin />
              </Layout>
            </ProtectedRoute>
          } />

          {/* Redirect any unknown routes to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </Router>
  );
};

// Main App Component with AuthProvider
function App() {
  return (
    <AuthProvider config={authConfig}>
      <AppContent />
    </AuthProvider>
  );
}

export default App;