import React, { useState, useEffect } from 'react';
import { useAuthContext } from "@asgardeo/auth-react";
import { Leaf, Menu, X, User, LogIn, LogOut, UserPlus, Search, Loader2 } from 'lucide-react';

const GlobalNavbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { state, signIn, signOut } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);
  const [actionType, setActionType] = useState(''); // Track which action is loading

  // Asgardeo configuration - replace with your actual values
  const ASGARDEO_CONFIG = {
    baseUrl: 'https://accounts.asgardeo.io/t/januda',
    clientId: 'bMlAv0RgJrJsqhOVKHfmvAeC8M0a',
    redirectUri: encodeURIComponent('http://localhost:5173/'),
    scope: 'openid profile address email groups phone roles'
  };

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isMobileMenuOpen]);

  // Generate PKCE parameters
  const generateCodeVerifier = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  };

  const generateCodeChallenge = async (verifier) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  };

  const generateState = () => {
    return 'state_' + Math.random().toString(36).substring(2, 15);
  };

  // Handle Login - Use Asgardeo signIn
  const handleLogin = async () => {
    setIsLoading(true);
    setActionType('login');
    try {
      // Store action type in sessionStorage to track intent
      sessionStorage.setItem('authAction', 'login');
      await signIn();
    } catch (error) {
      console.error('Login failed:', error);
      alert('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
      setActionType('');
    }
  };

  // Handle Sign Up - Redirect to Asgardeo registration with home redirect
  const handleSignUp = async () => {
    setIsLoading(true);
    setActionType('signup');
    
    try {
      // Store action type and intended redirect in sessionStorage
      sessionStorage.setItem('authAction', 'signup');
      sessionStorage.setItem('postAuthRedirect', '/home');
      
      // Update redirect URI to point to /home after registration
      const homeRedirectUri = encodeURIComponent(`${window.location.origin}/home`);
      
      // Use your existing registration URL but update the redirect_uri
      const registrationUrl = 'https://accounts.asgardeo.io/t/januda/accountrecoveryendpoint/register.do?client_id=bMlAv0RgJrJsqhOVKHfmvAeC8M0a&code_challenge=H_NEP0RjZ2TyqGPEeSE45y1Cm3PrawkrCqYJQ3gQmLo&code_challenge_method=S256&commonAuthCallerPath=%2Ft%2Fjanuda%2Foauth2%2Fauthorize&forceAuth=false&passiveAuth=false&redirect_uri=' + homeRedirectUri + '&response_mode=query&response_type=code&scope=openid+profile+address+email+groups+phone+roles&state=request_0&sessionDataKey=863b9ecf-d449-4f4f-919e-6dada9fa9e41&relyingParty=bMlAv0RgJrJsqhOVKHfmvAeC8M0a&type=oidc&sp=my+app1&spId=9cf06cfb-081d-444f-bfaf-648aaf24487e&isSaaSApp=false&authenticators=GoogleOIDCAuthenticator%3AGoogle%3BBasicAuthenticator%3ALOCAL&reCaptcha=true&callback=https%3A%2F%2Faccounts.asgardeo.io%2Ft%2Fjanuda%2Fauthenticationendpoint%2Flogin.do%3Fclient_id%3DbMlAv0RgJrJsqhOVKHfmvAeC8M0a%26code_challenge%3DH_NEP0RjZ2TyqGPEeSE45y1Cm3PrawkrCqYJQ3gQmLo%26code_challenge_method%3DS256%26commonAuthCallerPath%3D%2Ft%2Fjanuda%2Foauth2%2Fauthorize%26forceAuth%3Dfalse%26passiveAuth%3Dfalse%26redirect_uri%3D' + homeRedirectUri + '%26response_mode%3Dquery%26response_type%3Dcode%26scope%3Dopenid+profile+address+email+groups+phone+roles%26state%3Drequest_0%26sessionDataKey%3D863b9ecf-d449-4f4f-919e-6dada9fa9e41%26relyingParty%3DbMlAv0RgJrJsqhOVKHfmvAeC8M0a%26type%3Doidc%26sp%3Dmy+app1%26spId%3D9cf06cfb-081d-444f-bfaf-648aaf24487e%26isSaaSApp%3Dfalse%26authenticators%3DGoogleOIDCAuthenticator%3AGoogle%3BBasicAuthenticator%3ALOCAL%26reCaptcha%3Dtrue';
      
      // Redirect to registration page
      window.location.href = registrationUrl;
      
    } catch (error) {
      console.error('Sign up redirection failed:', error);
      alert('Sign up failed. Please try again.');
      setIsLoading(false);
      setActionType('');
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    setIsLoading(true);
    setActionType('logout');
    try {
      // Clear stored auth data
      sessionStorage.removeItem('authAction');
      sessionStorage.removeItem('pkce_code_verifier');
      sessionStorage.removeItem('auth_state');
      
      await signOut();
    } catch (error) {
      console.error('Logout failed:', error);
      alert('Logout failed. Please try again.');
    } finally {
      setIsLoading(false);
      setActionType('');
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      console.log('Searching for:', searchQuery);
      // Implement your search logic here
    }
  };

  const AuthButtons = () => {
    if (state.isAuthenticated) {
      return (
        <div className="hidden sm:flex items-center space-x-3">
          <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-300 ${
            isScrolled ? 'text-white/90 hover:bg-white/10' : 'text-gray-700 hover:bg-green-50'
          }`}>
            <User className="w-4 h-4" />
            <span className="hidden lg:inline text-sm">
              {state.username || state.displayName || 'User'}
            </span>
          </div>
          <button 
            onClick={handleLogout}
            disabled={isLoading && actionType === 'logout'}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 group ${
              isScrolled ? 'text-white hover:text-red-400 hover:bg-white/10' : 'text-gray-700 hover:text-red-600 hover:bg-red-50'
            } ${isLoading && actionType === 'logout' ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading && actionType === 'logout' ? 
              <Loader2 className="w-4 h-4 animate-spin" /> : 
              <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
            }
            <span className="hidden lg:inline">
              {isLoading && actionType === 'logout' ? 'Signing out...' : 'Logout'}
            </span>
          </button>
        </div>
      );
    }

    return (
      <div className="hidden sm:flex items-center space-x-3">
        <button 
          onClick={handleLogin}
          disabled={isLoading && actionType === 'login'}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 group ${
            isScrolled ? 'text-white hover:text-green-400 hover:bg-white/10' : 'text-gray-700 hover:text-green-600 hover:bg-green-50'
          } ${isLoading && actionType === 'login' ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isLoading && actionType === 'login' ? 
            <Loader2 className="w-4 h-4 animate-spin" /> : 
            <LogIn className="w-4 h-4 group-hover:scale-110 transition-transform" />
          }
          <span className="hidden lg:inline">
            {isLoading && actionType === 'login' ? 'Signing in...' : 'Login'}
          </span>
        </button>
        <button 
          onClick={handleSignUp}
          disabled={isLoading && actionType === 'signup'}
          className={`flex items-center space-x-2 px-4 lg:px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-full font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-xl ${
            isLoading && actionType === 'signup' ? 'opacity-50 cursor-not-allowed transform-none' : ''
          }`}
        >
          {isLoading && actionType === 'signup' ? 
            <Loader2 className="w-4 h-4 animate-spin" /> : 
            <UserPlus className="w-4 h-4" />
          }
          <span className="hidden lg:inline">
            {isLoading && actionType === 'signup' ? 'Redirecting...' : 'Sign Up'}
          </span>
        </button>
      </div>
    );
  };

  const MobileAuthButtons = () => {
    if (state.isAuthenticated) {
      return (
        <div className={`pt-4 border-t space-y-3 ${isScrolled ? 'border-white/10' : 'border-gray-200'}`}>
          <div className={`w-full flex items-center justify-center space-x-2 p-3 rounded-lg transition-all duration-300 ${
            isScrolled ? 'text-white/90' : 'text-gray-700'
          }`}>
            <User className="w-4 h-4" />
            <span>{state.username || state.displayName || 'User'}</span>
          </div>
          <button 
            onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
            disabled={isLoading && actionType === 'logout'}
            className={`w-full flex items-center justify-center space-x-2 p-3 rounded-lg transition-all duration-300 ${
              isScrolled ? 'text-white hover:text-red-400 hover:bg-white/10' : 'text-gray-700 hover:text-red-600 hover:bg-red-50'
            } ${isLoading && actionType === 'logout' ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading && actionType === 'logout' ? 
              <Loader2 className="w-4 h-4 animate-spin" /> : 
              <LogOut className="w-4 h-4" />
            }
            <span>Logout</span>
          </button>
        </div>
      );
    }

    return (
      <div className={`pt-4 border-t space-y-3 ${isScrolled ? 'border-white/10' : 'border-gray-200'}`}>
        <button 
          onClick={() => { handleLogin(); setIsMobileMenuOpen(false); }}
          disabled={isLoading && actionType === 'login'}
          className={`w-full flex items-center justify-center space-x-2 p-3 rounded-lg transition-all duration-300 ${
            isScrolled ? 'text-white hover:text-green-400 hover:bg-white/10' : 'text-gray-700 hover:text-green-600 hover:bg-green-50'
          } ${isLoading && actionType === 'login' ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isLoading && actionType === 'login' ? 
            <Loader2 className="w-4 h-4 animate-spin" /> : 
            <LogIn className="w-4 h-4" />
          }
          <span>Login</span>
        </button>
        <button 
          onClick={() => { handleSignUp(); setIsMobileMenuOpen(false); }}
          disabled={isLoading && actionType === 'signup'}
          className={`w-full flex items-center justify-center space-x-2 p-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full font-semibold transition-all duration-300 hover:from-green-600 hover:to-emerald-700 ${
            isLoading && actionType === 'signup' ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isLoading && actionType === 'signup' ? 
            <Loader2 className="w-4 h-4 animate-spin" /> : 
            <UserPlus className="w-4 h-4" />
          }
          <span>Sign Up</span>
        </button>
      </div>
    );
  };

  return (
    <>
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled ? 'bg-black/80 backdrop-blur-xl border-b border-white/10 shadow-2xl' : 'bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-lg'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 sm:h-20">
            
            {/* Logo */}
            <div className="flex items-center space-x-2 group cursor-pointer flex-shrink-0">
              <div className={`p-2 rounded-full transition-all duration-300 ${
                isScrolled ? 'bg-green-500/20 group-hover:bg-green-500/30' : 'bg-green-100 group-hover:bg-green-200'
              }`}>
                <Leaf className={`w-5 h-5 sm:w-6 sm:h-6 group-hover:rotate-12 transition-transform duration-300 ${
                  isScrolled ? 'text-green-400' : 'text-green-600'
                }`} />
              </div>
              <span className="text-lg sm:text-xl font-bold whitespace-nowrap">
                <span className={`${isScrolled ? 'text-green-400' : 'text-green-600'}`}>Eco</span>
                <span className={`${isScrolled ? 'text-lime-300' : 'text-lime-600'}`}>Green</span>
                <span className={`${isScrolled ? 'text-cyan-400' : 'text-cyan-600'}`}>360</span>
              </span>
            </div>

            {/* Search Bar */}
            <div className="hidden md:flex items-center flex-1 max-w-sm lg:max-w-md mx-4 lg:mx-8">
              <div className={`relative w-full transition-all duration-300 ${
                isSearchFocused ? 'transform scale-105' : ''
              }`}>
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 transition-colors ${
                  isScrolled ? 'text-gray-400' : 'text-gray-500'
                } ${isSearchFocused ? 'text-green-500' : ''}`} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search climate solutions..."
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
                  className={`w-full pl-10 pr-4 py-2.5 border rounded-full transition-all duration-300 focus:outline-none focus:ring-2 ${
                    isScrolled ? 'bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder-gray-400 focus:border-green-400/50 focus:bg-white/20 focus:ring-green-400/20' : 'bg-gray-50 border-gray-300 text-gray-700 placeholder-gray-500 focus:border-green-500 focus:bg-white focus:ring-green-500/20'
                  }`}
                />
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              <AuthButtons />
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={`lg:hidden p-2 rounded-lg transition-all duration-300 ${
                  isScrolled ? 'text-white hover:text-green-400 hover:bg-white/10' : 'text-gray-700 hover:text-green-600 hover:bg-green-50'
                }`}
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <div className={`lg:hidden transition-all duration-300 border-t ${
          isMobileMenuOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
        } ${isScrolled ? 'bg-black/95 backdrop-blur-xl border-white/10' : 'bg-white border-gray-200'}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
            
            {/* Mobile Search */}
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                isScrolled ? 'text-gray-400' : 'text-gray-500'
              }`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search climate solutions..."
                onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
                className={`w-full pl-10 pr-4 py-3 border rounded-full focus:outline-none focus:ring-2 ${
                  isScrolled ? 'bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder-gray-400 focus:border-green-400/50 focus:ring-green-400/20' : 'bg-gray-50 border-gray-300 text-gray-700 placeholder-gray-500 focus:border-green-500 focus:ring-green-500/20'
                }`}
              />
            </div>

            <MobileAuthButtons />
          </div>
        </div>
      </nav>
    </>
  );
};

export default GlobalNavbar;