import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { sensorService } from '../../services/sensorService';
import { TIME_RANGES } from '../../utils/constants';
import LineChart from '../field/LineChart';
import LoadingSpinner from '../common/LoadingSpinner';

const GraphsTab = ({ fieldId }) => {
  const { t } = useLanguage();
  const [timeRange, setTimeRange] = useState(TIME_RANGES.LAST_24H);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchChartData();
  }, [fieldId, timeRange]);

  const transformSensorData = (backendData, range) => {
    if (!backendData || !Array.isArray(backendData) || backendData.length === 0) {
      return [];
    }

    return backendData.map(item => {
      // Format timestamp based on range
      const date = new Date(item.timestamp);
      let timeLabel;
      
      if (range === TIME_RANGES.LAST_24H) {
        // Format as "HH:MM" for 24h range
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        timeLabel = `${hours}:${minutes}`;
      } else {
        // Format as "MMM DD" for 7d/30d ranges
        timeLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
      
      return {
        time: timeLabel,
        temperature: item.air_temp,
        humidity: item.air_humidity,
        soilMoisture: item.soil_moisture,
        soilTemperature: item.soil_temp,
        lightIntensity: item.light_lux,
        windSpeed: item.wind_speed || null,
      };
    });
  };

  const fetchChartData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Try requested range first
      let response;
      let transformedData = [];
      
      try {
        response = await sensorService.getHistoricalData(fieldId, timeRange);
        transformedData = transformSensorData(response.data, timeRange);
      } catch (err) {
        console.error('Error fetching data for requested range:', err);
      }
      
      // If no data, try fallback ranges
      if (transformedData.length === 0) {
        const fallbackRanges = [TIME_RANGES.LAST_7D, TIME_RANGES.LAST_30D];
        for (const fallbackRange of fallbackRanges) {
          try {
            const fallbackResponse = await sensorService.getHistoricalData(fieldId, fallbackRange);
            const fallbackData = transformSensorData(fallbackResponse.data, fallbackRange);
            if (fallbackData.length > 0) {
              transformedData = fallbackData;
              setError(`No data for selected time range. Showing available past readings.`);
              break;
            }
          } catch (e) {
            continue;
          }
        }
      }
      
      // If still no data, set appropriate error message
      if (transformedData.length === 0) {
        setError('No sensor data available. Please ensure sensor is connected and sending data.');
      }
      
      setChartData(transformedData);
    } catch (err) {
      console.error('Error fetching chart data:', err);
      setError(err.response?.data?.detail || 'Failed to load chart data. Please ensure sensor is connected and sending data.');
      setChartData([]);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics for each metric
  const calculateStats = (dataKey) => {
    if (!chartData || chartData.length === 0) return { min: null, max: null, avg: null };
    const values = chartData.map(d => d[dataKey]).filter(v => v !== null && v !== undefined);
    if (values.length === 0) return { min: null, max: null, avg: null };
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return { min, max, avg };
  };

  // Sensor Icons
  const AirTemperatureIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );

  const HumidityIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
    </svg>
  );

  const SoilMoistureIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
    </svg>
  );

  const SoilTemperatureIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );

  const LightIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );

  const WindIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );

  const ChartIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );

  const hasData = chartData && chartData.length > 0;

  const charts = [
    {
      key: 'temperature',
      label: t('airTemperature'),
      icon: AirTemperatureIcon,
      color: '#f97316',
      unit: '°C',
      bgColor: 'from-orange-50 to-orange-100',
      borderColor: 'border-orange-200',
      iconBg: 'bg-orange-500',
    },
    {
      key: 'humidity',
      label: t('relativeHumidity'),
      icon: HumidityIcon,
      color: '#2563eb',
      unit: '%',
      bgColor: 'from-blue-50 to-blue-100',
      borderColor: 'border-blue-200',
      iconBg: 'bg-blue-500',
    },
    {
      key: 'soilMoisture',
      label: t('soilMoisture'),
      icon: SoilMoistureIcon,
      color: '#22c55e',
      unit: '%',
      bgColor: 'from-green-50 to-green-100',
      borderColor: 'border-green-200',
      iconBg: 'bg-green-500',
    },
    {
      key: 'soilTemperature',
      label: t('soilTemperature'),
      icon: SoilTemperatureIcon,
      color: '#a67c52',
      unit: '°C',
      bgColor: 'from-amber-50 to-amber-100',
      borderColor: 'border-amber-200',
      iconBg: 'bg-amber-600',
    },
    {
      key: 'lightIntensity',
      label: t('lightIntensity'),
      icon: LightIcon,
      color: '#fbbf24',
      unit: 'lux',
      bgColor: 'from-yellow-50 to-yellow-100',
      borderColor: 'border-yellow-200',
      iconBg: 'bg-yellow-500',
    },
    {
      key: 'windSpeed',
      label: t('windSpeed'),
      icon: WindIcon,
      color: '#60a5fa',
      unit: 'km/h',
      bgColor: 'from-cyan-50 to-cyan-100',
      borderColor: 'border-cyan-200',
      iconBg: 'bg-cyan-500',
    },
  ];

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary-600 rounded-lg text-white">
            <ChartIcon />
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{t('graphsTrends')}</h3>
            <p className="text-sm text-gray-600">Historical sensor data visualization</p>
            {error && (
              <p className="text-xs text-amber-600 mt-1">{error}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            onClick={() => setTimeRange(TIME_RANGES.LAST_24H)}
            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              timeRange === TIME_RANGES.LAST_24H
                ? 'bg-primary-600 text-white shadow-md'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {t('last24Hours')}
          </button>
          <button
            onClick={() => setTimeRange(TIME_RANGES.LAST_7D)}
            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              timeRange === TIME_RANGES.LAST_7D
                ? 'bg-primary-600 text-white shadow-md'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {t('last7Days')}
          </button>
          <button
            onClick={() => setTimeRange(TIME_RANGES.LAST_30D)}
            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              timeRange === TIME_RANGES.LAST_30D
                ? 'bg-primary-600 text-white shadow-md'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {t('last30Days')}
          </button>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {charts.map((chart) => {
          const stats = calculateStats(chart.key);
          const IconComponent = chart.icon;
          
          return (
            <div
              key={chart.key}
              className={`card bg-gradient-to-br ${chart.bgColor} border-2 ${chart.borderColor} shadow-lg hover:shadow-xl transition-shadow p-4 sm:p-5`}
            >
              {/* Chart Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 ${chart.iconBg} rounded-lg text-white`}>
                    <IconComponent />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-900">{chart.label}</h4>
                    <p className="text-xs text-gray-600">Time series data</p>
                  </div>
                </div>
        </div>

              {/* Statistics Cards */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-white bg-opacity-70 rounded-lg p-2 border border-white border-opacity-50">
                  <p className="text-xs text-gray-600 mb-1">Min</p>
                  <p className="text-sm font-bold text-gray-900">
                    {stats.min !== null ? `${stats.min.toFixed(1)}${chart.unit}` : 'N/A'}
                  </p>
                </div>
                <div className="bg-white bg-opacity-70 rounded-lg p-2 border border-white border-opacity-50">
                  <p className="text-xs text-gray-600 mb-1">Avg</p>
                  <p className="text-sm font-bold text-gray-900">
                    {stats.avg !== null ? `${stats.avg.toFixed(1)}${chart.unit}` : 'N/A'}
                  </p>
                </div>
                <div className="bg-white bg-opacity-70 rounded-lg p-2 border border-white border-opacity-50">
                  <p className="text-xs text-gray-600 mb-1">Max</p>
                  <p className="text-sm font-bold text-gray-900">
                    {stats.max !== null ? `${stats.max.toFixed(1)}${chart.unit}` : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Chart */}
              <div className="mt-2 -mx-2 sm:-mx-1">
                {hasData ? (
                  <LineChart
                    data={chartData}
                    dataKey={chart.key}
                    name={chart.label}
                    color={chart.color}
                    unit={chart.unit}
                  />
                ) : (
                  <div className="flex items-center justify-center h-[250px] text-gray-500">
                    <div className="text-center">
                      <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <p className="text-sm font-medium">No data available</p>
                      <p className="text-xs text-gray-400 mt-1">No sensor readings for this time range</p>
                    </div>
                  </div>
                )}
              </div>
        </div>
          );
        })}
      </div>
    </div>
  );
};

export default GraphsTab;