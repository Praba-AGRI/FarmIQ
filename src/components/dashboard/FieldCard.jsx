import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../hooks/useLanguage';
import { RECOMMENDATION_STATUS } from '../../utils/constants';

const FieldCard = ({ field, demoMode = false }) => {
  const { t } = useLanguage();

  const getMoistureColor = (moisture) => {
    if (moisture === null || moisture === undefined) return 'bg-gray-400';
    if (moisture < 30) return 'bg-red-500';
    if (moisture < 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getMoistureStatus = (moisture) => {
    if (moisture === null || moisture === undefined) return 'No Data';
    if (moisture < 30) return 'Low';
    if (moisture < 60) return 'Moderate';
    return 'Good';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case RECOMMENDATION_STATUS.DO_NOW:
        return 'bg-red-100 text-red-800 border-red-300';
      case RECOMMENDATION_STATUS.WAIT:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case RECOMMENDATION_STATUS.MONITOR:
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case RECOMMENDATION_STATUS.DO_NOW:
        return t('doNow');
      case RECOMMENDATION_STATUS.WAIT:
        return t('wait');
      case RECOMMENDATION_STATUS.MONITOR:
        return t('monitor');
      default:
        return status;
    }
  };

  const getAlertTypeColor = (type) => {
    switch (type) {
      case 'rainfall':
        return 'bg-blue-100 text-blue-800';
      case 'humidity':
        return 'bg-purple-100 text-purple-800';
      case 'heat':
        return 'bg-orange-100 text-orange-800';
      case 'spray':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getAlertTypeLabel = (type) => {
    switch (type) {
      case 'rainfall':
        return t('rainfall');
      case 'humidity':
        return t('humidity');
      case 'heat':
        return t('heat');
      case 'spray':
        return t('spray');
      default:
        return type;
    }
  };

  // Get top 2-3 most urgent recommendations
  const topRecommendations = field.recommendations
    ? field.recommendations.slice(0, 2)
    : [];
  const hasMoreRecommendations = field.recommendations
    ? field.recommendations.length > 2
    : false;
  const totalRecommendations = field.recommendations
    ? field.recommendations.length
    : 0;

  // Get weather alerts
  const weatherAlerts = field.weatherAlerts || [];

  return (
    <Link to={demoMode ? `/demo/field/${field.id}` : `/field/${field.id}`} className="block">
      <div className="card hover:shadow-lg transition-shadow duration-200 cursor-pointer">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">{field.name}</h3>
            <p className="text-gray-600 mt-1">{field.cropName}</p>
            {field.sensor_node_id && (
              <p className="text-xs text-gray-500 mt-1">
                Sensor ID: <span className="font-mono font-medium">{field.sensor_node_id}</span>
              </p>
            )}
          </div>
          {field.hasAlert && (
            <span className="bg-red-100 text-red-800 text-xs font-semibold px-2 py-1 rounded-full">
              {t('alerts')}
            </span>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600">{t('cropStage')}</p>
            <p className="font-medium">{field.cropStage || 'N/A'}</p>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <p className="text-sm text-gray-600">{t('soilMoisture')}</p>
              <span className={`text-xs px-2 py-1 rounded ${getMoistureColor(field.soilMoisture)} text-white`}>
                {getMoistureStatus(field.soilMoisture)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${getMoistureColor(field.soilMoisture)}`}
                style={{ width: `${field.soilMoisture || 0}%` }}
              ></div>
            </div>
          </div>

          {/* Sensor Values Section */}
          <div className="border-t pt-3">
            <p className="text-sm font-semibold text-gray-700 mb-2">{t('sensorValues')}</p>
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
              <div className="bg-gray-50 rounded p-2">
                <p className="text-xs text-gray-600">{t('airTemperature')}</p>
                <p className="text-sm font-semibold text-gray-900">
                  {field.sensorData?.airTemperature != null ? `${field.sensorData.airTemperature.toFixed(1)}°C` : 'N/A'}
                </p>
              </div>
              <div className="bg-gray-50 rounded p-2">
                <p className="text-xs text-gray-600">{t('relativeHumidity')}</p>
                <p className="text-sm font-semibold text-gray-900">
                  {field.sensorData?.relativeHumidity != null ? `${field.sensorData.relativeHumidity.toFixed(0)}%` : 'N/A'}
                </p>
              </div>
              <div className="bg-gray-50 rounded p-2">
                <p className="text-xs text-gray-600">{t('soilTemperature')}</p>
                <p className="text-sm font-semibold text-gray-900">
                  {field.sensorData?.soilTemperature != null ? `${field.sensorData.soilTemperature.toFixed(1)}°C` : 'N/A'}
                </p>
              </div>
              <div className="bg-gray-50 rounded p-2">
                <p className="text-xs text-gray-600">{t('lightIntensity')}</p>
                <p className="text-sm font-semibold text-gray-900">
                  {field.sensorData?.lightIntensity != null ? `${field.sensorData.lightIntensity.toFixed(0)} lux` : 'N/A'}
                </p>
              </div>
              {/* Only show wind speed if it exists, or if we want to show N/A for it too? User said "incase of no readings show nil". 
                  The original code only showed wind speed if it existed. 
                  I'll keep the behavior of only showing if it exists OR if we are in a "No Data" state where everything is N/A? 
                  Actually, if wind speed is optional, maybe we don't show N/A for it if it's missing but others are present.
                  But if ALL are missing, we show N/A for the main ones.
                  For wind speed, let's just leave it as is (only show if present) to save space, or show N/A if it's expected but missing.
                  Given the layout (grid-cols-2), 4 items fit perfectly. Wind speed makes it 5.
                  I'll leave wind speed conditionals as is, but handle nulls safely inside.
              */}
              {(field.sensorData?.windSpeed !== undefined && field.sensorData?.windSpeed !== null) && (
                <div className="bg-gray-50 rounded p-2 col-span-2">
                  <p className="text-xs text-gray-600">{t('windSpeed')}</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {field.sensorData.windSpeed.toFixed(1)} km/h
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Recommendations Section */}
          {topRecommendations.length > 0 && (
            <div className="border-t pt-3">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-semibold text-gray-700">{t('activeRecommendations')}</p>
                {hasMoreRecommendations && (
                  <span className="text-xs text-gray-500">
                    +{totalRecommendations - 2} {t('recommendations')}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {topRecommendations.map((rec) => (
                  <div key={rec.id} className="bg-gray-50 rounded p-2">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-xs font-medium text-gray-900">{rec.title}</p>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${getStatusColor(rec.status)}`}>
                        {getStatusText(rec.status)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2">{rec.description}</p>
                    {rec.timing && (
                      <p className="text-xs text-gray-500 mt-1">{rec.timing}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Weather Alerts Section */}
          <div className="border-t pt-3">
            <p className="text-sm font-semibold text-gray-700 mb-2">{t('weatherAlerts')}</p>
            {weatherAlerts.length > 0 ? (
              <div className="space-y-2">
                {weatherAlerts.slice(0, 2).map((alert, index) => (
                  <div key={index} className="bg-gray-50 rounded p-2">
                    <div className="flex justify-between items-start mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getAlertTypeColor(alert.type)}`}>
                        {getAlertTypeLabel(alert.type)}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-gray-900 mt-1">{alert.title}</p>
                    <p className="text-xs text-gray-600 line-clamp-2 mt-1">{alert.message}</p>
                  </div>
                ))}
                {weatherAlerts.length > 2 && (
                  <p className="text-xs text-gray-500">
                    +{weatherAlerts.length - 2} more {t('alerts')}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-500">{t('noActiveAlerts')}</p>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default FieldCard;






