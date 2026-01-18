import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { weatherService } from '../../services/weatherService';
import WeatherCard from '../field/WeatherCard';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';

const WeatherTab = ({ fieldId, location, demoMode = false }) => {
  const { t } = useLanguage();
  const [weather, setWeather] = useState(null);
  const [summary, setSummary] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (demoMode) {
      loadDemoWeatherData();
    } else {
      getLocationAndFetchWeather();
    }
  }, [fieldId, location, demoMode]);

  // Load mock weather data for demo mode
  const loadDemoWeatherData = () => {
    try {
      setLoading(true);
      setError('');
      
      // Mock weather data for demo
      const mockWeather = {
        current: {
          temperature: 28.5,
          humidity: 65,
          windSpeed: 12.3,
          condition: 'partly_cloudy',
          rain: 0,
          feelsLike: 30.2
        },
        minutely: [
          { time: 0, precipitation: 0 },
          { time: 10, precipitation: 0 },
          { time: 20, precipitation: 0.1 },
          { time: 30, precipitation: 0.2 },
          { time: 40, precipitation: 0.1 },
          { time: 50, precipitation: 0 }
        ],
        hourly: Array.from({ length: 48 }, (_, i) => ({
          time: new Date(Date.now() + i * 60 * 60 * 1000).toISOString(),
          temperature: 26 + Math.sin(i / 12) * 4,
          humidity: 60 + Math.sin(i / 8) * 10,
          windSpeed: 8 + Math.random() * 8,
          condition: ['clear', 'partly_cloudy', 'cloudy'][Math.floor(Math.random() * 3)],
          rain: Math.random() > 0.7 ? Math.random() * 2 : 0
        })),
        daily: Array.from({ length: 8 }, (_, i) => ({
          date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString(),
          tempMin: 22 + Math.sin(i) * 3,
          tempMax: 32 + Math.cos(i) * 4,
          condition: ['clear', 'partly_cloudy', 'cloudy', 'rain'][Math.floor(Math.random() * 4)],
          rain: Math.random() > 0.5 ? Math.random() * 5 : 0,
          humidity: 60 + Math.random() * 20
        })),
        location: 'Tamil Nadu, India'
      };

      const mockSummary = {
        summaryToday: 'Partly cloudy skies with temperatures reaching 32°C. Light winds from the southwest. No significant rainfall expected today. Ideal conditions for field work.',
        summaryTomorrow: 'Similar weather pattern continues tomorrow with partly cloudy conditions. Slight chance of light showers in the evening. Temperatures will range between 24°C and 33°C.',
        location: 'Tamil Nadu, India'
      };

      const mockAlerts = [
        {
          event: 'High Humidity Alert',
          severity: 'moderate',
          description: 'Relative humidity levels above 70% expected in the next 24 hours. Monitor crop health for disease development.',
          start: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
          end: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString()
        },
        {
          event: 'Wind Advisory',
          severity: 'minor',
          description: 'Moderate winds (15-20 km/h) expected. Suitable conditions for spraying operations.',
          start: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
          end: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString()
        }
      ];

      setWeather(mockWeather);
      setSummary(mockSummary);
      setAlerts(mockAlerts);
      setLoading(false);
    } catch (err) {
      setError('Failed to load demo weather data');
      setLoading(false);
    }
  };

  const getLocationAndFetchWeather = () => {
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser. Please enable location services.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    // Request user's current position
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        await fetchWeatherData(latitude, longitude);
      },
      (error) => {
        // Handle geolocation errors
        let errorMessage = 'Failed to get your location. ';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Location permission denied. Please allow location access to view weather data.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage += 'Location request timed out. Please try again.';
            break;
          default:
            errorMessage += 'An unknown error occurred while getting your location.';
            break;
        }
        setError(errorMessage);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const fetchWeatherData = async (latitude, longitude) => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch live weather, summary, and alerts in parallel
      const [liveRes, summaryRes, alertsRes] = await Promise.all([
        weatherService.getLiveWeather(latitude, longitude),
        weatherService.getWeatherSummary(latitude, longitude),
        weatherService.getWeatherAlerts(latitude, longitude)
      ]);
      
      const liveData = liveRes.data;
      const summaryData = summaryRes.data;
      const alertsData = alertsRes.data;
      
      // Map backend snake_case to frontend camelCase for live weather
      setWeather({
        current: {
          temperature: liveData.current.temperature,
          humidity: liveData.current.humidity,
          windSpeed: liveData.current.wind_speed,
          condition: liveData.current.condition,
          rain: liveData.current.rain,
          feelsLike: liveData.current.feels_like
        },
        minutely: liveData.minutely || [],
        hourly: liveData.hourly || [],
        daily: liveData.daily || [],
        location: liveData.location
      });
      
      // Set AI summary
      setSummary({
        summaryToday: summaryData.summary_today,
        summaryTomorrow: summaryData.summary_tomorrow,
        location: summaryData.location
      });
      
      // Map alerts to frontend format
      const formattedAlerts = (alertsData.alerts || []).map(alert => ({
        event: alert.event,
        severity: alert.severity,
        description: alert.description,
        start: alert.start,
        end: alert.end
      }));
      setAlerts(formattedAlerts);
      
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to load weather data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={getLocationAndFetchWeather} />;
  }

  return <WeatherCard weather={weather} summary={summary} alerts={alerts} />;
};

export default WeatherTab;