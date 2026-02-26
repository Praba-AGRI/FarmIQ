import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { fieldService } from '../services/fieldService';
import { recommendationService } from '../services/recommendationService';
import { weatherService } from '../services/weatherService';
import { sensorService } from '../services/sensorService';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import FieldList from '../components/dashboard/FieldList';
import AddFieldModal from '../components/dashboard/AddFieldModal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { RECOMMENDATION_STATUS } from '../utils/constants';
import marketCommunityService from '../services/marketCommunityService';
import { TrendingUp, TrendingDown, Minus, Bug, Leaf, Users, ShoppingCart } from 'lucide-react';

const DashboardPage = ({ demoMode = false }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [communityAlerts, setCommunityAlerts] = useState([]);
  const [marketPrices, setMarketPrices] = useState([]);

  useEffect(() => {
    const MOCK_ALERTS = [
      { farmer_name: 'Rajesh Kumar', crop: 'maize', disease_alert: 'Leaf Blight', pest_alert: null, severity: 'HIGH' },
      { farmer_name: 'Senthil Nathan', crop: 'maize', disease_alert: null, pest_alert: 'Fall Armyworm', severity: 'HIGH' },
    ];
    const MOCK_PRICES = [
      { crop_name: 'maize', current_price: 22.5, demand_trend: 'rising' },
      { crop_name: 'wheat', current_price: 25.0, demand_trend: 'stable' },
      { crop_name: 'tomato', current_price: 18.0, demand_trend: 'falling' },
    ];
    Promise.all([
      marketCommunityService.getCommunityAlerts().catch(() => ({ alerts: MOCK_ALERTS })),
      marketCommunityService.getMarketPrices().catch(() => MOCK_PRICES),
    ]).then(([alertRes, priceRes]) => {
      setCommunityAlerts((alertRes?.alerts || alertRes || []).slice(0, 3));
      setMarketPrices((Array.isArray(priceRes) ? priceRes : priceRes?.prices || []).slice(0, 3));
    });
  }, []);

  useEffect(() => {
    if (!demoMode && !user) {
      navigate('/login');
      return;
    }

    if (demoMode) {
      fetchDemoFields();
    } else {
      fetchFields();
    }
  }, [user, navigate, demoMode]);

  const fetchRecommendations = async (fieldId) => {
    try {
      // Mock data for demonstration - replace with actual API call
      // const response = await recommendationService.getRecommendations(fieldId);
      // return response.data.recommendations || [];

      // Mock recommendations data
      if (fieldId === 1) {
        return [
          {
            id: 1,
            title: t('irrigation'),
            description: 'Irrigate the field with 2 inches of water. Current soil moisture is below optimal levels.',
            status: RECOMMENDATION_STATUS.DO_NOW,
            timing: 'Within next 6 hours',
          },
          {
            id: 2,
            title: t('nutrients'),
            description: 'Apply nitrogen fertilizer at recommended dosage.',
            status: RECOMMENDATION_STATUS.WAIT,
            timing: 'After 2 days',
          },
        ];
      } else {
        return [
          {
            id: 1,
            title: t('pestRisk'),
            description: 'Monitor for pest activity. High humidity conditions favor pest development.',
            status: RECOMMENDATION_STATUS.MONITOR,
            timing: 'Daily monitoring',
          },
        ];
      }
    } catch (err) {
      console.error('Failed to fetch recommendations:', err);
      return [];
    }
  };

  const fetchWeatherAlerts = async (location) => {
    try {
      // Mock data for demonstration - replace with actual API call
      // const response = await weatherService.getAlerts(location);
      // return response.data.alerts || [];

      // Mock weather alerts data
      if (location === 'Tamil Nadu, India') {
        return [
          {
            type: 'rainfall',
            title: 'Rainfall Alert',
            message: 'Light rain expected in next 24 hours. Avoid irrigation during this period.',
          },
          {
            type: 'humidity',
            title: 'High Humidity Alert',
            message: 'High humidity conditions may increase disease risk. Monitor crop health.',
          },
        ];
      } else {
        return [
          {
            type: 'spray',
            title: 'Spray Caution',
            message: 'Wind conditions are suitable for spraying. Avoid spraying if rain is expected.',
          },
        ];
      }
    } catch (err) {
      console.error('Failed to fetch weather alerts:', err);
      return [];
    }
  };

  const fetchSensorData = async (fieldId) => {
    try {
      const response = await sensorService.getCurrentReadings(fieldId);
      const backendData = response.data;

      // If we get an empty response or error, backendData might be null/empty
      if (!backendData) return null;

      return {
        airTemperature: backendData.air_temp,
        relativeHumidity: backendData.air_humidity,
        soilMoisture: backendData.soil_moisture,
        soilTemperature: backendData.soil_temp,
        lightIntensity: backendData.light_lux,
        windSpeed: backendData.wind_speed || null,
      };
    } catch (err) {
      // If 404 (no data found), simply return null so UI shows "No Data"
      if (err.response && err.response.status === 404) {
        return null;
      }
      console.error('Failed to fetch sensor data:', err);
      return null;
    }
  };

  // Demo mode: Generate mock fields
  const fetchDemoFields = async () => {
    try {
      setLoading(true);
      setError('');

      // Mock demo fields data
      const mockFieldsData = [
        {
          id: 1,
          name: 'Rice Field - North',
          cropName: 'Rice',
          cropStage: 'Vegetative',
          soilMoisture: 45,
          hasAlert: true,
          location: 'Tamil Nadu, India',
          sensor_node_id: 'ESP32_FIELD1',
        },
        {
          id: 2,
          name: 'Wheat Field - South',
          cropName: 'Wheat',
          cropStage: 'Flowering',
          soilMoisture: 65,
          hasAlert: false,
          location: 'Tamil Nadu, India',
          sensor_node_id: 'ESP32_FIELD2',
        },
        {
          id: 3,
          name: 'Cotton Field - East',
          cropName: 'Cotton',
          cropStage: 'Fruiting',
          soilMoisture: 55,
          hasAlert: true,
          location: 'Tamil Nadu, India',
          sensor_node_id: 'ESP32_FIELD3',
        },
      ];

      // Fetch recommendations, weather alerts, and sensor data for each field
      const enrichedFields = await Promise.all(
        mockFieldsData.map(async (field) => {
          const [recommendations, weatherAlerts, sensorData] = await Promise.all([
            fetchRecommendations(field.id),
            fetchWeatherAlerts(field.location),
            fetchSensorData(field.id),
          ]);

          // Sort recommendations by priority
          const sortedRecommendations = recommendations.sort((a, b) => {
            const priority = {
              [RECOMMENDATION_STATUS.DO_NOW]: 1,
              [RECOMMENDATION_STATUS.WAIT]: 2,
              [RECOMMENDATION_STATUS.MONITOR]: 3,
            };
            return (priority[a.status] || 99) - (priority[b.status] || 99);
          });

          // Update soil moisture from sensor data if available
          const updatedSoilMoisture = sensorData?.soilMoisture || field.soilMoisture;
          // Determine if there are alerts
          const hasAlert = sortedRecommendations.some(rec => rec.status === RECOMMENDATION_STATUS.DO_NOW) ||
            (weatherAlerts && weatherAlerts.length > 0);

          return {
            ...field,
            soilMoisture: updatedSoilMoisture,
            hasAlert,
            recommendations: sortedRecommendations,
            weatherAlerts,
            sensorData,
          };
        })
      );

      setFields(enrichedFields);
    } catch (err) {
      setError('Failed to load demo fields');
      console.error('Error loading demo fields:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFields = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch fields from API
      const response = await fieldService.getAllFields();
      const backendFields = response.data || [];

      // Map backend format to frontend format
      // Note: Backend doesn't store location in field, use user's location
      const userLocation = user?.location || 'Tamil Nadu, India';
      const fieldsData = backendFields.map(field => ({
        id: field.field_id,
        name: field.name,
        cropName: field.crop,
        cropStage: 'Vegetative', // Default stage (not stored in backend yet)
        soilMoisture: null, // Default, will be updated from sensor data
        hasAlert: false, // Will be determined from recommendations/alerts
        location: userLocation, // Use user's location
        sensor_node_id: field.sensor_node_id, // Include sensor node ID from backend
      }));

      // Fetch recommendations, weather alerts, and sensor data for each field
      const enrichedFields = await Promise.all(
        fieldsData.map(async (field) => {
          const [recommendations, weatherAlerts, sensorData] = await Promise.all([
            fetchRecommendations(field.id),
            fetchWeatherAlerts(field.location || 'Tamil Nadu, India'),
            fetchSensorData(field.id),
          ]);

          // Sort recommendations by priority (DO_NOW first, then WAIT, then MONITOR)
          const sortedRecommendations = recommendations.sort((a, b) => {
            const priority = {
              [RECOMMENDATION_STATUS.DO_NOW]: 1,
              [RECOMMENDATION_STATUS.WAIT]: 2,
              [RECOMMENDATION_STATUS.MONITOR]: 3,
            };
            return (priority[a.status] || 99) - (priority[b.status] || 99);
          });

          // Update soil moisture from sensor data if available
          const updatedSoilMoisture = sensorData?.soilMoisture || field.soilMoisture;
          // Determine if there are alerts (urgent recommendations or weather alerts)
          const hasAlert = sortedRecommendations.some(rec => rec.status === RECOMMENDATION_STATUS.DO_NOW) ||
            (weatherAlerts && weatherAlerts.length > 0);

          return {
            ...field,
            soilMoisture: updatedSoilMoisture,
            hasAlert,
            recommendations: sortedRecommendations,
            weatherAlerts,
            sensorData,
          };
        })
      );

      setFields(enrichedFields);
    } catch (err) {
      setError('Failed to load fields. Please try again.');
      console.error('Error fetching fields:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddField = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmitField = async (fieldData) => {
    // In demo mode, don't allow creating fields
    if (demoMode) {
      alert('Creating fields is disabled in demo mode. Please sign up to create your own fields.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      // Call API to create field (location is not stored in field, use from form or user profile)
      const response = await fieldService.createField({
        name: fieldData.name,
        crop: fieldData.crop,
        sowing_date: fieldData.sowing_date,
        area_acres: fieldData.area_acres,
        sensor_node_id: fieldData.sensor_node_id,
      });

      const createdField = response.data;

      // Get user location for weather data (location is stored in user profile, not field)
      const userLocation = user?.location || fieldData.location || 'Tamil Nadu, India';

      // Map backend response to frontend format
      const newField = {
        id: createdField.field_id,
        name: createdField.name,
        cropName: createdField.crop,
        cropStage: 'Vegetative', // Default stage
        soilMoisture: null, // Default value, will be updated from sensor data
        hasAlert: false,
        location: userLocation, // Use user's location or form location
        sensor_node_id: createdField.sensor_node_id, // Include sensor node ID from backend
        recommendations: [],
        weatherAlerts: [],
        sensorData: null,
      };

      // Fetch recommendations, weather alerts, and sensor data for the new field
      const [recommendations, weatherAlerts, sensorData] = await Promise.all([
        fetchRecommendations(newField.id),
        fetchWeatherAlerts(newField.location),
        fetchSensorData(newField.id),
      ]);

      const sortedRecommendations = recommendations.sort((a, b) => {
        const priority = {
          [RECOMMENDATION_STATUS.DO_NOW]: 1,
          [RECOMMENDATION_STATUS.WAIT]: 2,
          [RECOMMENDATION_STATUS.MONITOR]: 3,
        };
        return (priority[a.status] || 99) - (priority[b.status] || 99);
      });

      // Update soil moisture from sensor data if available
      const updatedSoilMoisture = sensorData?.soilMoisture || newField.soilMoisture;
      // Determine if there are alerts
      const hasAlert = sortedRecommendations.some(rec => rec.status === RECOMMENDATION_STATUS.DO_NOW) ||
        (weatherAlerts && weatherAlerts.length > 0);

      const enrichedField = {
        ...newField,
        soilMoisture: updatedSoilMoisture,
        hasAlert,
        recommendations: sortedRecommendations,
        weatherAlerts,
        sensorData,
      };

      // Refresh fields list from API to ensure consistency
      await fetchFields();
      setIsModalOpen(false);

      // Show success message
      alert(t('fieldCreated'));
    } catch (err) {
      setError(err.response?.data?.detail || t('fieldCreateError'));
      console.error('Failed to create field:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

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

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      {demoMode && (
        <div className="bg-yellow-50 border-b border-yellow-200 py-3">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
        </div>
      )}
      <main className="flex-grow bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('myFields')}</h1>
            {!demoMode && (
              <button onClick={handleAddField} className="btn-primary w-full sm:w-auto">
                {t('addNewField')}
              </button>
            )}
          </div>

          {/* Community Alert Banner */}
          {communityAlerts.length > 0 && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-red-600"><Bug className="w-4 h-4" /></span>
                  <h3 className="text-sm font-bold text-red-800">⚠ Community Pest & Disease Alerts Nearby</h3>
                </div>
                <Link to="/community" className="text-xs text-red-600 hover:text-red-800 font-semibold underline">View All →</Link>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                {communityAlerts.map((a, i) => (
                  <div key={i} className={`text-xs rounded-xl px-3 py-2 border flex items-center gap-1.5 ${a.severity === 'HIGH' ? 'bg-red-100 text-red-800 border-red-200' : 'bg-amber-100 text-amber-800 border-amber-200'
                    }`}>
                    {a.pest_alert ? <Bug className="w-3 h-3 flex-shrink-0" /> : <Leaf className="w-3 h-3 flex-shrink-0" />}
                    <span><strong>{a.farmer_name}</strong> ({a.crop}) — {a.pest_alert || a.disease_alert}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Market Summary Widget */}
          {marketPrices.length > 0 && (
            <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {marketPrices.map((p, i) => {
                const Icon = p.demand_trend === 'rising' ? TrendingUp : p.demand_trend === 'falling' ? TrendingDown : Minus;
                const cls = p.demand_trend === 'rising' ? 'text-green-600 bg-green-50 border-green-100' : p.demand_trend === 'falling' ? 'text-red-600 bg-red-50 border-red-100' : 'text-yellow-600 bg-yellow-50 border-yellow-100';
                return (
                  <Link key={i} to="/market" className={`flex items-center justify-between p-3 rounded-2xl border hover:shadow-sm transition-shadow ${cls}`}>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider opacity-70"><ShoppingCart className="inline w-3 h-3 mr-1" />Market</p>
                      <p className="text-sm font-bold capitalize">{p.crop_name}</p>
                      <p className="text-xl font-black">₹{p.current_price}/kg</p>
                    </div>
                    <Icon className="w-8 h-8 opacity-50" />
                  </Link>
                );
              })}
              <Link to="/community" className="flex items-center justify-between p-3 rounded-2xl border border-blue-100 bg-blue-50 text-blue-700 hover:shadow-sm transition-shadow">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-70"><Users className="inline w-3 h-3 mr-1" />Community</p>
                  <p className="text-sm font-bold">Nearby Farmers</p>
                  <p className="text-xl font-black">7 Active</p>
                </div>
                <Users className="w-8 h-8 opacity-40" />
              </Link>
            </div>
          )}

          {error && <ErrorMessage message={error} onRetry={fetchFields} />}

          {fields.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-gray-600 mb-4">{t('noFields')}</p>
              <button onClick={handleAddField} className="btn-primary">
                {t('addNewField')}
              </button>
            </div>
          ) : (
            <FieldList fields={fields} demoMode={demoMode} />
          )}
        </div>
      </main>
      <Footer />
      <AddFieldModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmitField}
        loading={isSubmitting}
      />
    </div>
  );
};

export default DashboardPage;






