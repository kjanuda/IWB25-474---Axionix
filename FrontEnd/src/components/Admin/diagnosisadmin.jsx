import React, { useState, useEffect } from 'react';
import {
  Database,
  Download,
  Eye,
  FileText,
  Image,
  Mic,
  Brain,
  RefreshCw,
  Search,
  Calendar,
  HardDrive,
  ExternalLink,
  X,
  AlertCircle,
  Activity,
  TrendingUp,
  BarChart3,
  Settings,
  Server,
  Cloud,
} from 'lucide-react';

const S3DataViewer = () => {
  const [s3Data, setS3Data] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewError, setPreviewError] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('files');
  const [backendStatus, setBackendStatus] = useState('unknown');

  // Backend URL configuration
  const BACKEND_URL = 'http://localhost:8081';

  // Fetch S3 summary data
  const fetchS3Data = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/s3`);
      const result = await response.json();
      if (response.ok) {
        const transformedData = {
          success: result.success,
          bucketName: result.bucketName,
          region: result.region,
          totalFiles: result.dataSummary.totalFiles,
          dataSummary: result.dataSummary,
          s3Structure: result.s3Structure,
          baseUrl: result.baseUrl,
          allFiles: [],
        };
        setS3Data(transformedData);
        setBackendStatus('connected');
        await fetchDetailedFileLists(transformedData);
      } else {
        console.error('S3 data fetch failed:', result);
        setBackendStatus('error');
        alert('Failed to fetch S3 data: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error fetching S3 data:', error);
      setBackendStatus('disconnected');
      alert('Network error. Please check if the backend server is running on port 8081.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch detailed file lists for each type
  const fetchDetailedFileLists = async (s3Summary) => {
    const types = ['text', 'image', 'audio', 'solution'];
    const allFiles = [];
    for (const type of types) {
      try {
        const response = await fetch(`${BACKEND_URL}/s3/${type}`);
        if (response.ok) {
          const typeData = await response.json();
          if (typeData.success && typeData.files) {
            const transformedFiles = typeData.files.map((fileName) => ({
              fileName,
              key: `${typeData.s3Location}${fileName}`,
              type: typeData.dataType + 's',
              size: 'Unknown',
              lastModified: 'Unknown',
              url: `${typeData.baseUrl}${fileName}`,
            }));
            allFiles.push(...transformedFiles);
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch ${type} files:`, error);
      }
    }
    setS3Data((prev) => ({
      ...prev,
      allFiles,
    }));
  };

  // Fetch analytics data
  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/analytics`);
      const result = await response.json();
      if (response.ok) {
        setAnalytics(result.analytics);
        setBackendStatus('connected');
      } else {
        console.error('Analytics fetch failed:', result);
        alert('Failed to fetch analytics: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setBackendStatus('disconnected');
      alert('Network error. Please check if the backend server is running.');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Check backend health
  const checkBackendHealth = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/health`);
      const result = await response.json();
      if (response.ok && result.status === 'healthy') {
        setBackendStatus('healthy');
        return result;
      } else {
        setBackendStatus('unhealthy');
        return null;
      }
    } catch (error) {
      setBackendStatus('disconnected');
      return null;
    }
  };

  useEffect(() => {
    checkBackendHealth().then((healthData) => {
      if (healthData) {
        fetchS3Data();
        fetchAnalytics();
      }
    });
  }, []);

  const getFileIcon = (file) => {
    let fileType;
    if (typeof file === 'string') {
      fileType = file;
    } else {
      fileType = file.type || getFileTypeFromExtension(file.fileName);
    }
    switch (fileType) {
      case 'texts':
        return <FileText className="h-5 w-5 text-blue-500" />;
      case 'images':
        return <Image className="h-5 w-5 text-green-500" />;
      case 'audios':
        return <Mic className="h-5 w-5 text-purple-500" />;
      case 'solutions':
        return <Brain className="h-5 w-5 text-orange-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatFileSize = (size) => {
    if (size === 'Unknown' || !size) return 'Unknown';
    const bytes = parseInt(size);
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const downloadFile = (file) => {
    window.open(file.url, '_blank');
  };

  const getFileExtension = (filename) => {
    if (!filename || typeof filename !== 'string') return '';
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop().toLowerCase() : '';
  };

  const getFileTypeFromExtension = (filename) => {
    const ext = getFileExtension(filename);
    const textExtensions = [
      'txt',
      'json',
      'csv',
      'xml',
      'html',
      'css',
      'js',
      'py',
      'java',
      'cpp',
      'c',
      'md',
      'log',
      'sql',
      'yml',
      'yaml',
      'ini',
      'cfg',
      'conf',
    ];
    const imageExtensions = [
      'jpg',
      'jpeg',
      'png',
      'gif',
      'bmp',
      'webp',
      'svg',
      'tiff',
      'tif',
      'ico',
      'heic',
      'heif',
    ];
    const audioExtensions = [
      'mp3',
      'wav',
      'ogg',
      'webm',
      'm4a',
      'flac',
      'aac',
      'wma',
      'opus',
    ];
    const solutionExtensions = ['json'];

    if (textExtensions.includes(ext)) return 'texts';
    if (imageExtensions.includes(ext)) return 'images';
    if (audioExtensions.includes(ext)) return 'audios';
    if (filename.includes('solution_') && solutionExtensions.includes(ext)) return 'solutions';
    return 'unknown';
  };

  const isTextFile = (file) => {
    return file.type === 'texts' || getFileTypeFromExtension(file.fileName) === 'texts';
  };

  const isImageFile = (file) => {
    return file.type === 'images' || getFileTypeFromExtension(file.fileName) === 'images';
  };

  const isAudioFile = (file) => {
    return file.type === 'audios' || getFileTypeFromExtension(file.fileName) === 'audios';
  };

  const isSolutionFile = (file) => {
    return (
      file.type === 'solutions' ||
      getFileTypeFromExtension(file.fileName) === 'solutions' ||
      file.fileName.includes('solution_')
    );
  };

  const fetchFileContent = async (file) => {
    try {
      const backendUrl = `${BACKEND_URL}/s3/${file.type.replace('s', '')}/${file.fileName}`;
      const response = await fetch(backendUrl);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          return result.content;
        }
      }

      const directResponse = await fetch(file.url, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
        mode: 'cors',
      });

      if (!directResponse.ok) {
        throw new Error(`HTTP error! status: ${directResponse.status}`);
      }
      return await directResponse.text();
    } catch (error) {
      throw new Error(`Failed to fetch file content: ${error.message}`);
    }
  };

  const viewFile = async (file) => {
    setSelectedFile(file);
    setPreviewError(null);
    setPreviewLoading(true);

    if (isTextFile(file) || isSolutionFile(file)) {
      try {
        const content = await fetchFileContent(file);
        setSelectedFile({ ...file, textContent: content });
      } catch (error) {
        setPreviewError(`Unable to load content: ${error.message}`);
      }
    }

    setPreviewLoading(false);
  };

  const getFilteredFiles = () => {
    if (!s3Data || !s3Data.allFiles) return [];
    let files = s3Data.allFiles;

    if (selectedType !== 'all') {
      files = files.filter((file) => {
        switch (selectedType) {
          case 'texts':
            return isTextFile(file);
          case 'images':
            return isImageFile(file);
          case 'audios':
            return isAudioFile(file);
          case 'solutions':
            return isSolutionFile(file);
          default:
            return file.type === selectedType;
        }
      });
    }

    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      files = files.filter(
        (file) =>
          file.fileName.toLowerCase().includes(searchLower) ||
          file.key.toLowerCase().includes(searchLower) ||
          (file.type && file.type.toLowerCase().includes(searchLower)) ||
          getFileExtension(file.fileName).includes(searchLower)
      );
    }
    return files;
  };

  const getTypeStats = () => {
    if (!s3Data || !s3Data.allFiles) return {};
    const stats = {
      texts: 0,
      images: 0,
      audios: 0,
      solutions: 0,
      unknown: 0,
    };
    s3Data.allFiles.forEach((file) => {
      if (isTextFile(file)) {
        stats.texts++;
      } else if (isImageFile(file)) {
        stats.images++;
      } else if (isAudioFile(file)) {
        stats.audios++;
      } else if (isSolutionFile(file)) {
        stats.solutions++;
      } else {
        stats.unknown++;
      }
    });
    return stats;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100';
      case 'connected':
        return 'text-blue-600 bg-blue-100';
      case 'unhealthy':
        return 'text-yellow-600 bg-yellow-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      case 'disconnected':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const renderFilePreview = (file) => {
    if (previewLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-500 mr-3" />
          <span className="text-lg text-gray-600">Loading preview...</span>
        </div>
      );
    }

    if (previewError) {
      return (
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{previewError}</p>
          <div className="space-y-2 text-sm text-gray-600">
            <p>
              <strong>Troubleshooting:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 text-left max-w-md mx-auto">
              <li>Check if backend server is running on port 8081</li>
              <li>Verify S3 bucket permissions and CORS configuration</li>
              <li>Ensure files are publicly accessible or use signed URLs</li>
              <li>Try downloading the file directly</li>
            </ul>
          </div>
          <button
            onClick={() => downloadFile(file)}
            className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 mt-4"
          >
            <Download className="h-4 w-4 mr-2" />
            Download File Instead
          </button>
        </div>
      );
    }

    if (isImageFile(file)) {
      return (
        <div className="text-center">
          <img
            src={file.url}
            alt={file.fileName}
            className="max-w-full h-auto rounded-lg mx-auto"
            crossOrigin="anonymous"
            onError={() =>
              setPreviewError(
                'Failed to load image. Check CORS configuration and ensure the bucket allows public access for images.'
              )
            }
          />
          <p className="text-sm text-gray-500 mt-2">
            {file.fileName} • {formatFileSize(file.size)}
          </p>
        </div>
      );
    }

    if (isAudioFile(file)) {
      return (
        <div className="text-center space-y-4">
          <div className="bg-gray-50 rounded-lg p-6">
            <Mic className="h-12 w-12 text-purple-500 mx-auto mb-4" />
            <audio
              controls
              className="w-full max-w-md mx-auto"
              preload="metadata"
              crossOrigin="anonymous"
              onError={() =>
                setPreviewError('Failed to load audio. Check CORS configuration or try downloading the file.')
              }
            >
              <source src={file.url} type="audio/mpeg" />
              <source src={file.url} type="audio/wav" />
              <source src={file.url} type="audio/webm" />
              Your browser does not support the audio element.
            </audio>
            <p className="text-sm text-gray-500 mt-2">
              {file.fileName} • {formatFileSize(file.size)}
            </p>
          </div>
        </div>
      );
    }

    if ((isTextFile(file) || isSolutionFile(file)) && file.textContent) {
      if (isSolutionFile(file)) {
        try {
          const solutionData = JSON.parse(file.textContent);
          return (
            <div className="space-y-4">
              <div className="bg-orange-50 rounded-lg p-4">
                <h4 className="font-semibold text-orange-800 mb-2">Agricultural Solution</h4>
                <div className="space-y-2 text-sm">
                  <p>
                    <strong>Session ID:</strong> {solutionData.sessionId}
                  </p>
                  <p>
                    <strong>Timestamp:</strong> {solutionData.timestamp}
                  </p>
                  <p>
                    <strong>Input Type:</strong> {solutionData.inputType}
                  </p>
                  <p>
                    <strong>Confidence:</strong> {solutionData.aiSolution?.confidence || 'N/A'}
                  </p>
                </div>
              </div>
              {solutionData.userInputs?.textInput && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h5 className="font-medium text-blue-800 mb-2">User Problem Description:</h5>
                  <p className="text-sm text-blue-700">{solutionData.userInputs.textInput}</p>
                </div>
              )}
              {solutionData.aiSolution?.solutionText && (
                <div className="bg-green-50 rounded-lg p-4">
                  <h5 className="font-medium text-green-800 mb-2">AI Solution:</h5>
                  <div className="text-sm text-green-700 whitespace-pre-wrap">
                    {solutionData.aiSolution.solutionText}
                  </div>
                </div>
              )}
              <details className="bg-gray-50 rounded-lg p-4">
                <summary className="font-medium text-gray-700 cursor-pointer">Raw JSON Data</summary>
                <pre className="whitespace-pre-wrap text-xs bg-white p-3 rounded mt-2 overflow-auto max-h-60">
                  {JSON.stringify(solutionData, null, 2)}
                </pre>
              </details>
            </div>
          );
        } catch (e) {
          // Fallback to raw text
        }
      }
      return (
        <div className="max-h-96 overflow-auto">
          <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded-lg border">
            {file.textContent}
          </pre>
        </div>
      );
    }

    return (
      <div className="text-center py-8">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 mb-4">Preview not available for this file type</p>
        <p className="text-sm text-gray-400 mb-4">
          File: {file.fileName} ({formatFileSize(file.size)})
        </p>
        <div className="space-x-2">
          <button
            onClick={() => downloadFile(file)}
            className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            <Download className="h-4 w-4 mr-2" />
            Download File
          </button>
          <button
            onClick={() => window.open(file.url, '_blank')}
            className="inline-flex items-center px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in New Tab
          </button>
        </div>
      </div>
    );
  };

  const renderAnalytics = () => {
    if (analyticsLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-500 mr-3" />
          <span className="text-lg text-gray-600">Loading analytics...</span>
        </div>
      );
    }

    if (!analytics) {
      return (
        <div className="text-center py-8">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No analytics data available</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* System Health */}
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Activity className="h-5 w-5 mr-2 text-blue-500" />
            System Health
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Backend Status</span>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(backendStatus)}`}>
                  {backendStatus}
                </span>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">AWS CLI</span>
                <span className="text-sm text-gray-700">
                  {analytics.systemHealth?.awsCliStatus?.includes('found') ? '✅ Available' : '❌ Not Found'}
                </span>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Gemini AI</span>
                <span className="text-sm text-gray-700">
                  {analytics.systemHealth?.geminiApiConfigured ? '✅ Configured' : '❌ Not Configured'}
                </span>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">S3 Bucket</span>
                <span className="text-sm text-gray-700">{analytics.systemHealth?.s3BucketName}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Usage Statistics */}
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-green-500" />
            Usage Statistics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{analytics.totalSolutions}</div>
              <div className="text-sm text-blue-800">Total Solutions</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {analytics.averageSolutionsPerDay?.toFixed(1) || '0.0'}
              </div>
              <div className="text-sm text-green-800">Avg/Day (30d)</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{s3Data?.totalFiles || 0}</div>
              <div className="text-sm text-purple-800">Total Files</div>
            </div>
          </div>
        </div>

        {/* Storage Information */}
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Cloud className="h-5 w-5 mr-2 text-indigo-500" />
            Storage Information
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">Strategy:</span>
              <span className="text-sm text-gray-700">{analytics.storage?.strategy}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">Backup:</span>
              <span className="text-sm text-gray-700">
                {analytics.storage?.backupEnabled ? '✅ Enabled' : '❌ Disabled'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">Region:</span>
              <span className="text-sm text-gray-700">{analytics.systemHealth?.awsRegion}</span>
            </div>
          </div>
        </div>

        {/* Features Status */}
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Settings className="h-5 w-5 mr-2 text-gray-500" />
            Features Status
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(analytics.features || {}).map(([feature, enabled]) => (
              <div key={feature} className="flex items-center space-x-2">
                <span className={`text-sm ${enabled ? 'text-green-600' : 'text-red-600'}`}>
                  {enabled ? '✅' : '❌'}
                </span>
                <span className="text-sm text-gray-700 capitalize">
                  {feature.replace(/([A-Z])/g, ' $1').trim()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-xl mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl">
                <Database className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Agricultural Data Manager</h1>
                <p className="text-gray-600">S3 Storage & Analytics Dashboard</p>
                <div className="flex items-center space-x-2 mt-1">
                  <Server className="h-4 w-4 text-gray-400" />
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(backendStatus)}`}>
                    {backendStatus}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={fetchAnalytics}
                disabled={analyticsLoading}
                className="flex items-center space-x-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
              >
                <BarChart3 className={`h-4 w-4 ${analyticsLoading ? 'animate-spin' : ''}`} />
                <span>Analytics</span>
              </button>
              <button
                onClick={fetchS3Data}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Status Cards */}
          {s3Data && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-blue-600">{s3Data.totalFiles}</div>
                <div className="text-sm text-blue-800">Total Files</div>
              </div>
              {Object.entries(getTypeStats())
                .filter(([_, count]) => count > 0)
                .map(([type, count]) => (
                  <div key={type} className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center mb-1">{getFileIcon(type)}</div>
                    <div className="text-xl font-bold text-gray-700">{count}</div>
                    <div className="text-xs text-gray-600 capitalize">{type}</div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('files')}
              className={`flex-1 px-6 py-4 text-sm font-medium ${
                activeTab === 'files'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <HardDrive className="h-4 w-4" />
                <span>Files & Storage</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex-1 px-6 py-4 text-sm font-medium ${
                activeTab === 'analytics'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <BarChart3 className="h-4 w-4" />
                <span>Analytics & Health</span>
              </div>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'files' && (
          <>
            {/* Search and Filter */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-xl mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search files by name, key, type, or extension..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  />
                </div>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                >
                  <option value="all">All Types</option>
                  <option value="texts">📄 Text Files</option>
                  <option value="images">🖼️ Images</option>
                  <option value="audios">🎵 Audio Files</option>
                  <option value="solutions">🧠 AI Solutions</option>
                  <option value="unknown">❓ Other Files</option>
                </select>
              </div>
              {(searchTerm || selectedType !== 'all') && (
                <div className="mt-3 text-sm text-gray-600">
                  {getFilteredFiles().length} files found
                  {searchTerm && ` matching "${searchTerm}"`}
                  {selectedType !== 'all' && ` in ${selectedType}`}
                </div>
              )}
            </div>

            {/* Files Grid */}
            {loading ? (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-12 border border-white/20 shadow-xl">
                <div className="flex items-center justify-center">
                  <RefreshCw className="h-8 w-8 animate-spin text-blue-500 mr-3" />
                  <span className="text-lg text-gray-600">Loading S3 data...</span>
                </div>
              </div>
            ) : s3Data ? (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-800">
                        Files ({getFilteredFiles().length})
                      </h2>
                      <p className="text-sm text-gray-600">
                        Bucket: {s3Data.bucketName} | Region: {s3Data.region} | Strategy: S3 Only
                      </p>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <div>Total Storage: {s3Data.totalFiles} files</div>
                      <div>Last Updated: {new Date().toLocaleTimeString()}</div>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          File Information
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type & Category
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Storage Details
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {getFilteredFiles().map((file, index) => (
                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              {getFileIcon(file)}
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900">{file.fileName}</div>
                                <div className="text-xs text-gray-500 truncate max-w-xs">Key: {file.key}</div>
                                <div className="text-xs text-blue-600">.{getFileExtension(file.fileName)} file</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  isTextFile(file)
                                    ? 'bg-blue-100 text-blue-800'
                                    : isImageFile(file)
                                    ? 'bg-green-100 text-green-800'
                                    : isAudioFile(file)
                                    ? 'bg-purple-100 text-purple-800'
                                    : isSolutionFile(file)
                                    ? 'bg-orange-100 text-orange-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {file.type || getFileTypeFromExtension(file.fileName)}
                              </span>
                              {isSolutionFile(file) && (
                                <div className="text-xs text-orange-600">AI Generated</div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-500 space-y-1">
                              <div className="flex items-center">
                                <HardDrive className="h-3 w-3 mr-1" />
                                {formatFileSize(file.size)}
                              </div>
                              <div className="flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                {file.lastModified || 'Unknown'}
                              </div>
                              <div className="text-xs text-blue-500">S3 Storage</div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => viewFile(file)}
                                className="text-blue-600 hover:text-blue-900 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                                title="Preview file"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => downloadFile(file)}
                                className="text-green-600 hover:text-green-900 p-2 rounded-lg hover:bg-green-50 transition-colors"
                                title="Download file"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => window.open(file.url, '_blank')}
                                className="text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                                title="Open in new tab"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {getFilteredFiles().length === 0 && (
                    <div className="text-center py-12">
                      <HardDrive className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No files found</h3>
                      <p className="text-gray-500 mb-4">
                        {searchTerm || selectedType !== 'all'
                          ? 'Try adjusting your search or filter criteria'
                          : 'No files have been uploaded yet'}
                      </p>
                      {(searchTerm || selectedType !== 'all') && (
                        <div className="space-x-2">
                          <button
                            onClick={() => setSearchTerm('')}
                            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                          >
                            Clear Search
                          </button>
                          <button
                            onClick={() => setSelectedType('all')}
                            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                          >
                            Show All Types
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-12 border border-white/20 shadow-xl text-center">
                <Database className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No data available</h3>
                <p className="text-gray-500 mb-4">
                  {backendStatus === 'disconnected'
                    ? 'Cannot connect to backend server. Please ensure it\'s running on port 8081.'
                    : 'Click refresh to load S3 data'}
                </p>
                <button
                  onClick={fetchS3Data}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Try Again
                </button>
              </div>
            )}
          </>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-xl">
            {renderAnalytics()}
          </div>
        )}

        {/* File Preview Modal */}
        {selectedFile && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-5xl max-h-[90vh] overflow-auto w-full">
              <div className="p-6 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getFileIcon(selectedFile)}
                    <div>
                      <h3 className="text-lg font-semibold">{selectedFile.fileName}</h3>
                      <p className="text-sm text-gray-500">{selectedFile.key}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-400 mt-1">
                        <span>Type: {selectedFile.type || getFileTypeFromExtension(selectedFile.fileName)}</span>
                        <span>Extension: .{getFileExtension(selectedFile.fileName)}</span>
                        <span>Size: {formatFileSize(selectedFile.size)}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewError(null);
                      setPreviewLoading(false);
                    }}
                    className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="p-6">{renderFilePreview(selectedFile)}</div>
              <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500">Backend URL: {BACKEND_URL}</div>
                  <div className="space-x-2">
                    <button
                      onClick={() => downloadFile(selectedFile)}
                      className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </button>
                    <button
                      onClick={() => window.open(selectedFile.url, '_blank')}
                      className="inline-flex items-center px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Direct
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default S3DataViewer;