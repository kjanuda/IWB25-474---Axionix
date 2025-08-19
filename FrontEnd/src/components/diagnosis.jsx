import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Upload, Send, Volume2, VolumeX, Leaf, MessageSquare, Image, Play, Pause, Square, Sparkles, Brain, Zap, Camera, FileText, Trash2, RotateCcw, AlertCircle, CheckCircle, Wifi, WifiOff } from 'lucide-react';

const AgriProblemSolver = () => {
  const [inputType, setInputType] = useState('text');
  const [textInput, setTextInput] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlayingAudio, setCurrentPlayingAudio] = useState(null);
  const [isPlayingRecording, setIsPlayingRecording] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [error, setError] = useState(null);
  const [showDataViewer, setShowDataViewer] = useState(false);
  const [s3Data, setS3Data] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const fileInputRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const audioElementRef = useRef(null);
  const recordingAudioRef = useRef(null);

  // Initialize speech recognition
  const [recognition, setRecognition] = useState(null);

  useEffect(() => {
    // Check backend connection on startup
    checkBackendConnection();
    
    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'en-US';
      
      recognitionInstance.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setTextInput(transcript);
        setError(null);
      };
      
      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setError('Speech recognition failed: ' + event.error);
      };
      
      setRecognition(recognitionInstance);
    }
  }, []);

  const checkBackendConnection = async () => {
    try {
      const response = await fetch('http://localhost:8082/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const healthData = await response.json();
        setConnectionStatus('connected');
        console.log('Backend connected:', healthData);
      } else {
        setConnectionStatus('disconnected');
        setError('Backend server not responding properly');
      }
    } catch (error) {
      setConnectionStatus('disconnected');
      setError('Cannot connect to backend server. Please ensure it\'s running on port 8082.');
      console.error('Backend connection error:', error);
    }
  };

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
          ? 'audio/webm;codecs=opus' 
          : 'audio/webm'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: 'audio/webm' 
        });
        setAudioBlob(audioBlob);
        
        // Create URL for playback
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        
        console.log('Recording stopped. Blob size:', audioBlob.size, 'URL created:', url);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
        }
        setRecordingTime(0);
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      setError('Could not access microphone. Please check permissions and try again.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const playRecording = () => {
    if (audioUrl && !isPlayingRecording) {
      setError(null);
      
      // Stop any existing audio
      if (recordingAudioRef.current) {
        recordingAudioRef.current.pause();
        recordingAudioRef.current = null;
      }
      
      // Create new audio element
      const audio = new Audio(audioUrl);
      recordingAudioRef.current = audio;
      
      // Set up event listeners
      audio.onplay = () => {
        console.log('Audio started playing');
        setIsPlayingRecording(true);
      };
      
      audio.onended = () => {
        console.log('Audio ended');
        setIsPlayingRecording(false);
      };
      
      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        console.error('Audio error details:', audio.error);
        setIsPlayingRecording(false);
        setError('Could not play recording. Error: ' + (audio.error?.message || 'Unknown error'));
      };
      
      audio.onpause = () => {
        console.log('Audio paused');
        setIsPlayingRecording(false);
      };
      
      // Try to play
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('Audio playback started successfully');
          })
          .catch(error => {
            console.error('Error playing audio:', error);
            setIsPlayingRecording(false);
            
            if (error.name === 'NotAllowedError') {
              setError('Audio playback was blocked. Please ensure you have given permission for audio playback.');
            } else if (error.name === 'NotSupportedError') {
              setError('This audio format is not supported. Please try recording again.');
            } else {
              setError('Could not play recording: ' + error.message);
            }
          });
      }
    } else if (isPlayingRecording && recordingAudioRef.current) {
      // Pause current playback
      recordingAudioRef.current.pause();
      setIsPlayingRecording(false);
    }
  };

  const deleteRecording = () => {
    if (recordingAudioRef.current) {
      recordingAudioRef.current.pause();
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setIsPlayingRecording(false);
    setError(null);
  };

  const startSpeechRecognition = () => {
    if (recognition) {
      try {
        setError(null);
        recognition.start();
      } catch (error) {
        console.error('Speech recognition start error:', error);
        setError('Speech recognition is already running or not available');
      }
    } else {
      setError('Speech recognition not supported in this browser');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setError(null);
      
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        return;
      }

      setSelectedImage(file);
      
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.onerror = () => setError('Failed to read image file');
      reader.readAsDataURL(file);
    }
  };

  const speakText = (text, messageId) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      
      if (isPlaying && currentPlayingAudio === messageId) {
        setIsPlaying(false);
        setCurrentPlayingAudio(null);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      utterance.pitch = 1;
      utterance.volume = 1;
      utterance.lang = 'en-US';
      
      utterance.onstart = () => {
        setIsPlaying(true);
        setCurrentPlayingAudio(messageId);
      };
      
      utterance.onend = () => {
        setIsPlaying(false);
        setCurrentPlayingAudio(null);
      };
      
      utterance.onerror = (e) => {
        console.error('Speech synthesis error:', e);
        setIsPlaying(false);
        setCurrentPlayingAudio(null);
        setError('Text-to-speech failed');
      };
      
      window.speechSynthesis.speak(utterance);
    } else {
      setError('Text-to-speech not supported in this browser');
    }
  };

  const submitProblem = async () => {
    if (!textInput.trim() && !selectedImage && !audioBlob) {
      setError('Please provide a problem description, image, or voice recording');
      return;
    }

    if (connectionStatus === 'disconnected') {
      setError('Cannot submit: Backend server is not connected');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      
      if (textInput.trim()) {
        formData.append('text', textInput.trim());
      }
      
      if (selectedImage) {
        formData.append('image', selectedImage);
      }
      
      if (audioBlob) {
        formData.append('audio', audioBlob, 'recording.webm');
      }
      
      formData.append('inputType', inputType);

      console.log('Submitting to backend with:', {
        hasText: !!textInput.trim(),
        hasImage: !!selectedImage,
        hasAudio: !!audioBlob,
        inputType
      });

      const response = await fetch('http://localhost:8082/solve-problem', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (response.ok) {
        const newMessage = {
          id: Date.now(),
          type: 'user',
          content: textInput || 'Media content uploaded for AI analysis',
          timestamp: new Date().toLocaleTimeString(),
          hasImage: !!selectedImage,
          hasAudio: !!audioBlob,
          inputType,
          contentSummary: `${textInput ? 'Text' : ''}${textInput && (selectedImage || audioBlob) ? ' + ' : ''}${selectedImage ? 'Image' : ''}${selectedImage && audioBlob ? ' + ' : ''}${audioBlob ? 'Audio' : ''} Analysis`
        };

        const aiResponse = {
          id: Date.now() + 1,
          type: 'ai',
          content: result.solution,
          timestamp: new Date().toLocaleTimeString(),
          confidence: result.confidence || 0.85,
          s3Storage: result.s3Storage,
          sessionId: result.sessionId,
          analyzedContent: {
            hasText: !!textInput.trim(),
            hasImage: !!selectedImage,
            hasAudio: !!audioBlob,
            multimodal: !!(selectedImage || audioBlob)
          }
        };

        setConversation(prev => [...prev, newMessage, aiResponse]);
        
        // Auto-play AI response after a short delay
        if (result.solution) {
          setTimeout(() => {
            speakText(result.solution, aiResponse.id);
          }, 500);
        }
        
        // Clear inputs
        setTextInput('');
        setSelectedImage(null);
        setImagePreview(null);
        deleteRecording();
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

        console.log('Solution received and stored:', result);
        setError(null); // Clear any previous errors on success
      } else {
        setError(result.error || 'Failed to process your problem');
        console.error('Backend error:', result);
      }
    } catch (error) {
      console.error('Error submitting problem:', error);
      setError('Network error. Please check if the backend server is running on port 8082.');
      setConnectionStatus('disconnected');
    } finally {
      setIsLoading(false);
    }
  };

  const clearConversation = () => {
    setConversation([]);
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setCurrentPlayingAudio(null);
    setError(null);
  };

  const dismissError = () => {
    setError(null);
  };

  // Functions to test GET endpoints
  const testGetEndpoints = async () => {
    setIsLoadingData(true);
    setError(null);
    
    try {
      const endpoints = [
        { name: 'Health Check', url: 'http://localhost:8082/health' },
        { name: 'List All Solutions', url: 'http://localhost:8082/solutions' },
        { name: 'Analytics', url: 'http://localhost:8082/analytics' },
        { name: 'List Text Files', url: 'http://localhost:8082/s3/text' },
        { name: 'List Image Files', url: 'http://localhost:8082/s3/image' },
        { name: 'List Audio Files', url: 'http://localhost:8082/s3/audio' }
      ];
      
      const results = {};
      
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint.url);
          const data = await response.json();
          results[endpoint.name] = {
            status: response.status,
            data: data
          };
        } catch (err) {
          results[endpoint.name] = {
            status: 'error',
            error: err.message
          };
        }
      }
      
      setS3Data(results);
      setShowDataViewer(true);
      
    } catch (error) {
      setError('Failed to test endpoints: ' + error.message);
    } finally {
      setIsLoadingData(false);
    }
  };

  const getSpecificSolution = async (sessionId) => {
    if (!sessionId.trim()) {
      setError('Please enter a session ID');
      return;
    }
    
    setIsLoadingData(true);
    
    try {
      const response = await fetch(`http://localhost:8082/solutions/${sessionId}`);
      const data = await response.json();
      
      setS3Data({
        'Specific Solution': {
          status: response.status,
          data: data
        }
      });
      setShowDataViewer(true);
      
    } catch (error) {
      setError('Failed to get solution: ' + error.message);
    } finally {
      setIsLoadingData(false);
    }
  };

  const searchSolutions = async (searchTerm) => {
    if (!searchTerm.trim()) {
      setError('Please enter a search term');
      return;
    }
    
    setIsLoadingData(true);
    
    try {
      const response = await fetch(`http://localhost:8082/solutions/search/${encodeURIComponent(searchTerm)}`);
      const data = await response.json();
      
      setS3Data({
        'Search Results': {
          status: response.status,
          data: data
        }
      });
      setShowDataViewer(true);
      
    } catch (error) {
      setError('Failed to search solutions: ' + error.message);
    } finally {
      setIsLoadingData(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      <div className="container mx-auto px-6 py-8">
        
        {/* Connection Status and Error Display */}
        {(connectionStatus === 'disconnected' || error) && (
          <div className="mb-6">
            {connectionStatus === 'disconnected' && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-3">
                <WifiOff className="h-5 w-5 text-red-500" />
                <div className="flex-1">
                  <p className="text-red-700 font-medium">Backend Disconnected</p>
                  <p className="text-red-600 text-sm">Please ensure the Ballerina backend is running on port 8082</p>
                </div>
                <button 
                  onClick={checkBackendConnection}
                  className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm"
                >
                  Retry
                </button>
              </div>
            )}
            
            {error && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center space-x-3 mt-3">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <div className="flex-1">
                  <p className="text-yellow-700 font-medium">Notice</p>
                  <p className="text-yellow-600 text-sm">{error}</p>
                </div>
                <button 
                  onClick={dismissError}
                  className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 text-sm"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* Enhanced Input Panel */}
          <div className="xl:col-span-1 space-y-6">
            
            {/* Connection Status Indicator */}
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-white/20 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${connectionStatus === 'connected' ? 'bg-green-100' : 'bg-red-100'}`}>
                    {connectionStatus === 'connected' ? (
                      <Wifi className="h-4 w-4 text-green-600" />
                    ) : (
                      <WifiOff className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">Backend Status</p>
                    <p className={`text-xs ${connectionStatus === 'connected' ? 'text-green-600' : 'text-red-600'}`}>
                      {connectionStatus === 'connected' ? 'Connected to port 8082' : 'Disconnected'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={checkBackendConnection}
                  className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                >
                  Check
                </button>
              </div>
            </div>

            {/* Input Type Selector */}
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-xl">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                <Sparkles className="h-6 w-6 mr-2 text-emerald-500" />
                Input Method
              </h2>
              
              <div className="grid grid-cols-3 gap-3">
                {[
                  { type: 'text', icon: FileText, label: 'Text', gradient: 'from-blue-500 to-indigo-600' },
                  { type: 'image', icon: Camera, label: 'Image', gradient: 'from-purple-500 to-pink-600' },
                  { type: 'voice', icon: Mic, label: 'Voice', gradient: 'from-emerald-500 to-teal-600' }
                ].map(({ type, icon: Icon, label, gradient }) => (
                  <button
                    key={type}
                    onClick={() => setInputType(type)}
                    className={`relative group p-4 rounded-xl transition-all duration-300 transform hover:scale-105 ${
                      inputType === type 
                        ? `bg-gradient-to-r ${gradient} text-white shadow-lg` 
                        : 'bg-white/40 text-gray-700 hover:bg-white/60 border border-gray-200'
                    }`}
                  >
                    <Icon className={`h-6 w-6 mx-auto mb-2 ${inputType === type ? 'text-white' : 'text-gray-600'}`} />
                    <span className="text-sm font-medium block">{label}</span>
                    {inputType === type && (
                      <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-xl"></div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Text Input Card */}
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Problem Description</h3>
                <button
                  onClick={startSpeechRecognition}
                  className="flex items-center space-x-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                  disabled={isRecording}
                >
                  <Mic className="h-4 w-4" />
                  <span>Speech to Text</span>
                </button>
              </div>
              
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Describe your agricultural challenge in detail..."
                className="w-full p-4 border-0 bg-white/50 rounded-xl focus:ring-2 focus:ring-emerald-400 focus:bg-white/70 resize-none transition-all placeholder-gray-500"
                rows="4"
              />
              
              <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
                <span>{textInput.length} characters</span>
                <span className="flex items-center space-x-1">
                  <Zap className="h-4 w-4 text-emerald-500" />
                  <span>AI Ready</span>
                </span>
              </div>
            </div>

            {/* Image Upload Card */}
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Visual Evidence</h3>
              
              <div 
                className="relative border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-emerald-400 transition-colors cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                
                <div className="space-y-3">
                  <div className="mx-auto w-12 h-12 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-gray-700 font-medium">Drop image here or click to upload</p>
                    <p className="text-sm text-gray-500">JPG, PNG, GIF up to 5MB</p>
                  </div>
                </div>
                
                {imagePreview && (
                  <div className="mt-4 relative">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImage(null);
                        setImagePreview(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Voice Recording Card */}
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Voice Recording</h3>
              
              <div className="space-y-4">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isLoading}
                  className={`w-full py-4 px-6 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center space-x-3 ${
                    isRecording
                      ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white animate-pulse'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 transform hover:scale-105'
                  }`}
                >
                  {isRecording ? (
                    <>
                      <Square className="h-5 w-5" />
                      <span>Stop Recording ({formatTime(recordingTime)})</span>
                    </>
                  ) : (
                    <>
                      <Mic className="h-5 w-5" />
                      <span>Start Recording</span>
                    </>
                  )}
                </button>

                {audioBlob && (
                  <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={playRecording}
                          className="p-2 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition-colors"
                        >
                          {isPlayingRecording ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </button>
                        <div>
                          <p className="text-sm font-medium text-emerald-700">
                            {isPlayingRecording ? 'Playing recording...' : 'Recording ready'}
                          </p>
                          <p className="text-xs text-emerald-600">
                            Size: {Math.round(audioBlob.size / 1024)}KB - Click to preview
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1">
                          {[...Array(5)].map((_, i) => (
                            <div
                              key={i}
                              className={`w-1 bg-emerald-400 rounded-full transition-all ${
                                isPlayingRecording ? 'h-4 animate-pulse' : 'h-2'
                              }`}
                              style={{
                                animationDelay: `${i * 0.1}s`
                              }}
                            ></div>
                          ))}
                        </div>
                        <button
                          onClick={deleteRecording}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Enhanced Submit Button */}
            <button
              onClick={submitProblem}
              disabled={isLoading || isRecording || (!textInput.trim() && !selectedImage && !audioBlob) || connectionStatus === 'disconnected'}
              className="w-full py-4 px-6 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center space-x-3 transform hover:scale-105 shadow-lg"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                  <span>
                    AI Processing{
                      selectedImage && audioBlob ? ' Image + Voice...' :
                      selectedImage ? ' Image...' :
                      audioBlob ? ' Voice...' :
                      ' Text...'
                    }
                  </span>
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  <span>Get AI Solution</span>
                  <Sparkles className="h-4 w-4" />
                </>
              )}
            </button>

            {/* S3 Data Testing Panel */}
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <Brain className="h-5 w-5 mr-2 text-purple-500" />
                S3 Data Testing
              </h3>
              
              <div className="space-y-3">
                <button
                  onClick={testGetEndpoints}
                  disabled={isLoadingData || connectionStatus === 'disconnected'}
                  className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl font-medium hover:from-purple-600 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center space-x-2"
                >
                  {isLoadingData ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      <span>Loading...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4" />
                      <span>Test All GET Endpoints</span>
                    </>
                  )}
                </button>

                <div className="flex space-x-2">
                  <input
                    type="text"
                    id="sessionId"
                    placeholder="Enter session ID..."
                    className="flex-1 p-2 border-0 bg-white/50 rounded-lg focus:ring-2 focus:ring-purple-400 text-sm"
                  />
                  <button
                    onClick={() => {
                      const sessionId = document.getElementById('sessionId').value;
                      getSpecificSolution(sessionId);
                    }}
                    disabled={isLoadingData}
                    className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 text-sm"
                  >
                    Get Solution
                  </button>
                </div>

                <div className="flex space-x-2">
                  <input
                    type="text"
                    id="searchTerm"
                    placeholder="Search solutions..."
                    className="flex-1 p-2 border-0 bg-white/50 rounded-lg focus:ring-2 focus:ring-purple-400 text-sm"
                  />
                  <button
                    onClick={() => {
                      const searchTerm = document.getElementById('searchTerm').value;
                      searchSolutions(searchTerm);
                    }}
                    disabled={isLoadingData}
                    className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 text-sm"
                  >
                    Search
                  </button>
                </div>

                {s3Data && (
                  <button
                    onClick={() => setShowDataViewer(!showDataViewer)}
                    className="w-full py-2 px-4 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm flex items-center justify-center space-x-2"
                  >
                    <FileText className="h-4 w-4" />
                    <span>{showDataViewer ? 'Hide' : 'Show'} S3 Data</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Enhanced Conversation Panel */}
          <div className="xl:col-span-2">
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl h-[700px] flex flex-col">
              
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200/50">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-lg">
                    <Brain className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">AI Solutions</h2>
                    <p className="text-sm text-gray-600">Smart farming advice with voice</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm ${
                    connectionStatus === 'connected' 
                      ? 'text-emerald-600 bg-emerald-50' 
                      : 'text-red-600 bg-red-50'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      connectionStatus === 'connected' 
                        ? 'bg-emerald-500 animate-pulse' 
                        : 'bg-red-500'
                    }`}></div>
                    <span>{connectionStatus === 'connected' ? 'Live AI' : 'Offline'}</span>
                  </div>
                  <button
                    onClick={clearConversation}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {conversation.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center space-y-4">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full blur-xl opacity-30"></div>
                        <div className="relative bg-gradient-to-r from-emerald-400 to-teal-500 p-6 rounded-full">
                          <Leaf className="h-12 w-12 text-white" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xl font-bold text-gray-800">Welcome to AgriSolver AI</h3>
                        <p className="text-gray-600">Describe your farming challenges using text, images, or voice</p>
                        <div className="flex items-center justify-center space-x-4 text-sm text-emerald-600 mt-4">
                          <div className="flex items-center space-x-1">
                            <Volume2 className="h-4 w-4" />
                            <span>Voice Responses</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Brain className="h-4 w-4" />
                            <span>AI Analysis</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Sparkles className="h-4 w-4" />
                            <span>Smart Solutions</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  conversation.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl p-4 shadow-lg ${
                          message.type === 'user'
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white'
                            : 'bg-white/80 backdrop-blur-sm text-gray-800 border border-gray-200/50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                            
                            {/* Enhanced message metadata */}
                            <div className="mt-3 flex items-center space-x-3 text-xs opacity-75">
                              {message.hasImage && (
                                <div className="flex items-center space-x-1">
                                  <Camera className="h-3 w-3" />
                                  <span>Image</span>
                                </div>
                              )}
                              {message.hasAudio && (
                                <div className="flex items-center space-x-1">
                                  <Mic className="h-3 w-3" />
                                  <span>Voice</span>
                                </div>
                              )}
                              {message.inputType && (
                                <div className="flex items-center space-x-1">
                                  <Zap className="h-3 w-3" />
                                  <span>{message.inputType}</span>
                                </div>
                              )}
                              {message.sessionId && (
                                <div className="flex items-center space-x-1">
                                  <CheckCircle className="h-3 w-3" />
                                  <span>Saved to S3</span>
                                </div>
                              )}
                              {message.analyzedContent?.multimodal && (
                                <div className="flex items-center space-x-1">
                                  <Brain className="h-3 w-3" />
                                  <span>AI Vision Analysis</span>
                                </div>
                              )}
                              <span>{message.timestamp}</span>
                            </div>
                            
                            {message.confidence && (
                              <div className="mt-2 flex items-center space-x-2">
                                <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                                  <div 
                                    className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                                    style={{ width: `${message.confidence * 100}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs opacity-75">
                                  {(message.confidence * 100).toFixed(1)}% confidence
                                </span>
                              </div>
                            )}
                          </div>
                          
                          {/* Enhanced voice controls */}
                          {message.type === 'ai' && (
                            <button
                              onClick={() => speakText(message.content, message.id)}
                              className={`ml-3 p-2 rounded-full transition-all ${
                                isPlaying && currentPlayingAudio === message.id 
                                  ? 'bg-emerald-100 text-emerald-600 animate-pulse' 
                                  : 'hover:bg-gray-100 text-gray-500'
                              }`}
                              title="Listen to response"
                            >
                              {isPlaying && currentPlayingAudio === message.id ? (
                                <VolumeX className="h-4 w-4" />
                              ) : (
                                <Volume2 className="h-4 w-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* S3 Data Viewer Modal */}
        {showDataViewer && s3Data && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
              
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-r from-purple-400 to-indigo-500 rounded-lg">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">S3 Data Viewer</h2>
                    <p className="text-sm text-gray-600">Backend GET endpoints data</p>
                  </div>
                </div>
                
                <button
                  onClick={() => setShowDataViewer(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
              
              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="space-y-6">
                  {Object.entries(s3Data).map(([endpointName, result]) => (
                    <div key={endpointName} className="border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-800">{endpointName}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          result.status === 200 || result.status === 'success' 
                            ? 'bg-green-100 text-green-800' 
                            : result.status === 'error'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          Status: {result.status}
                        </span>
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-3 overflow-x-auto">
                        <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                          {JSON.stringify(result.data || result.error, null, 2)}
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Footer */}
              <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
                <div className="text-sm text-gray-600">
                  Total endpoints tested: {Object.keys(s3Data).length}
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(s3Data, null, 2));
                      alert('Data copied to clipboard!');
                    }}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                  >
                    Copy JSON
                  </button>
                  <button
                    onClick={() => setShowDataViewer(false)}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgriProblemSolver;