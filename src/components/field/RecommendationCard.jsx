import React from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { RECOMMENDATION_STATUS } from '../../utils/constants';

const RecommendationCard = ({ recommendation }) => {
  const { t } = useLanguage();

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

  const isCritical = recommendation.status === RECOMMENDATION_STATUS.DO_NOW;

  return (
    <div className={`card border-2 ${isCritical ? 'border-red-300 bg-red-50' : ''}`}>
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-gray-900">{recommendation.title}</h3>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(recommendation.status)}`}>
          {getStatusText(recommendation.status)}
        </span>
      </div>
      
      <p className="text-gray-700 mb-3">{recommendation.description}</p>
      
      {recommendation.explanation && (
        <div className="bg-gray-50 rounded p-3 mt-3">
          <p className="text-sm text-gray-600">{recommendation.explanation}</p>
        </div>
      )}
      
      {recommendation.timing && (
        <p className="text-sm text-gray-500 mt-2">
          <strong>{t('nextAction')}:</strong> {recommendation.timing}
        </p>
      )}
    </div>
  );
};

export default RecommendationCard;






