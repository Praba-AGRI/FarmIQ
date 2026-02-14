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

      {recommendation.ml_data && (
        <div className="mb-4 flex flex-wrap gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
            <span className="text-xs text-blue-600 block mb-1 uppercase tracking-wider font-bold">{t('predictedAmount')}</span>
            <span className="text-lg font-bold text-blue-900">{recommendation.ml_data.amount_mm} mm</span>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            <span className="text-xs text-green-600 block mb-1 uppercase tracking-wider font-bold">{t('modelConfidence')}</span>
            <span className="text-lg font-bold text-green-900">{recommendation.ml_data.confidence}%</span>
          </div>
        </div>
      )}

      {recommendation.ai_reasoning && (
        <div className="bg-primary-50 border-l-4 border-primary-500 p-4 rounded-r-lg shadow-sm mb-4">
          <div className="flex items-center mb-2">
            <svg className="w-4 h-4 text-primary-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <h4 className="font-bold text-xs text-primary-900 uppercase tracking-widest">{t('aiReasoningAssistant')}</h4>
          </div>
          <div className="text-sm text-primary-800 whitespace-pre-line leading-relaxed">
            {recommendation.ai_reasoning}
          </div>
        </div>
      )}

      {recommendation.explanation && (
        <div className="bg-gray-50 rounded p-3 mt-3">
          <p className="text-sm text-gray-600 italic">Expert Context: {recommendation.explanation}</p>
        </div>
      )}

      {recommendation.timing && (
        <p className="text-sm text-gray-500 mt-2 pt-2 border-t border-gray-100">
          <strong>{t('nextAction')}:</strong> {recommendation.timing}
        </p>
      )}
    </div>
  );
};

export default RecommendationCard;






