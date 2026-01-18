import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { fieldService } from '../services/fieldService';
import { reportService } from '../services/reportService';
import { generateGraphsReport, generateRecommendationsReport, generateWeatherReport } from '../utils/reportGenerator';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import SensorDataTab from '../components/tabs/SensorDataTab';
import GraphsTab from '../components/tabs/GraphsTab';
import RecommendationsTab from '../components/tabs/RecommendationsTab';
import AIChatTab from '../components/tabs/AIChatTab';
import WeatherTab from '../components/tabs/WeatherTab';
import TransparencyTab from '../components/tabs/TransparencyTab';

const FieldDetailPage = ({ demoMode = false }) => {
  const { id } = useParams();
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [field, setField] = useState(null);
  const [activeTab, setActiveTab] = useState('sensors');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generatingReport, setGeneratingReport] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [updatingName, setUpdatingName] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editedDetails, setEditedDetails] = useState({
    crop: '',
    sowing_date: '',
    area_acres: '',
    sensor_node_id: '',
  });
  const [updatingDetails, setUpdatingDetails] = useState(false);

  useEffect(() => {
    if (!demoMode && !user) {
      navigate('/login');
      return;
    }
    if (demoMode) {
      fetchDemoField();
    } else {
      fetchField();
    }
  }, [id, user, navigate, demoMode]);

  // Demo mode: Generate mock field data
  const fetchDemoField = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Mock demo field data based on field ID
      const demoFields = {
        '1': {
          id: '1',
          name: 'Rice Field - North',
          cropName: 'Rice',
          cropStage: 'Vegetative',
          location: 'Tamil Nadu, India',
          sensor_node_id: 'ESP32_FIELD1',
          sowing_date: '2024-01-15',
          area_acres: 2.5,
        },
        '2': {
          id: '2',
          name: 'Wheat Field - South',
          cropName: 'Wheat',
          cropStage: 'Flowering',
          location: 'Tamil Nadu, India',
          sensor_node_id: 'ESP32_FIELD2',
          sowing_date: '2024-01-10',
          area_acres: 3.0,
        },
        '3': {
          id: '3',
          name: 'Cotton Field - East',
          cropName: 'Cotton',
          cropStage: 'Fruiting',
          location: 'Tamil Nadu, India',
          sensor_node_id: 'ESP32_FIELD3',
          sowing_date: '2024-01-05',
          area_acres: 4.5,
        },
      };
      
      const fieldData = demoFields[id] || demoFields['1'];
      setField(fieldData);
    } catch (err) {
      setError('Failed to load demo field data');
      console.error('Error loading demo field:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchField = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Validate field ID
      if (!id) {
        setError('Field ID is required');
        return;
      }
      
      // Fetch field from API
      const response = await fieldService.getField(id);
      const backendField = response.data;
      
      // Get user location (location is stored in user profile, not field)
      const userLocation = user?.location || 'Tamil Nadu, India';
      
      // Map backend format to frontend format
      const fieldData = {
        id: backendField.field_id,
        name: backendField.name,
        cropName: backendField.crop,
        cropStage: 'Vegetative', // Default stage (not stored in backend yet)
        location: userLocation, // Use user's location
        sensor_node_id: backendField.sensor_node_id, // Include sensor node ID from backend
        sowing_date: backendField.sowing_date, // Include sowing date from backend
        area_acres: backendField.area_acres, // Include area from backend
      };
      
      setField(fieldData);
    } catch (err) {
      if (err.response?.status === 404) {
        setError(t('fieldNotFound'));
      } else {
        setError(err.response?.data?.detail || 'Failed to load field data');
      }
      console.error('Error fetching field:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadGraphsReport = async () => {
    try {
      setGeneratingReport(true);
      setError('');
      
      const graphsData = await reportService.fetchGraphsData(field.id, '30d');
      const chartElements = document.querySelectorAll('.recharts-wrapper');
      
      if (chartElements.length === 0) {
        alert('No charts available to export');
        return;
      }
      
      await generateGraphsReport(field.name, Array.from(chartElements), t);
      alert(t('reportGenerated'));
    } catch (err) {
      setError(t('reportError'));
      console.error('Failed to generate graphs report:', err);
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleDownloadRecommendationsReport = async () => {
    try {
      setGeneratingReport(true);
      setError('');
      
      const recommendationsData = await reportService.fetchRecommendationsData(field.id);
      await generateRecommendationsReport(field.name, recommendationsData, t);
      alert(t('reportGenerated'));
    } catch (err) {
      setError(t('reportError'));
      console.error('Failed to generate recommendations report:', err);
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleDownloadWeatherReport = async () => {
    try {
      setGeneratingReport(true);
      setError('');
      
      const weatherData = await reportService.fetchWeatherData(field.location);
      await generateWeatherReport(field.location, weatherData, t);
      alert(t('reportGenerated'));
    } catch (err) {
      setError(t('reportError'));
      console.error('Failed to generate weather report:', err);
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleStartEditName = () => {
    setEditedName(field.name);
    setIsEditingName(true);
  };

  const handleCancelEditName = () => {
    setIsEditingName(false);
    setEditedName('');
  };

  const handleSaveFieldName = async () => {
    if (demoMode) {
      alert('Editing is disabled in demo mode. Please sign up to edit your fields.');
      return;
    }

    if (!editedName.trim()) {
      setError(t('fieldNameEmpty'));
      return;
    }

    if (editedName.trim() === field.name) {
      setIsEditingName(false);
      return;
    }

    try {
      setUpdatingName(true);
      setError('');
      
      const response = await fieldService.updateField(field.id, {
        name: editedName.trim()
      });
      
      // Update local field state
      setField({
        ...field,
        name: response.data.name
      });
      
      setIsEditingName(false);
      setEditedName('');
    } catch (err) {
      setError(err.response?.data?.detail || t('updateFieldNameError'));
      console.error('Error updating field name:', err);
    } finally {
      setUpdatingName(false);
    }
  };

  const handleStartEditDetails = () => {
    setEditedDetails({
      crop: field.cropName || '',
      sowing_date: field.sowing_date || '',
      area_acres: field.area_acres?.toString() || '',
      sensor_node_id: field.sensor_node_id || '',
    });
    setIsEditingDetails(true);
  };

  const handleCancelEditDetails = () => {
    setIsEditingDetails(false);
    setEditedDetails({
      crop: '',
      sowing_date: '',
      area_acres: '',
      sensor_node_id: '',
    });
  };

  const handleSaveFieldDetails = async () => {
    if (demoMode) {
      alert('Editing is disabled in demo mode. Please sign up to edit your fields.');
      return;
    }

    // Validate required fields
    if (!editedDetails.crop.trim()) {
      setError(t('required')); // Using existing translation key
      return;
    }
    if (!editedDetails.sowing_date) {
      setError(t('required'));
      return;
    }
    if (!editedDetails.area_acres || parseFloat(editedDetails.area_acres) <= 0) {
      setError(t('invalidArea'));
      return;
    }
    if (!editedDetails.sensor_node_id.trim()) {
      setError(t('required'));
      return;
    }

    try {
      setUpdatingDetails(true);
      setError('');
      
      const updateData = {
        crop: editedDetails.crop.trim(),
        sowing_date: editedDetails.sowing_date,
        area_acres: parseFloat(editedDetails.area_acres),
        sensor_node_id: editedDetails.sensor_node_id.trim(),
      };
      
      const response = await fieldService.updateField(field.id, updateData);
      
      // Update local field state
      setField({
        ...field,
        cropName: response.data.crop,
        sowing_date: response.data.sowing_date,
        area_acres: response.data.area_acres,
        sensor_node_id: response.data.sensor_node_id,
      });
      
      setIsEditingDetails(false);
    } catch (err) {
      setError(err.response?.data?.detail || t('updateFieldDetailsError'));
      console.error('Error updating field details:', err);
    } finally {
      setUpdatingDetails(false);
    }
  };

  const tabs = [
    { id: 'sensors', label: t('realTimeData') },
    { id: 'graphs', label: t('graphsTrends') },
    { id: 'recommendations', label: t('recommendations') },
    { id: 'chat', label: t('aiReasoning') },
    { id: 'weather', label: t('weatherAlerts') },
    { id: 'transparency', label: t('transparency') },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow">
          <LoadingSpinner />
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <ErrorMessage message={error} onRetry={fetchField} />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!field) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Demo Banner */}
          {demoMode && (
            <div className="bg-yellow-50 border-b border-yellow-200 py-3 mb-6 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium text-yellow-800">
                    Demo Mode - Using Sample Data
                  </span>
                </div>
                <Link to="/signup" className="text-sm text-yellow-700 hover:text-yellow-900 font-medium">
                  Create Account →
                </Link>
              </div>
            </div>
          )}

          {/* Field Header */}
          <div className="mb-6">
            <button
              onClick={() => navigate(demoMode ? '/demo' : '/dashboard')}
              className="text-primary-600 hover:text-primary-800 mb-4 text-sm sm:text-base"
            >
              ← {t('backToDashboard')}
            </button>
            <div className="flex items-center gap-3 flex-wrap">
              {!isEditingName ? (
                <>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 break-words">{field.name || 'Field'}</h1>
                  {!demoMode && (
                    <button
                      onClick={handleStartEditName}
                      className="p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Edit field name"
                    >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveFieldName();
                      } else if (e.key === 'Escape') {
                        handleCancelEditName();
                      }
                    }}
                    className="text-2xl sm:text-3xl font-bold text-gray-900 bg-white border-2 border-primary-500 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500 flex-1 min-w-0"
                    autoFocus
                    disabled={updatingName}
                  />
                  <button
                    onClick={handleSaveFieldName}
                    disabled={updatingName}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Save field name"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <button
                    onClick={handleCancelEditName}
                    disabled={updatingName}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Cancel editing"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
            {!isEditingDetails ? (
              <>
                <div className="mt-3 space-y-2">
                  <p className="text-gray-600 text-sm sm:text-base">
                    <span className="font-medium">{t('crop')}:</span> <span>{field.cropName || t('unknown')}</span>
                    <span className="hidden sm:inline mx-2">•</span>
                    <span className="block sm:inline"><span className="font-medium">{t('sowingDate')}:</span> <span>{field.sowing_date || t('unknown')}</span></span>
                    <span className="hidden sm:inline mx-2">•</span>
                    <span className="block sm:inline"><span className="font-medium">{t('area')}:</span> <span>{field.area_acres || t('unknown')} {t('areaAcres').includes('(') ? '' : 'acres'}</span></span>
                  </p>
                  {field.sensor_node_id && (
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">Sensor Node ID:</span>
                      <span className="text-xs font-mono font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded">
                        {field.sensor_node_id}
                      </span>
                    </div>
                  )}
                </div>
                {!demoMode && (
                  <button
                    onClick={handleStartEditDetails}
                    className="mt-3 px-3 py-1.5 text-sm text-primary-600 hover:text-primary-800 hover:bg-primary-50 rounded-lg transition-colors flex items-center gap-2"
                    title="Edit field details"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>{t('editDetails')}</span>
                  </button>
                )}
              </>
            ) : (
              <div className="mt-4 space-y-4 p-4 bg-gray-50 rounded-lg border-2 border-primary-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('cropName')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editedDetails.crop}
                      onChange={(e) => setEditedDetails({ ...editedDetails, crop: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="e.g., Rice, Wheat"
                      disabled={updatingDetails}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('sowingDate')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={editedDetails.sowing_date}
                      onChange={(e) => setEditedDetails({ ...editedDetails, sowing_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      disabled={updatingDetails}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('areaAcres')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={editedDetails.area_acres}
                      onChange={(e) => setEditedDetails({ ...editedDetails, area_acres: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="0.00"
                      disabled={updatingDetails}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sensor Node ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editedDetails.sensor_node_id}
                      onChange={(e) => setEditedDetails({ ...editedDetails, sensor_node_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
                      placeholder="e.g., ESP32_FIELD1"
                      disabled={updatingDetails}
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleSaveFieldDetails}
                    disabled={updatingDetails}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {updatingDetails ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleCancelEditDetails}
                    disabled={updatingDetails}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>Cancel</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto scrollbar-hide">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-xs sm:text-sm ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="card">
            <div className="flex justify-end mb-4 overflow-x-auto">
              {activeTab === 'graphs' && (
                <button
                  onClick={handleDownloadGraphsReport}
                  disabled={generatingReport}
                  className="btn-secondary flex items-center gap-2 text-sm"
                >
                  {generatingReport ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700"></div>
                      {t('generatingReport')}
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {t('downloadGraphsReport')}
                    </>
                  )}
                </button>
              )}
              {activeTab === 'recommendations' && (
                <button
                  onClick={handleDownloadRecommendationsReport}
                  disabled={generatingReport}
                  className="btn-secondary flex items-center gap-2 text-sm"
                >
                  {generatingReport ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700"></div>
                      {t('generatingReport')}
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {t('downloadRecommendationsReport')}
                    </>
                  )}
                </button>
              )}
              {activeTab === 'weather' && (
                <button
                  onClick={handleDownloadWeatherReport}
                  disabled={generatingReport}
                  className="btn-secondary flex items-center gap-2 text-sm"
                >
                  {generatingReport ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700"></div>
                      {t('generatingReport')}
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {t('downloadWeatherReport')}
                    </>
                  )}
                </button>
              )}
            </div>
            {activeTab === 'sensors' && field.id && <SensorDataTab fieldId={String(field.id)} sensorNodeId={field.sensor_node_id} />}
            {activeTab === 'graphs' && field.id && <GraphsTab fieldId={String(field.id)} />}
            {activeTab === 'recommendations' && field.id && <RecommendationsTab fieldId={String(field.id)} />}
            {activeTab === 'chat' && field.id && <AIChatTab fieldId={String(field.id)} />}
            {activeTab === 'weather' && field.id && <WeatherTab fieldId={String(field.id)} location={field.location} demoMode={demoMode} />}
            {activeTab === 'transparency' && field.id && <TransparencyTab fieldId={String(field.id)} />}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default FieldDetailPage;






