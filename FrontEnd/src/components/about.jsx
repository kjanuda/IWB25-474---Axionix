import { Leaf, Search, User, Eye, Thermometer, Droplets, BarChart3, Calendar, DollarSign, Users, BookOpen, Newspaper, Video, MessageCircle, Mail, Bot, Cpu } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="bg-green-500 p-4 rounded-full">
              <Leaf className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-gray-800 mb-6">
            About <span className="text-green-600">Ecogreen360</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            The easiest way for anyone to start growing in a greenhouse. We've revolutionized agricultural technology to make smart farming accessible to everyone.
          </p>
        </div>

        {/* Main Platform Features */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">
            How Ecogreen360 Works
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="text-center p-6 bg-green-50 rounded-xl">
              <Search className="h-10 w-10 text-green-600 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-800 mb-2">Search Crops</h3>
              <p className="text-sm text-gray-600">Simply enter the name of any crop you want to grow</p>
            </div>
            
            <div className="text-center p-6 bg-blue-50 rounded-xl">
              <BarChart3 className="h-10 w-10 text-blue-600 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-800 mb-2">Get Complete Info</h3>
              <p className="text-sm text-gray-600">View costs, timeline, market prices, and cultivation details</p>
            </div>
            
            <div className="text-center p-6 bg-purple-50 rounded-xl">
              <User className="h-10 w-10 text-purple-600 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-800 mb-2">Submit Details</h3>
              <p className="text-sm text-gray-600">Click submit and enter your personal information</p>
            </div>
            
            <div className="text-center p-6 bg-orange-50 rounded-xl">
              <Eye className="h-10 w-10 text-orange-600 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-800 mb-2">View in 3D</h3>
              <p className="text-sm text-gray-600">See your greenhouse created in stunning 3D visualization</p>
            </div>
          </div>
        </div>

        {/* Detailed Information Section */}
        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* Crop Information */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">Complete Crop Intelligence</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <DollarSign className="h-6 w-6 text-green-500" />
                <span className="text-gray-700">Growing costs and investment required</span>
              </div>
              <div className="flex items-center space-x-3">
                <Calendar className="h-6 w-6 text-blue-500" />
                <span className="text-gray-700">Timeline from planting to harvest</span>
              </div>
              <div className="flex items-center space-x-3">
                <BarChart3 className="h-6 w-6 text-purple-500" />
                <span className="text-gray-700">Future market price predictions</span>
              </div>
              <div className="flex items-center space-x-3">
                <Thermometer className="h-6 w-6 text-red-500" />
                <span className="text-gray-700">Optimal temperature requirements</span>
              </div>
              <div className="flex items-center space-x-3">
                <Droplets className="h-6 w-6 text-cyan-500" />
                <span className="text-gray-700">Humidity, pH, and water supply details</span>
              </div>
            </div>
          </div>

          {/* 3D Greenhouse Visualization */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">Revolutionary 3D Experience</h3>
            <div className="bg-gradient-to-br from-green-100 to-blue-100 rounded-xl p-6 mb-4">
              <div className="text-center mb-4">
                <Eye className="h-12 w-12 text-green-600 mx-auto mb-2" />
                <h4 className="font-semibold text-gray-800">Virtual Greenhouse Tour</h4>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">
                Your physical greenhouse is replicated exactly in 3D format. Monitor water supply systems, 
                temperature controls, tank capacity, and all equipment remotely. What you see in 3D matches 
                exactly what's happening in your real greenhouse.
              </p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Great Convenience:</strong> No need to visit your field frequently. 
                Monitor everything from anywhere, anytime!
              </p>
            </div>
          </div>
        </div>

        {/* Additional Features */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">
            Complete Agricultural Ecosystem
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center p-6 border border-gray-200 rounded-xl hover:shadow-lg transition-shadow">
              <Users className="h-10 w-10 text-blue-600 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-800 mb-2">Job Portal</h3>
              <p className="text-sm text-gray-600">Connect with agricultural opportunities and career growth</p>
            </div>
            
            <div className="text-center p-6 border border-gray-200 rounded-xl hover:shadow-lg transition-shadow">
              <BookOpen className="h-10 w-10 text-green-600 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-800 mb-2">Expert Blog</h3>
              <p className="text-sm text-gray-600">Learn from agricultural experts and successful farmers</p>
            </div>
            
            <div className="text-center p-6 border border-gray-200 rounded-xl hover:shadow-lg transition-shadow">
              <Newspaper className="h-10 w-10 text-purple-600 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-800 mb-2">Latest News</h3>
              <p className="text-sm text-gray-600">Stay updated with agricultural trends and market insights</p>
            </div>
            
            <div className="text-center p-6 border border-gray-200 rounded-xl hover:shadow-lg transition-shadow">
              <Video className="h-10 w-10 text-red-600 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-800 mb-2">Live Webinars</h3>
              <p className="text-sm text-gray-600">Join interactive sessions with farming professionals</p>
            </div>
            
            <div className="text-center p-6 border border-gray-200 rounded-xl hover:shadow-lg transition-shadow">
              <Cpu className="h-10 w-10 text-indigo-600 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-800 mb-2">AI Solutions</h3>
              <p className="text-sm text-gray-600">Get instant AI-powered answers to your farming problems</p>
            </div>
            
            <div className="text-center p-6 border border-gray-200 rounded-xl hover:shadow-lg transition-shadow">
              <Mail className="h-10 w-10 text-orange-600 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-800 mb-2">Newsletter</h3>
              <p className="text-sm text-gray-600">Subscribe for weekly updates and farming tips</p>
            </div>
            
            <div className="text-center p-6 border border-gray-200 rounded-xl hover:shadow-lg transition-shadow">
              <Bot className="h-10 w-10 text-teal-600 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-800 mb-2">Smart Chatbot</h3>
              <p className="text-sm text-gray-600">24/7 intelligent support for all your questions</p>
            </div>
            
            <div className="text-center p-6 border border-gray-200 rounded-xl hover:shadow-lg transition-shadow">
              <MessageCircle className="h-10 w-10 text-pink-600 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-800 mb-2">Community</h3>
              <p className="text-sm text-gray-600">Connect with fellow farmers and share experiences</p>
            </div>
          </div>
        </div>

        {/* Mission Statement */}
        <div className="text-center mt-16 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-2xl p-12">
          <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
          <p className="text-xl leading-relaxed max-w-4xl mx-auto">
            At Ecogreen360, we believe that modern agriculture should be accessible, intelligent, and sustainable. 
            We've combined cutting-edge technology with practical farming wisdom to create a platform that empowers 
            anyone to become a successful greenhouse farmer. From beginners to experts, our comprehensive ecosystem 
            provides everything you need to grow, learn, and thrive in the agricultural industry.
          </p>
        </div>
      </div>
    </div>
  );
}