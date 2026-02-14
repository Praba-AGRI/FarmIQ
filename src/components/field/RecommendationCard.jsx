import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { RECOMMENDATION_STATUS } from '../../utils/constants';
import { recommendationService } from '../../services/recommendationService';
import ReactMarkdown from 'react-markdown';

const RecommendationCard = ({ recommendation, fieldId }) => {
  const { t } = useLanguage();
  const [reasoning, setReasoning] = useState(recommendation.ai_reasoning || '');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const fetchReasoning = async () => {
    try {
      setLoading(true);
      setProgress(10);

      // Simulate progress bar for better visual
      const interval = setInterval(() => {
        setProgress(prev => (prev < 90 ? prev + 10 : prev));
      }, 500);

      const response = await recommendationService.getCardReasoning(fieldId, recommendation.title);
      clearInterval(interval);
      setProgress(100);

      setTimeout(() => {
        setReasoning(response.data.reasoning);
        setLoading(false);
        setProgress(0);
      }, 500);
    } catch (err) {
      console.error('Error fetching card reasoning:', err);
      setLoading(false);
      setProgress(0);
    }
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

  const isCritical = recommendation.status === RECOMMENDATION_STATUS.DO_NOW;
  const isIrrigation = recommendation.title === 'Irrigation' || recommendation.title === 'Irrigation Recommendation';

  return (
    <div className={`card border-2 ${isCritical ? 'border-red-300 bg-red-50' : ''}`}>
      {/* Section 1: Instant Information */}
      <div className="mb-4">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            {isIrrigation && (
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.022.547l2.387.477a6 6 0 013.86-.517l-.318-.158a6 6 0 003.86-.517L17.04 15.21a2 2 0 001.022-.547z" />
              </svg>
            )}
            {recommendation.title}
          </h3>
          <span className={`px-4 py-1 rounded-full text-sm font-bold border shadow-sm ${getStatusColor(recommendation.status)}`}>
            {getStatusText(recommendation.status)}
          </span>
        </div>

        <p className="text-lg text-gray-700 font-medium mb-4">{recommendation.description}</p>

        {recommendation.ml_data && (
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div className="bg-white border-2 border-blue-100 rounded-xl p-4 shadow-sm">
              <span className="text-xs text-blue-500 block mb-2 uppercase tracking-widest font-black">{t('predictedAmount')}</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-blue-900">{recommendation.ml_data.amount_mm}</span>
                <span className="text-sm font-bold text-blue-600">mm</span>
              </div>
            </div>
            <div className="bg-white border-2 border-green-100 rounded-xl p-4 shadow-sm">
              <span className="text-xs text-green-500 block mb-2 uppercase tracking-widest font-black">{t('modelConfidence')}</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-green-900">{recommendation.ml_data.confidence}</span>
                <span className="text-sm font-bold text-green-600">%</span>
              </div>
            </div>
          </div>
        )}

        {recommendation.explanation && (
          <div className="bg-amber-50 rounded-lg p-4 border border-amber-100 mb-2">
            <div className="flex gap-2">
              <svg className="w-5 h-5 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-amber-900">
                <span className="font-bold">Expert Context:</span> {recommendation.explanation}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Section 2: AI Reasoning (On-Demand) */}
      <div className="pt-4 border-t-2 border-dashed border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h4 className="font-black text-xs text-primary-900 uppercase tracking-widest">{t('aiReasoningAssistant')}</h4>
          </div>
          <button
            onClick={fetchReasoning}
            disabled={loading}
            className="flex items-center gap-2 text-xs font-bold text-primary-600 hover:text-primary-800 transition-colors uppercase tracking-widest px-3 py-1 rounded-full border border-primary-200 hover:bg-primary-50"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {loading ? 'Analyzing...' : reasoning ? 'Refresh Analysis' : 'Generate Analysis'}
          </button>
        </div>

        {loading && (
          <div className="mb-4">
            <div className="w-full bg-gray-100 rounded-full h-2 shadow-inner overflow-hidden">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-500 ease-out shadow-sm"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-gray-500 mt-2 font-bold uppercase tracking-widest text-center animate-pulse">Running reasoning models & Agri-Knowledge Base check...</p>
          </div>
        )}

        {reasoning && !loading && (
          <div className="bg-primary-50 p-4 rounded-xl text-sm border border-primary-100 font-medium prose prose-sm max-w-none prose-primary prose-p:leading-relaxed prose-headings:mb-2 prose-headings:mt-4 first:prose-headings:mt-0">
            <ReactMarkdown>{reasoning}</ReactMarkdown>
          </div>
        )}
      </div>

      {recommendation.timing && (
        <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
          <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">
            {t('nextAction')}
          </p>
          <span className="text-sm font-black text-gray-700 bg-gray-100 px-3 py-1 rounded-lg">
            {recommendation.timing}
          </span>
        </div>
      )}
    </div>
  );
}; export default RecommendationCard;

