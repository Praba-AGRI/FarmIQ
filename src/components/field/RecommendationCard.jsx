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
          <div className="mb-6 mt-4">
            <div className="w-full bg-gray-100 rounded-full h-3 shadow-inner overflow-hidden border border-gray-200">
              <div
                className="bg-gradient-to-r from-primary-400 via-primary-600 to-primary-400 h-full rounded-full transition-all duration-700 ease-out shadow-lg relative animate-shimmer"
                style={{ width: `${progress}%`, backgroundSize: '1000px 100%' }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
              </div>
            </div>
            <div className="flex justify-between items-center mt-3">
              <span className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] animate-pulse">Running Reasoning Intelligence...</span>
              <span className="text-[10px] text-primary-600 font-black tracking-widest">{progress}%</span>
            </div>
          </div>
        )}

        {reasoning && !loading && (
          <div className="mt-4 bg-gradient-to-br from-primary-50/50 to-white border border-primary-100/50 rounded-2xl p-6 shadow-sm backdrop-blur-sm">
            <ReactMarkdown
              components={{
                h3: ({ node, ...props }) => {
                  const title = props.children.toString();
                  let icon = null;
                  if (title.includes('Observation')) icon = <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>;
                  if (title.includes('Action')) icon = <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
                  if (title.includes('Why')) icon = <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>;
                  if (title.includes('Timing')) icon = <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

                  return (
                    <div className="flex items-center gap-2 mb-4 mt-6 first:mt-0 pb-2 border-b border-gray-100">
                      {icon}
                      <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest" {...props} />
                    </div>
                  );
                },
                p: ({ node, ...props }) => {
                  if (props.children.toString().includes('Namaste')) {
                    return <p className="text-lg font-black text-primary-900 mb-6 flex items-center gap-2" {...props}>
                      <span className="text-2xl">👋</span> {props.children}
                    </p>;
                  }
                  return <p className="text-gray-700 leading-relaxed mb-4 font-medium" {...props} />;
                },
                ul: ({ node, ...props }) => <ul className="space-y-3 mb-6" {...props} />,
                li: ({ node, ...props }) => (
                  <li className="flex items-start gap-3 bg-white/50 p-3 rounded-lg border border-gray-50 shadow-sm transition-all hover:shadow-md hover:border-primary-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-2 shrink-0 shadow-sm" />
                    <span className="text-gray-700 text-sm font-medium leading-relaxed" {...props} />
                  </li>
                ),
                strong: ({ node, ...props }) => <strong className="font-black text-primary-900 bg-primary-50 px-1.5 py-0.5 rounded-md border border-primary-100 mx-0.5 shadow-sm" {...props} />
              }}
            >
              {reasoning}
            </ReactMarkdown>
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

