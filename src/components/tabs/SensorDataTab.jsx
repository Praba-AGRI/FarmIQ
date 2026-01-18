import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { sensorService } from '../../services/sensorService';
import SensorGauge from '../field/SensorGauge';
import SoilTemperatureGauge from '../field/SoilTemperatureGauge';
import LightIntensityGauge from '../field/LightIntensityGauge';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';

const SensorDataTab = ({ fieldId, sensorNodeId }) => {
  const { t } = useLanguage();
  const [sensorData, setSensorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    fetchSensorData();
    // Refresh data every 30 seconds
    const interval = setInterval(fetchSensorData, 30000);
    return () => clearInterval(interval);
  }, [fieldId]);

  const fetchSensorData = async () => {
    try {
      setError('');
      // Show loading only on initial load, not on refresh
      if (!sensorData) {
        setLoading(true);
      }
      
      const response = await sensorService.getCurrentReadings(fieldId);
      const backendData = response.data;
      
      setSensorData({
        airTemperature: backendData.air_temp,
        relativeHumidity: backendData.air_humidity,
        soilMoisture: backendData.soil_moisture,
        soilTemperature: backendData.soil_temp,
        lightIntensity: backendData.light_lux,
        windSpeed: backendData.wind_speed || null,
      });
      
      setLastUpdated(new Date(backendData.timestamp || Date.now()));
    } catch (err) {
      // Only show error if we don't have existing data
      if (!sensorData) {
        setError('Failed to load sensor data. Please ensure sensor is connected and sending data.');
      } else {
        // On refresh error, keep existing data but show a subtle error
        console.error('Error refreshing sensor data:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get status based on value ranges
  const getStatusInfo = (type, value) => {
    // Handle null/undefined values
    if (value === null || value === undefined || isNaN(value)) {
      return { color: 'gray', label: t('noData') };
    }

    const statuses = {
      airTemperature: {
        good: { min: 20, max: 35, color: 'green', label: t('optimal') },
        warning: { min: 15, max: 40, color: 'yellow', label: t('moderate') },
        critical: { color: 'red', label: t('extreme') },
      },
      relativeHumidity: {
        good: { min: 50, max: 80, color: 'green', label: t('optimal') },
        warning: { min: 40, max: 90, color: 'yellow', label: t('moderate') },
        critical: { color: 'red', label: t('extreme') },
      },
      soilMoisture: {
        good: { min: 50, max: 80, color: 'green', label: t('optimal') },
        warning: { min: 30, max: 95, color: 'yellow', label: t('moderate') },
        critical: { color: 'red', label: t('critical') },
      },
      soilTemperature: {
        good: { min: 18, max: 30, color: 'green', label: t('optimal') },
        warning: { min: 15, max: 35, color: 'yellow', label: t('moderate') },
        critical: { color: 'red', label: t('extreme') },
      },
    };

    const status = statuses[type];
    if (!status) return { color: 'gray', label: t('normal') };

    if (value >= status.good.min && value <= status.good.max) {
      return status.good;
    } else if (value >= status.warning.min && value <= status.warning.max) {
      return status.warning;
    }
    return status.critical;
  };

  // Format last updated time
  const formatLastUpdated = (date) => {
    if (!date) return t('never');
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return t('justNow');
    if (diff < 3600) return `${Math.floor(diff / 60)} ${t('minAgo')}`;
    if (diff < 86400) {
      const hours = Math.floor(diff / 3600);
      return `${hours} ${hours > 1 ? t('hoursAgo') : t('hourAgo')}`;
    }
    return date.toLocaleString();
  };

  // Initialize sensorData with null values if not loaded yet
  const displayData = sensorData || {
    airTemperature: null,
    relativeHumidity: null,
    soilMoisture: null,
    soilTemperature: null,
    lightIntensity: null,
    windSpeed: null,
  };

  // Sensor Icons
  const AirTemperatureIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );

  const HumidityIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
    </svg>
  );

  const SoilMoistureIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
    </svg>
  );

  const SoilTemperatureIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );

  const LightIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );

  const WindIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );

  const ClockIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  const RefreshIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );

  return (
    <div className="space-y-6">
      {/* Error Message at Top */}
      {error && (
        <ErrorMessage message={error} onRetry={fetchSensorData} />
      )}

      {/* Loading State - show spinner overlay if initial load */}
      {loading && !sensorData && (
        <div className="text-center py-8">
          <LoadingSpinner />
        </div>
      )}

      {/* Header with last updated and refresh */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">{t('realTimeData')}</h3>
          {sensorNodeId && (
            <p className="text-sm text-gray-600 mb-2">
              {t('sensorNodeId')}: <span className="font-mono font-semibold text-gray-700">{sensorNodeId}</span>
            </p>
          )}
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <ClockIcon />
            <span>{t('lastUpdated')}: {formatLastUpdated(lastUpdated)}</span>
          </div>
        </div>
        <button
          onClick={fetchSensorData}
          className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
          title={t('refreshSensorData')}
        >
          <RefreshIcon />
          <span>{t('refresh')}</span>
        </button>
      </div>

      {/* Primary Sensors - Critical Monitoring */}
      <div>
        <div className="flex items-center space-x-2 mb-4">
          <div className="w-1 h-6 bg-primary-600 rounded-full"></div>
          <h4 className="text-lg font-semibold text-gray-800">{t('primarySensors')}</h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Air Temperature */}
          <div className="card bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-orange-500 rounded-lg text-white">
                  <AirTemperatureIcon />
                </div>
                <div>
                  <h5 className="font-semibold text-gray-900">{t('airTemperature')}</h5>
                  <p className="text-xs text-gray-600">{t('airTemperatureSubtitle')}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                getStatusInfo('airTemperature', displayData.airTemperature).color === 'green' 
                  ? 'bg-green-100 text-green-800' 
                  : getStatusInfo('airTemperature', displayData.airTemperature).color === 'yellow'
                  ? 'bg-yellow-100 text-yellow-800'
                  : getStatusInfo('airTemperature', displayData.airTemperature).color === 'gray'
                  ? 'bg-gray-100 text-gray-600'
                  : 'bg-red-100 text-red-800'
              }`}>
                {getStatusInfo('airTemperature', displayData.airTemperature).label}
              </span>
            </div>
            <div className="flex justify-center">
              <SensorGauge
                label=""
                value={displayData.airTemperature}
                unit="°C"
                min={0}
                max={50}
                color="orange"
              />
            </div>
            <div className="mt-4 pt-4 border-t border-orange-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('range')}:</span>
                <span className="font-semibold text-gray-900">0 - 50°C</span>
              </div>
            </div>
          </div>

          {/* Relative Humidity */}
          <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-blue-500 rounded-lg text-white">
                  <HumidityIcon />
                </div>
                <div>
                  <h5 className="font-semibold text-gray-900">{t('relativeHumidity')}</h5>
                  <p className="text-xs text-gray-600">{t('humidityLevel')}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                getStatusInfo('relativeHumidity', displayData.relativeHumidity).color === 'green' 
                  ? 'bg-green-100 text-green-800' 
                  : getStatusInfo('relativeHumidity', displayData.relativeHumidity).color === 'yellow'
                  ? 'bg-yellow-100 text-yellow-800'
                  : getStatusInfo('relativeHumidity', displayData.relativeHumidity).color === 'gray'
                  ? 'bg-gray-100 text-gray-600'
                  : 'bg-red-100 text-red-800'
              }`}>
                {getStatusInfo('relativeHumidity', displayData.relativeHumidity).label}
              </span>
            </div>
            <div className="flex justify-center">
              <SensorGauge
                label=""
                value={displayData.relativeHumidity}
                unit="%"
                min={0}
                max={100}
                color="blue"
              />
            </div>
            <div className="mt-4 pt-4 border-t border-blue-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('range')}:</span>
                <span className="font-semibold text-gray-900">0 - 100%</span>
              </div>
            </div>
          </div>

          {/* Soil Moisture */}
          <div className="card bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-green-500 rounded-lg text-white">
                  <SoilMoistureIcon />
                </div>
                <div>
                  <h5 className="font-semibold text-gray-900">{t('soilMoisture')}</h5>
                  <p className="text-xs text-gray-600">{t('moistureContent')}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                getStatusInfo('soilMoisture', displayData.soilMoisture).color === 'green' 
                  ? 'bg-green-100 text-green-800' 
                  : getStatusInfo('soilMoisture', displayData.soilMoisture).color === 'yellow'
                  ? 'bg-yellow-100 text-yellow-800'
                  : getStatusInfo('soilMoisture', displayData.soilMoisture).color === 'gray'
                  ? 'bg-gray-100 text-gray-600'
                  : 'bg-red-100 text-red-800'
              }`}>
                {getStatusInfo('soilMoisture', displayData.soilMoisture).label}
              </span>
            </div>
            <div className="flex justify-center">
              <SensorGauge
                label=""
                value={displayData.soilMoisture}
                unit="%"
                min={0}
                max={100}
                color="green"
              />
            </div>
            <div className="mt-4 pt-4 border-t border-green-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('range')}:</span>
                <span className="font-semibold text-gray-900">0 - 100%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Sensors */}
      <div>
        <div className="flex items-center space-x-2 mb-4">
          <div className="w-1 h-6 bg-purple-600 rounded-full"></div>
          <h4 className="text-lg font-semibold text-gray-800">{t('secondarySensors')}</h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Soil Temperature */}
          <div className="card bg-gradient-to-br from-amber-50 to-amber-100 border-2 border-amber-200 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-amber-600 rounded-lg text-white">
                  <SoilTemperatureIcon />
                </div>
                <div>
                  <h5 className="font-semibold text-gray-900">{t('soilTemperature')}</h5>
                  <p className="text-xs text-gray-600">{t('soilTemp')}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                getStatusInfo('soilTemperature', displayData.soilTemperature).color === 'green' 
                  ? 'bg-green-100 text-green-800' 
                  : getStatusInfo('soilTemperature', displayData.soilTemperature).color === 'yellow'
                  ? 'bg-yellow-100 text-yellow-800'
                  : getStatusInfo('soilTemperature', displayData.soilTemperature).color === 'gray'
                  ? 'bg-gray-100 text-gray-600'
                  : 'bg-red-100 text-red-800'
              }`}>
                {getStatusInfo('soilTemperature', displayData.soilTemperature).label}
              </span>
            </div>
            <div className="flex justify-center">
              <SoilTemperatureGauge
                label=""
                value={displayData.soilTemperature}
                unit="°C"
                min={0}
                max={50}
              />
            </div>
            <div className="mt-4 pt-4 border-t border-amber-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('range')}:</span>
                <span className="font-semibold text-gray-900">0 - 50°C</span>
              </div>
            </div>
          </div>

          {/* Light Intensity */}
          <div className="card bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-200 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-yellow-500 rounded-lg text-white">
                  <LightIcon />
                </div>
                <div>
                  <h5 className="font-semibold text-gray-900">{t('lightIntensity')}</h5>
                  <p className="text-xs text-gray-600">{t('lightLevel')}</p>
                </div>
              </div>
              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                {t('active')}
              </span>
            </div>
            <div className="flex justify-center">
              <LightIntensityGauge
                label=""
                value={displayData.lightIntensity}
                unit="lux"
                min={0}
                max={1000}
              />
            </div>
            <div className="mt-4 pt-4 border-t border-yellow-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('range')}:</span>
                <span className="font-semibold text-gray-900">0 - 1000 lux</span>
              </div>
            </div>
          </div>

          {/* Wind Speed */}
          <div className="card bg-gradient-to-br from-cyan-50 to-cyan-100 border-2 border-cyan-200 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-cyan-500 rounded-lg text-white">
                  <WindIcon />
                </div>
                <div>
                  <h5 className="font-semibold text-gray-900">{t('windSpeed')}</h5>
                  <p className="text-xs text-gray-600">{t('windVelocity')}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                displayData.windSpeed !== null && displayData.windSpeed !== undefined
                  ? 'bg-gray-100 text-gray-800'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {displayData.windSpeed !== null && displayData.windSpeed !== undefined ? t('normal') : t('noData')}
              </span>
            </div>
            <div className="flex justify-center">
              <SensorGauge
                label=""
                value={displayData.windSpeed}
                unit="km/h"
                min={0}
                max={50}
                color="blue"
              />
            </div>
            <div className="mt-4 pt-4 border-t border-cyan-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('range')}:</span>
                <span className="font-semibold text-gray-900">0 - 50 km/h</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SensorDataTab;