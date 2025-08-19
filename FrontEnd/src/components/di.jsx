import { useState, useRef, useEffect } from 'react'
import { 
  Mic, MicOff, Camera, Upload, Send, Loader, Leaf, AlertTriangle, 
  CheckCircle, FileText, Image, Volume2, RefreshCw,
  Lightbulb, Bug, Droplets, Thermometer, Scissors, Shield, 
  Calendar, Target, ArrowRight, Home, Sparkles, MessageCircle, 
  Play, Pause, RotateCcw, Zap, Info, ChevronDown, ChevronUp,
  MapPin, Clock, Users, Star, TrendingUp, Square
} from 'lucide-react'

// Note: In production, this should be in environment variables
const geminiApiKey = "AIzaSyDhuxepfjXMcu_I8Lf6cUtvzVa-nyGidF0"

export default function PlantProblemSolver() {
  const [currentStep, setCurrentStep] = useState('input') // 'input', 'solution', 'follow-up'
  const [textInput, setTextInput] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState(null)
  const [audioUrl, setAudioUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [solution, setSolution] = useState(null)
  const [debugInfo, setDebugInfo] = useState('')
  const [followUpQuestion, setFollowUpQuestion] = useState('')
  const [conversationHistory, setConversationHistory] = useState([])
  const [expandedSections, setExpandedSections] = useState({})
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [plantLocation, setPlantLocation] = useState('')
  const [plantAge, setPlantAge] = useState('')
  const [plantType, setPlantType] = useState('')
  const [recentChanges, setRecentChanges] = useState('')
  
  const mediaRecorder = useRef(null)
  const audioChunks = useRef([])
  const fileInputRef = useRef(null)
  const audioRef = useRef(null)
  const recordingInterval = useRef(null)

  // Enhanced voice recording with duration tracking
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      })
      
      mediaRecorder.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      audioChunks.current = []
      setRecordingDuration(0)

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data)
        }
      }

      mediaRecorder.current.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' })
        setAudioBlob(audioBlob)
        setAudioUrl(URL.createObjectURL(audioBlob))
        stream.getTracks().forEach(track => track.stop())
        clearInterval(recordingInterval.current)
      }

      mediaRecorder.current.start(1000) // Collect data every second
      setIsRecording(true)
      
      // Start duration counter
      recordingInterval.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1)
      }, 1000)

    } catch (error) {
      console.error('Error accessing microphone:', error)
      setError('Unable to access microphone. Please check your permissions and try again.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop()
      setIsRecording(false)
      clearInterval(recordingInterval.current)
    }
  }

  const clearAudio = () => {
    setAudioBlob(null)
    setAudioUrl('')
    setRecordingDuration(0)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    setIsPlayingAudio(false)
  }

  const toggleAudioPlayback = () => {
    if (audioRef.current) {
      if (isPlayingAudio) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlayingAudio(!isPlayingAudio)
    }
  }

  // Enhanced image handling with compression
  const compressImage = (file, maxWidth = 1024, quality = 0.8) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()
      
      img.onload = () => {
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height)
        canvas.width = img.width * ratio
        canvas.height = img.height * ratio
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(resolve, 'image/jpeg', quality)
      }
      
      img.src = URL.createObjectURL(file)
    })
  }

  const handleImageUpload = async (event) => {
    const file = event.target.files[0]
    if (file) {
      // Check file type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file.')
        return
      }
      
      // Compress large images
      let processedFile = file
      if (file.size > 2 * 1024 * 1024) { // If larger than 2MB
        try {
          processedFile = await compressImage(file)
          console.log(`Image compressed from ${(file.size / 1024 / 1024).toFixed(2)}MB to ${(processedFile.size / 1024 / 1024).toFixed(2)}MB`)
        } catch (error) {
          console.error('Error compressing image:', error)
          setError('Failed to process the image. Please try a different image.')
          return
        }
      }
      
      setImageFile(processedFile)
      const reader = new FileReader()
      reader.onload = (e) => setImagePreview(e.target.result)
      reader.readAsDataURL(processedFile)
      setError('')
    }
  }

  const clearImage = () => {
    setImageFile(null)
    setImagePreview('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Enhanced audio to text conversion (placeholder for real implementation)
  const convertAudioToText = async (audioBlob) => {
    // In production, integrate with Google Speech-to-Text API or Web Speech API
    try {
      // Placeholder implementation - replace with actual speech-to-text
      const duration = Math.round(recordingDuration)
      return `[Voice recording: ${duration}s description of plant problem - implement actual speech-to-text conversion here]`
    } catch (error) {
      console.error('Speech to text error:', error)
      return '[Voice recording provided - speech-to-text processing failed]'
    }
  }

  // Enhanced image to base64 conversion
  const convertImageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const base64 = reader.result.split(',')[1]
          resolve(base64)
        } catch (error) {
          reject(error)
        }
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  // Enhanced submission with better data structuring
  const handleSubmit = async (isFollowUp = false) => {
    const inputText = isFollowUp ? followUpQuestion : textInput
    
    if (!inputText.trim() && !imageFile && !audioBlob && !isFollowUp) {
      setError('Please provide at least one form of input (text, image, or voice recording)')
      return
    }

    if (isFollowUp && !inputText.trim()) {
      setError('Please enter your follow-up question')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // Validate API key
      if (!geminiApiKey || geminiApiKey === "YOUR_API_KEY_HERE") {
        setError('API key is not configured. Please add your Gemini API key.')
        setIsLoading(false)
        return
      }

      let fullDescription = inputText.trim()
      
      // Add structured plant information
      if (!isFollowUp) {
        const plantInfo = []
        if (plantType) plantInfo.push(`Plant type: ${plantType}`)
        if (plantAge) plantInfo.push(`Plant age: ${plantAge}`)
        if (plantLocation) plantInfo.push(`Location: ${plantLocation}`)
        if (recentChanges) plantInfo.push(`Recent changes: ${recentChanges}`)
        
        if (plantInfo.length > 0) {
          fullDescription = `${plantInfo.join(', ')}\n\nProblem description: ${fullDescription}`
        }
      }
      
      // Add audio transcription if available
      if (audioBlob && !isFollowUp) {
        const audioText = await convertAudioToText(audioBlob)
        fullDescription += fullDescription ? `\n\nVoice description: ${audioText}` : audioText
      }

      // Prepare the request content
      let requestContent = []
      let promptText = ''

      if (isFollowUp) {
        // Follow-up question prompt
        promptText = `Based on the previous plant diagnosis and solution provided, please answer this follow-up question: "${inputText}"

Previous context: ${JSON.stringify(solution, null, 2)}

Please provide a helpful, detailed response addressing the specific question while referencing the previous diagnosis. Format your response as a JSON object with:
{
  "answer": "detailed answer to the follow-up question",
  "additionalRecommendations": ["any additional suggestions"],
  "clarifications": ["any clarifications needed"],
  "relatedActions": ["actions that might be relevant"]
}`
      } else {
        // Initial diagnosis prompt
        promptText = `As an expert agricultural consultant and plant pathologist, analyze the following plant/crop problem and provide a comprehensive solution:

Problem Description: ${fullDescription}

Please provide a detailed JSON response with the following structure:
{
  "problemAnalysis": {
    "identifiedIssue": "Primary issue identified",
    "severity": "Low/Medium/High/Critical",
    "urgency": "Immediate/Within 24hrs/Within week/Routine",
    "affectedParts": ["list of affected plant parts"],
    "likelyCauses": ["array of probable causes"],
    "environmentalFactors": ["relevant environmental factors"],
    "confidence": "High/Medium/Low"
  },
  "immediateActions": [
    {
      "action": "specific action to take",
      "priority": "High/Medium/Low",
      "timeframe": "when to do it",
      "materials": ["materials needed"],
      "instructions": "detailed step-by-step instructions",
      "cost": "estimated cost range"
    }
  ],
  "treatmentPlan": {
    "organic": {
      "methods": ["organic treatment methods"],
      "recipes": ["homemade solution recipes with measurements"],
      "timeline": "treatment schedule",
      "effectiveness": "expected effectiveness percentage"
    },
    "chemical": {
      "products": ["specific product names and active ingredients"],
      "dosage": "exact application rates",
      "safety": ["detailed safety precautions"],
      "timeline": "application schedule",
      "restrictions": ["usage restrictions or warnings"]
    },
    "cultural": {
      "practices": ["cultural management practices"],
      "modifications": ["environmental modifications needed"],
      "longTermChanges": ["permanent changes to consider"]
    }
  },
  "prevention": {
    "shortTerm": ["immediate preventive measures"],
    "longTerm": ["long-term prevention strategies"],
    "monitoring": ["what to monitor and frequency"],
    "seasonalCare": ["seasonal care recommendations"]
  },
  "expectedOutcome": {
    "recoveryTime": "expected recovery timeline",
    "successIndicators": ["signs of improvement to look for"],
    "followUpActions": ["follow-up care needed"],
    "potentialComplications": ["what could go wrong"]
  },
  "additionalRecommendations": {
    "soilManagement": "detailed soil care recommendations",
    "nutritionPlan": "specific fertilization schedule and nutrients",
    "companionPlanting": ["beneficial companion plants with reasons"],
    "tools": ["recommended tools with specifications"],
    "resources": ["helpful resources or references"]
  },
  "warningSignals": ["signs that indicate immediate professional help needed"],
  "expertConsultation": "when and why to seek professional help",
  "followUpQuestions": ["suggested follow-up questions the user might have"]
}

IMPORTANT: Return ONLY the JSON object, no additional text, markdown formatting, or code blocks.`
      }

      requestContent.push({ text: promptText })

      // Add image if available and not a follow-up
      if (imageFile && !isFollowUp) {
        try {
          const base64Image = await convertImageToBase64(imageFile)
          requestContent.push({
            inline_data: {
              mime_type: imageFile.type,
              data: base64Image
            }
          })
          requestContent.push({
            text: "Please analyze the image above for additional visual symptoms and include specific image-based observations in your diagnosis."
          })
        } catch (imageError) {
          console.error('Error processing image:', imageError)
          setError('Failed to process the image. Please try with a different image.')
          setIsLoading(false)
          return
        }
      }

      console.log('Sending request to Gemini API...')
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: requestContent
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192,
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.text()
        console.error('API Error Response:', errorData)
        
        if (response.status === 403) {
          setError('API key is invalid or has insufficient permissions. Please check your Gemini API key.')
        } else if (response.status === 429) {
          setError('API quota exceeded. Please try again later or check your API usage limits.')
        } else if (response.status === 400) {
          setError('Invalid request. The image might be too large or in an unsupported format.')
        } else {
          setError(`API request failed (Status: ${response.status}). Please try again.`)
        }
        setIsLoading(false)
        return
      }

      const data = await response.json()
      console.log('API Response:', data)
      
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts) {
        console.error('Unexpected API response structure:', data)
        setError('Received unexpected response from API. Please try again.')
        setIsLoading(false)
        return
      }

      const responseText = data.candidates[0].content.parts[0].text
      console.log('Raw response text:', responseText)

      // Clean and parse the response
      let cleanedText = responseText.trim()
      cleanedText = cleanedText.replace(/```json\s*/g, '').replace(/```\s*/g, '').replace(/^json\s*/g, '')
      
      const jsonStart = cleanedText.indexOf('{')
      const jsonEnd = cleanedText.lastIndexOf('}')
      
      if (jsonStart === -1 || jsonEnd === -1) {
        console.error('No JSON object found in response')
        setError('The API response does not contain valid JSON. Please try again.')
        setIsLoading(false)
        return
      }
      
      const jsonString = cleanedText.substring(jsonStart, jsonEnd + 1)
      
      try {
        const parsedSolution = JSON.parse(jsonString)
        
        if (isFollowUp) {
          // Add to conversation history
          setConversationHistory(prev => [...prev, {
            question: inputText,
            answer: parsedSolution,
            timestamp: new Date().toISOString()
          }])
          setFollowUpQuestion('')
        } else {
          setSolution(parsedSolution)
          setCurrentStep('solution')
          setConversationHistory([]) // Reset conversation history for new diagnosis
        }
        
      } catch (parseError) {
        console.error('JSON parsing error:', parseError)
        setError('Failed to parse the solution response. Please try again.')
      }
    } catch (error) {
      console.error('Error getting solution:', error)
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        setError('Network error. Please check your internet connection and try again.')
      } else {
        setError(`Unexpected error: ${error.message}`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setCurrentStep('input')
    setTextInput('')
    setImageFile(null)
    setImagePreview('')
    setAudioBlob(null)
    setAudioUrl('')
    setSolution(null)
    setError('')
    setDebugInfo('')
    setFollowUpQuestion('')
    setConversationHistory([])
    setPlantLocation('')
    setPlantAge('')
    setPlantType('')
    setRecentChanges('')
    clearAudio()
    clearImage()
  }

  const toggleSection = (sectionKey) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }))
  }

  const getSeverityColor = (severity) => {
    switch(severity?.toLowerCase()) {
      case 'low': return 'text-green-600 bg-green-50 border-green-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'critical': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getUrgencyIcon = (urgency) => {
    switch(urgency?.toLowerCase()) {
      case 'immediate': return <AlertTriangle className="h-5 w-5 text-red-500" />
      case 'within 24hrs': return <Clock className="h-5 w-5 text-orange-500" />
      case 'within week': return <Calendar className="h-5 w-5 text-yellow-500" />
      case 'routine': return <CheckCircle className="h-5 w-5 text-green-500" />
      default: return <Calendar className="h-5 w-5 text-gray-500" />
    }
  }

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Solution Display Component
  if (currentStep === 'solution' && solution) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50/80 via-emerald-50/60 to-lime-50/80 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 animate-bounce delay-100">
            <Leaf className="h-8 w-8 text-green-400/30 rotate-12" />
          </div>
          <div className="absolute top-32 right-20 animate-bounce delay-300">
            <Lightbulb className="h-6 w-6 text-yellow-400/30" />
          </div>
          <div className="absolute top-60 left-1/4 animate-bounce delay-500">
            <Shield className="h-7 w-7 text-blue-500/20 -rotate-12" />
          </div>
          <div className="absolute bottom-40 right-1/3 animate-bounce delay-700">
            <Sparkles className="h-6 w-6 text-green-400/30 rotate-45" />
          </div>
        </div>

        <div className="relative z-10 p-4 sm:p-8 max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <div className="absolute -inset-3 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full blur opacity-30 animate-pulse"></div>
                <div className="relative bg-white rounded-full p-4 shadow-lg">
                  <CheckCircle className="h-10 w-10 text-green-500" />
                </div>
              </div>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 via-emerald-500 to-green-600 bg-clip-text text-transparent mb-4">
              🌿 Plant Problem Solution
            </h1>
            <p className="text-lg text-gray-700 mb-6">
              Here's your comprehensive treatment plan and recommendations
            </p>
            <button
              onClick={resetForm}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-6 py-3 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] flex items-center mx-auto"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              New Diagnosis
            </button>
          </div>

          {/* Problem Analysis */}
          <div className="bg-white/90 backdrop-blur-xl p-6 sm:p-8 rounded-3xl shadow-2xl mb-8 border border-white/20">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <Bug className="h-6 w-6 text-red-600 mr-3" />
              Problem Analysis
            </h2>
            
            {/* Status Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className={`p-4 rounded-xl border-2 ${getSeverityColor(solution.problemAnalysis?.severity)}`}>
                <div className="text-center">
                  <div className="font-bold text-lg mb-1">{solution.problemAnalysis?.severity || 'Unknown'}</div>
                  <div className="text-sm opacity-75">Severity</div>
                </div>
              </div>
              
              <div className="p-4 rounded-xl border-2 border-blue-200 bg-blue-50">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    {getUrgencyIcon(solution.problemAnalysis?.urgency)}
                  </div>
                  <div className="font-semibold text-sm text-blue-700">
                    {solution.problemAnalysis?.urgency || 'Assess timing'}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border-2 border-purple-200 bg-purple-50">
                <div className="text-center">
                  <Target className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                  <div className="font-semibold text-sm text-purple-700">
                    {solution.problemAnalysis?.affectedParts?.length || 0} Parts Affected
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border-2 border-orange-200 bg-orange-50">
                <div className="text-center">
                  <Star className="h-6 w-6 text-orange-600 mx-auto mb-2" />
                  <div className="font-semibold text-sm text-orange-700">
                    {solution.problemAnalysis?.confidence || 'Medium'} Confidence
                  </div>
                </div>
              </div>
            </div>

            {/* Identified Issue */}
            <div className="bg-gradient-to-r from-red-50 to-orange-50 p-6 rounded-2xl mb-6 border border-red-100">
              <h3 className="text-xl font-semibold text-gray-800 mb-3 flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                Identified Issue
              </h3>
              <p className="text-gray-700 text-lg leading-relaxed">{solution.problemAnalysis?.identifiedIssue}</p>
            </div>

            {/* Expandable Details */}
            <div className="space-y-4">
              {/* Likely Causes */}
              <div className="bg-blue-50 rounded-xl border border-blue-200">
                <button
                  onClick={() => toggleSection('causes')}
                  className="w-full p-4 text-left flex items-center justify-between hover:bg-blue-100 transition-colors rounded-xl"
                >
                  <h4 className="font-semibold text-blue-800 flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    Likely Causes ({solution.problemAnalysis?.likelyCauses?.length || 0})
                  </h4>
                  {expandedSections.causes ? <ChevronUp className="h-5 w-5 text-blue-600" /> : <ChevronDown className="h-5 w-5 text-blue-600" />}
                </button>
                {expandedSections.causes && (
                  <div className="px-4 pb-4">
                    <ul className="space-y-2">
                      {solution.problemAnalysis?.likelyCauses?.map((cause, index) => (
                        <li key={index} className="flex items-start text-blue-700">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                          <span className="leading-relaxed">{cause}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Environmental Factors */}
              <div className="bg-green-50 rounded-xl border border-green-200">
                <button
                  onClick={() => toggleSection('environmental')}
                  className="w-full p-4 text-left flex items-center justify-between hover:bg-green-100 transition-colors rounded-xl"
                >
                  <h4 className="font-semibold text-green-800 flex items-center">
                    <Thermometer className="h-5 w-5 mr-2" />
                    Environmental Factors ({solution.problemAnalysis?.environmentalFactors?.length || 0})
                  </h4>
                  {expandedSections.environmental ? <ChevronUp className="h-5 w-5 text-green-600" /> : <ChevronDown className="h-5 w-5 text-green-600" />}
                </button>
                {expandedSections.environmental && (
                  <div className="px-4 pb-4">
                    <ul className="space-y-2">
                      {solution.problemAnalysis?.environmentalFactors?.map((factor, index) => (
                        <li key={index} className="flex items-start text-green-700">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                          <span className="leading-relaxed">{factor}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Follow-up Questions Section */}
          <div className="bg-white/90 backdrop-blur-xl p-6 sm:p-8 rounded-3xl shadow-2xl mb-8 border border-white/20">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <MessageCircle className="h-6 w-6 text-blue-600 mr-3" />
              Ask Follow-up Questions
            </h2>

            {/* Suggested Questions */}
            {solution.followUpQuestions && solution.followUpQuestions.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-700 mb-3">Suggested questions you might have:</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {solution.followUpQuestions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => setFollowUpQuestion(question)}
                      className="text-left p-3 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors text-sm text-blue-700"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Follow-up Input */}
            <div className="space-y-4">
              <div>
                <label className="block font-medium text-gray-700 mb-2">Ask your question:</label>
                <textarea
                  className="w-full p-4 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-400 focus:outline-none resize-none"
                  rows={3}
                  placeholder="e.g., How long should I wait before seeing improvement? What if the symptoms get worse?"
                  value={followUpQuestion}
                  onChange={e => setFollowUpQuestion(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              
              <button
                onClick={() => handleSubmit(true)}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-6 py-3 rounded-full font-medium transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading || !followUpQuestion.trim()}
              >
                {isLoading ? (
                  <>
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                    Getting Answer...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Ask Question
                  </>
                )}
              </button>
            </div>

            {/* Conversation History */}
            {conversationHistory.length > 0 && (
              <div className="mt-8 space-y-4">
                <h3 className="font-semibold text-gray-700">Previous Questions & Answers:</h3>
                {conversationHistory.map((conv, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="mb-3">
                      <p className="font-medium text-gray-800">Q: {conv.question}</p>
                    </div>
                    <div className="bg-white p-3 rounded border-l-4 border-blue-400">
                      <p className="text-gray-700 mb-2">{conv.answer.answer}</p>
                      {conv.answer.additionalRecommendations && conv.answer.additionalRecommendations.length > 0 && (
                        <div className="mt-3">
                          <p className="font-medium text-gray-700 mb-1">Additional recommendations:</p>
                          <ul className="space-y-1">
                            {conv.answer.additionalRecommendations.map((rec, idx) => (
                              <li key={idx} className="text-sm text-gray-600 flex items-start">
                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2 mt-2 flex-shrink-0"></div>
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-100 border border-red-300 text-red-700 px-6 py-4 rounded-lg mb-6 flex items-start">
              <AlertTriangle className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold">Error:</p>
                <p>{error}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Input Step UI (Enhanced)
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50/80 via-emerald-50/60 to-lime-50/80 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 animate-bounce delay-100">
          <Leaf className="h-8 w-8 text-green-400/30 rotate-12" />
        </div>
        <div className="absolute top-32 right-20 animate-bounce delay-300">
          <Lightbulb className="h-6 w-6 text-yellow-400/30" />
        </div>
        <div className="absolute top-60 left-1/4 animate-bounce delay-500">
          <Shield className="h-7 w-7 text-blue-500/20 -rotate-12" />
        </div>
        <div className="absolute bottom-40 right-1/3 animate-bounce delay-700">
          <Sparkles className="h-6 w-6 text-green-400/30 rotate-45" />
        </div>
      </div>

      <div className="relative z-10 p-4 sm:p-8 max-w-4xl mx-auto">
        <div className="bg-white/95 backdrop-blur-xl p-6 sm:p-8 rounded-3xl shadow-2xl border border-white/20">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-green-600 via-emerald-500 to-green-600 bg-clip-text text-transparent mb-4 text-center">
            🌱 Plant Problem Diagnosis
          </h1>
          <p className="text-gray-700 mb-8 text-center text-lg">
            Get expert diagnosis and treatment plans for your plant problems using AI-powered analysis
          </p>

          {/* Error message */}
          {error && (
            <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-start">
              <AlertTriangle className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold">Error:</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          {/* Plant Information Section */}
          <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <Info className="h-5 w-5 text-blue-600 mr-2" />
              Plant Information (Optional but helpful)
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-gray-700 mb-2">Plant Type</label>
                <input
                  type="text"
                  className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                  placeholder="e.g., Tomato, Rose, Fiddle Leaf Fig"
                  value={plantType}
                  onChange={e => setPlantType(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              
              <div>
                <label className="block font-medium text-gray-700 mb-2">Plant Age</label>
                <input
                  type="text"
                  className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                  placeholder="e.g., 2 months, 1 year old"
                  value={plantAge}
                  onChange={e => setPlantAge(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              
              <div>
                <label className="block font-medium text-gray-700 mb-2">Location/Environment</label>
                <input
                  type="text"
                  className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                  placeholder="e.g., Indoor pot, Garden bed, Greenhouse"
                  value={plantLocation}
                  onChange={e => setPlantLocation(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              
              <div>
                <label className="block font-medium text-gray-700 mb-2">Recent Changes</label>
                <input
                  type="text"
                  className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                  placeholder="e.g., Moved location, New fertilizer, Repotted"
                  value={recentChanges}
                  onChange={e => setRecentChanges(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          {/* Problem Description */}
          <div className="mb-6">
            <label className="block font-semibold text-gray-700 mb-3 text-lg">Describe the Problem</label>
            <textarea
              className="w-full p-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-400 focus:outline-none resize-none text-lg"
              rows={5}
              placeholder="Describe symptoms in detail: What do you see? When did it start? Which parts are affected? Any changes in color, texture, or growth?"
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              disabled={isLoading}
            />
            <p className="text-sm text-gray-500 mt-2">
              💡 Be specific: mention colors, patterns, affected areas, timing, and any environmental changes
            </p>
          </div>

          {/* Enhanced Image Upload */}
          <div className="mb-6">
            <label className="block font-semibold text-gray-700 mb-3 text-lg">Upload Plant Photo (Recommended)</label>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-green-400 transition-colors">
              {imagePreview ? (
                <div className="space-y-4">
                  <div className="relative inline-block">
                    <img
                      src={imagePreview}
                      alt="Plant preview"
                      className="max-w-full max-h-64 rounded-lg shadow-lg mx-auto"
                    />
                    <button
                      onClick={clearImage}
                      className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg transition-colors"
                      disabled={isLoading}
                    >
                      ×
                    </button>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Image ready for analysis</p>
                    <label
                      htmlFor="plant-image-upload"
                      className="cursor-pointer bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 rounded-full inline-flex items-center transition-colors"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Change Photo
                    </label>
                  </div>
                </div>
              ) : (
                <div>
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">
                    Click to upload or drag and drop your plant photo
                  </p>
                  <label
                    htmlFor="plant-image-upload"
                    className="cursor-pointer bg-green-100 hover:bg-green-200 text-green-700 px-6 py-3 rounded-full inline-flex items-center transition-colors font-medium"
                  >
                    <Camera className="h-5 w-5 mr-2" />
                    Choose Photo
                  </label>
                </div>
              )}
              
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImageUpload}
                disabled={isLoading}
                className="hidden"
                id="plant-image-upload"
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              📸 Clear, well-lit photos of affected areas work best. Supports JPG, PNG, WebP (auto-compressed for optimal processing)
            </p>
          </div>

          {/* Enhanced Voice Recording */}
          <div className="mb-8">
            <label className="block font-semibold text-gray-700 mb-3 text-lg">Voice Description (Optional)</label>
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-200">
              {!isRecording && !audioUrl && (
                <div className="text-center">
                  <Mic className="h-12 w-12 text-purple-500 mx-auto mb-4" />
                  <p className="text-gray-700 mb-4">Record a voice description of your plant's problem</p>
                  <button
                    onClick={startRecording}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-3 rounded-full flex items-center mx-auto transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                    disabled={isLoading}
                  >
                    <Mic className="h-5 w-5 mr-2" />
                    Start Recording
                  </button>
                </div>
              )}

              {isRecording && (
                <div className="text-center">
                  <div className="relative">
                    <div className="absolute inset-0 animate-ping bg-red-400 rounded-full opacity-30"></div>
                    <MicOff className="h-12 w-12 text-red-500 mx-auto mb-4 relative z-10" />
                  </div>
                  <p className="text-gray-700 mb-2">Recording... {formatDuration(recordingDuration)}</p>
                  <p className="text-sm text-gray-500 mb-4">Describe what you see and when the problem started</p>
                  <button
                    onClick={stopRecording}
                    className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-full flex items-center mx-auto transition-colors"
                  >
                    <Square className="h-5 w-5 mr-2" />
                    Stop Recording
                  </button>
                </div>
              )}

              {audioUrl && (
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-4 mb-4">
                    <button
                      onClick={toggleAudioPlayback}
                      className="bg-green-500 hover:bg-green-600 text-white p-3 rounded-full transition-colors"
                    >
                      {isPlayingAudio ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                    </button>
                    <div className="text-gray-700">
                      <p className="font-medium">Recording ready ({formatDuration(recordingDuration)})</p>
                      <p className="text-sm text-gray-500">Click play to review</p>
                    </div>
                    <button
                      onClick={clearAudio}
                      className="bg-gray-400 hover:bg-gray-500 text-white p-2 rounded-full transition-colors"
                      disabled={isLoading}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  </div>
                  <audio
                    ref={audioRef}
                    src={audioUrl}
                    onEnded={() => setIsPlayingAudio(false)}
                    className="hidden"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Submit Button */}
          <div className="text-center">
            <button
              onClick={() => handleSubmit(false)}
              className="w-full sm:w-auto bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 hover:from-green-600 hover:via-emerald-600 hover:to-green-700 text-white px-12 py-4 rounded-full font-bold text-xl transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-[1.02] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none min-w-[250px] mx-auto"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader className="h-6 w-6 mr-3 animate-spin" />
                  Analyzing Plant Problem...
                </>
              ) : (
                <>
                  <Sparkles className="h-6 w-6 mr-3" />
                  Get AI Diagnosis
                </>
              )}
            </button>
            
            <p className="text-sm text-gray-500 mt-4">
              🔬 AI-powered analysis using advanced plant pathology knowledge
            </p>
          </div>

          {/* API Key Notice */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start">
              <Info className="h-5 w-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-blue-700 font-medium mb-1">
                  Enhanced AI Plant Diagnosis
                </p>
                <p className="text-xs text-blue-600">
                  This app uses Google's Gemini AI for comprehensive plant problem analysis. 
                  Ensure your API key has sufficient quota for optimal results.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


