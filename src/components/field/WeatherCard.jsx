import React from 'react';
import { useLanguage } from '../../hooks/useLanguage';

const WeatherCard = ({ weather, summary, alerts = [] }) => {
  const { t } = useLanguage();

  const getAlertColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'extreme':
        return 'bg-red-200 text-red-950 border-red-600 border-2 shadow-lg';
      case 'severe':
        return 'bg-orange-200 text-orange-950 border-orange-500 border-2 shadow-md';
      case 'moderate':
        return 'bg-yellow-200 text-yellow-950 border-yellow-500 border-2';
      case 'minor':
        return 'bg-blue-200 text-blue-950 border-blue-400 border-2';
      default:
        return 'bg-gray-200 text-gray-950 border-gray-400 border-2';
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    try {
      const date = new Date(timeString);
      return date.toLocaleString('en-IN', { 
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return timeString;
    }
  };

  // Determine spraying safety based on wind speed (ICAR-style rule: < 10 km/h is safe)
  const getSprayingSafety = (windSpeed) => {
    if (windSpeed === null || windSpeed === undefined) {
      return { safe: null, message: 'Wind speed data unavailable' };
    }
    const isSafe = windSpeed < 10;
    return {
      safe: isSafe,
      message: isSafe ? 'Safe for spraying' : 'Not safe for spraying',
      threshold: 'Wind speed threshold: < 10 km/h for safe spraying'
    };
  };

  const sprayingSafety = weather?.current?.windSpeed !== undefined 
    ? getSprayingSafety(weather.current.windSpeed) 
    : null;

  // Professional SVG Icons
  const AlertIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );

  const CheckCircleIcon = ({ className = "w-6 h-6" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  const XCircleIcon = ({ className = "w-6 h-6" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  const SprayIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>
  );

  const RainIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
    </svg>
  );

  const ThunderIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );

  const FireIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
    </svg>
  );

  const WaterIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>
  );

  const CalendarIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );

  const ChartIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );

  const SunIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );

  const InfoIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  const LocationIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );

  const ClockIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  return (
    <div className="space-y-6">
      {/* Weather Alerts - High Priority */}
      <div className="card shadow-md">
        <div className="flex items-center space-x-2 mb-4">
          <AlertIcon />
          <h3 className="text-lg font-semibold text-gray-900">{t('alerts') || 'Weather Alerts'}</h3>
        </div>
        {alerts.length > 0 ? (
          <div className="space-y-4">
            {alerts.map((alert, index) => {
              // Map alert event types to readable names and icons
              const alertType = (alert.event || '').toLowerCase();
              let displayType = alert.event || 'Weather Alert';
              let AlertTypeIcon = AlertIcon;
              
              if (alertType.includes('flood')) {
                displayType = 'Flood Alert';
                AlertTypeIcon = WaterIcon;
              } else if (alertType.includes('heat') || alertType.includes('heatwave')) {
                displayType = 'Heatwave Alert';
                AlertTypeIcon = FireIcon;
              } else if (alertType.includes('thunderstorm') || alertType.includes('thunder')) {
                displayType = 'Thunderstorm Alert';
                AlertTypeIcon = ThunderIcon;
              }
              
              return (
                <div
                  key={index}
                  className={`p-5 rounded-lg border-2 ${getAlertColor(alert.severity)}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <AlertTypeIcon />
                      <p className="font-bold text-lg text-gray-900">{displayType}</p>
                    </div>
                    <span className="text-sm font-bold uppercase px-3 py-1 bg-white bg-opacity-80 rounded-full border border-current">
                      {alert.severity || 'Minor'}
                    </span>
                  </div>
                  <p className="text-base text-gray-900 leading-relaxed mb-3 font-medium">
                    {alert.description}
                  </p>
                  {alert.start && (
                    <div className="flex items-center space-x-2 text-sm font-semibold opacity-90">
                      <ClockIcon />
                      <span>Valid: {formatTime(alert.start)} - {formatTime(alert.end)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-5 bg-green-100 border-2 border-green-400 rounded-lg">
            <div className="flex items-center space-x-3">
              <CheckCircleIcon className="w-6 h-6 text-green-700" />
              <p className="text-green-900 font-semibold text-base">No government weather alerts for your area</p>
            </div>
          </div>
        )}
      </div>

      {/* Spraying Safety Card */}
      {sprayingSafety && weather?.current?.windSpeed !== undefined && (
        <div className={`card border-2 shadow-md ${sprayingSafety.safe ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
          <div className="flex items-center space-x-2 mb-4">
            <SprayIcon />
            <h3 className="text-lg font-semibold text-gray-900">Spraying Conditions</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center space-x-4">
              {sprayingSafety.safe ? (
                <CheckCircleIcon className="w-8 h-8 text-green-700" />
              ) : (
                <XCircleIcon className="w-8 h-8 text-red-700" />
              )}
              <div className="flex-1">
                <p className={`font-bold text-lg ${sprayingSafety.safe ? 'text-green-800' : 'text-red-800'}`}>
                  {sprayingSafety.message}
                </p>
                <p className="text-base text-gray-700 mt-2 font-semibold">
                  Wind speed: <span className="text-lg font-bold">{Math.round(weather.current.windSpeed)} km/h</span> 
                  <span className={`ml-2 px-2 py-1 rounded text-sm font-bold ${sprayingSafety.safe ? 'bg-green-200 text-green-900' : 'bg-red-200 text-red-900'}`}>
                    {sprayingSafety.safe ? '(low)' : '(high)'}
                  </span>
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t-2 border-gray-300">
              <p className="text-sm text-gray-700 font-semibold">
                <span className="font-bold text-gray-900">ICAR Rule:</span> {sprayingSafety.threshold}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Current Weather */}
      {weather?.current && (
        <div className="card shadow-md">
          <h3 className="text-lg font-semibold mb-5 text-gray-900">{t('currentWeather') || 'Current Weather'}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-sm font-semibold text-gray-700 mb-2">Temperature</p>
              <p className="text-3xl font-bold text-blue-900">{Math.round(weather.current.temperature)}°C</p>
              <p className="text-sm text-gray-600 mt-1 font-medium">Feels like {Math.round(weather.current.feelsLike)}°C</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <p className="text-sm font-semibold text-gray-700 mb-2">Humidity</p>
              <p className="text-3xl font-bold text-purple-900">{Math.round(weather.current.humidity)}%</p>
            </div>
            <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-200">
              <p className="text-sm font-semibold text-gray-700 mb-2">Wind Speed</p>
              <p className="text-3xl font-bold text-cyan-900">{Math.round(weather.current.windSpeed)} km/h</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-sm font-semibold text-gray-700 mb-2">Condition</p>
              <p className="text-lg font-semibold text-gray-900">{weather.current.condition}</p>
            </div>
            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
              <p className="text-sm font-semibold text-gray-700 mb-2">Rain (1h)</p>
              <p className="text-3xl font-bold text-indigo-900">{Math.round(weather.current.rain || 0)} mm</p>
            </div>
            {weather.location && (
              <div className="bg-green-50 p-4 rounded-lg border border-green-200 col-span-2 sm:col-span-2 md:col-span-1">
                <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                  <LocationIcon />
                  <span className="ml-2">Location</span>
                </p>
                <p className="text-sm sm:text-base font-semibold text-green-900 break-words">{weather.location}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Summary */}
      {summary && (
        <div className="card bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 shadow-md">
          <h3 className="text-lg font-semibold mb-5 text-blue-900">Weather Summary</h3>
          <div className="space-y-5">
            {summary.summaryToday && (
              <div className="bg-white bg-opacity-70 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-base text-blue-900 mb-3 flex items-center">
                  <CalendarIcon />
                  <span className="ml-2">Today</span>
                </h4>
                <p className="text-base text-gray-800 leading-relaxed font-medium">{summary.summaryToday}</p>
              </div>
            )}
            {summary.summaryTomorrow && (
              <div className="bg-white bg-opacity-70 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-base text-blue-900 mb-3 flex items-center">
                  <SunIcon />
                  <span className="ml-2">Tomorrow</span>
                </h4>
                <p className="text-base text-gray-800 leading-relaxed font-medium">{summary.summaryTomorrow}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Minutely Precipitation Forecast (Next Hour) */}
      {weather?.minutely && weather.minutely.length > 0 && (
        <div className="card shadow-md">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 flex items-center">
            <RainIcon />
            <span className="ml-2">Rain Forecast (Next 1 Hour)</span>
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {weather.minutely.slice(0, 30).map((item, index) => (
              <div key={index} className="flex justify-between items-center py-2 px-3 hover:bg-gray-50 rounded text-base">
                <span className="text-gray-800 font-medium">{item.time}</span>
                <span className={`font-semibold ${item.precipitation > 0 ? 'text-blue-700' : 'text-gray-500'}`}>
                  {item.precipitation > 0 ? `${Math.round(item.precipitation)} mm` : 'No rain'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hourly Forecast (Next 48 Hours) */}
      {weather?.hourly && weather.hourly.length > 0 && (
        <div className="card shadow-md">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 flex items-center">
            <ChartIcon />
            <span className="ml-2">Hourly Forecast (Next 48 Hours)</span>
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {weather.hourly.slice(0, 24).map((item, index) => (
              <div key={index} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 py-3 px-3 border-b-2 border-gray-200 last:border-0 hover:bg-gray-50 rounded">
                <div className="flex-1">
                  <span className="text-gray-900 font-semibold text-sm sm:text-base">{item.time}</span>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:space-x-5 text-sm sm:text-base">
                  <span className="text-gray-800 font-bold">{Math.round(item.temperature)}°C</span>
                  <span className="text-gray-700 font-medium text-xs sm:text-base">{item.condition}</span>
                  {item.rain > 0 && (
                    <span className="text-blue-700 font-bold px-2 py-1 bg-blue-100 rounded text-xs sm:text-sm">{Math.round(item.rain)} mm</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily Forecast (Next 8 Days) */}
      {weather?.daily && weather.daily.length > 0 && (
        <div className="card shadow-md">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 flex items-center">
            <CalendarIcon />
            <span className="ml-2">Daily Forecast (Next 8 Days)</span>
          </h3>
          <div className="space-y-3">
            {weather.daily.map((item, index) => (
              <div key={index} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 py-4 px-4 border-b-2 border-gray-200 last:border-0 hover:bg-gray-50 rounded">
                <div className="flex-1">
                  <p className="font-semibold text-sm sm:text-base text-gray-900">{item.date}</p>
                  <p className="text-sm sm:text-base text-gray-700 font-medium mt-1">{item.condition}</p>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:space-x-5">
                  <div className="text-left sm:text-right">
                    <p className="text-gray-900 font-bold text-base sm:text-lg">{Math.round(item.temp_max)}°C</p>
                    <p className="text-gray-700 text-sm sm:text-base font-semibold">{Math.round(item.temp_min)}°C</p>
                  </div>
                  {item.rain > 0 && (
                    <span className="text-blue-700 font-bold text-sm sm:text-base px-3 py-2 bg-blue-100 rounded-lg">
                      {Math.round(item.rain)} mm
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Note */}
      <div className="bg-yellow-100 border-2 border-yellow-400 rounded-lg p-5 shadow-md">
        <div className="flex items-start space-x-3">
          <InfoIcon />
          <div>
            <p className="text-base text-yellow-900 font-semibold mb-1">
              Note:
            </p>
            <p className="text-base text-yellow-900 font-medium leading-relaxed">
              {t('weatherNote') || 'Weather data is for reference and alerts only. Use sensor data for precise farming decisions.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeatherCard;