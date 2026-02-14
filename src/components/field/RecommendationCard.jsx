import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { RECOMMENDATION_STATUS } from '../../utils/constants';
import { recommendationService } from '../../services/recommendationService';
import ReactMarkdown from 'react-markdown';

const RecommendationCard = ({ recommendation, fieldId }) => {
  const { t, language: globalLanguage } = useLanguage();
  const [reasoning, setReasoning] = useState(recommendation.ai_reasoning || '');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [reasoningLanguage, setReasoningLanguage] = useState(globalLanguage);

  const isIrrigation = recommendation.title === 'Irrigation' || recommendation.title === 'Irrigation Recommendation';

  useEffect(() => {
    if (isIrrigation && !reasoning && !loading) {
      fetchReasoning();
    }
  }, [fieldId]);

  const fetchReasoning = async (lang = reasoningLanguage) => {
    try {
      setLoading(true);
      setProgress(10);

      // Simulate progress bar for better visual
      const interval = setInterval(() => {
        setProgress(prev => (prev < 90 ? prev + 10 : prev));
      }, 500);

      const response = await recommendationService.getCardReasoning(fieldId, recommendation.title, lang);
      clearInterval(interval);
      setProgress(100);

      setTimeout(() => {
        setReasoning(response.data.reasoning);
        setReasoningLanguage(lang);
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

  return (
    <div className={`card border-2 ${isCritical ? 'border-red-300 bg-red-50' : ''}`}>
      {/* Section 1: Instant Information */}
      <div className="mb-3">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-black text-gray-900 flex items-center gap-1.5">
            {isIrrigation && (
              <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.022.547l2.387.477a6 6 0 013.86-.517l.318-.158a6 6 0 003.86-.517L17.04 15.21a2 2 0 001.022-.547z" />
              </svg>
            )}
            {recommendation.title}
          </h3>
          <span className={`px-3 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-widest shadow-sm ${getStatusColor(recommendation.status)}`}>
            {getStatusText(recommendation.status)}
          </span>
        </div>

        <p className="text-base text-gray-700 font-bold mb-3">{recommendation.description}</p>

        {recommendation.ml_data && (
          <div className="mb-3 grid grid-cols-2 gap-3">
            <div className="bg-white border-2 border-blue-50 rounded-xl p-3 shadow-sm">
              <span className="text-[9px] text-blue-400 block mb-1 uppercase tracking-widest font-black">{t('predictedAmount')}</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-blue-900">{recommendation.ml_data.amount_mm}</span>
                <span className="text-[10px] font-bold text-blue-600 uppercase">mm</span>
              </div>
            </div>
            <div className="bg-white border-2 border-green-50 rounded-xl p-3 shadow-sm">
              <span className="text-[9px] text-green-400 block mb-1 uppercase tracking-widest font-black">{t('modelConfidence')}</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-green-900">{recommendation.ml_data.confidence}</span>
                <span className="text-[10px] font-bold text-green-600">%</span>
              </div>
            </div>
          </div>
        )}

        {recommendation.explanation && (
          <div className="bg-amber-50/50 rounded-lg p-3 border border-amber-100/50 mb-1">
            <div className="flex gap-2 items-center">
              <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-[12px] text-amber-900 font-medium">
                <span className="font-black uppercase tracking-tighter text-[10px] mr-1">Expert context:</span> {recommendation.explanation}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Section 2: AI Reasoning (Automated & Collapsible) */}
      <div className="pt-3 border-t-2 border-dashed border-gray-100">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h4 className="font-black text-[10px] text-primary-900 uppercase tracking-widest">{t('aiReasoningAssistant')}</h4>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchReasoning}
              disabled={loading}
              title="Refresh Analysis"
              className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors border border-transparent hover:border-primary-100"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            <button
              onClick={() => {
                const newLang = reasoningLanguage === 'en' ? 'ta' : 'en';
                fetchReasoning(newLang);
              }}
              disabled={loading}
              title={reasoningLanguage === 'en' ? 'Translate to Tamil' : 'Translate to English'}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-black text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-md transition-colors border border-primary-200 uppercase tracking-widest"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
              {reasoningLanguage === 'en' ? 'EN' : 'த'}
            </button>

            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="flex items-center gap-1.5 text-[10px] font-black text-gray-500 hover:text-gray-800 transition-colors uppercase tracking-[0.1em] px-2 py-1 rounded-md bg-gray-50 hover:bg-gray-100 border border-gray-200"
            >
              {isCollapsed ? (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                  Expand
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" /></svg>
                  Collapse
                </>
              )}
            </button>
          </div>
        </div>

        {!isCollapsed && (
          <div className="animate-in fade-in slide-in-from-top-1 duration-300">
            {loading && (
              <div className="mb-4 mt-2">
                <div className="w-full bg-gray-100 rounded-full h-2.5 shadow-inner overflow-hidden border border-gray-200">
                  <div
                    className="bg-gradient-to-r from-primary-400 via-primary-600 to-primary-400 h-full rounded-full transition-all duration-700 ease-out shadow-lg relative animate-shimmer"
                    style={{ width: `${progress}%`, backgroundSize: '1000px 100%' }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse" />
                  </div>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-[9px] text-gray-400 font-black uppercase tracking-[0.2em] animate-pulse">Analyzing Field Intelligence...</span>
                  <span className="text-[9px] text-primary-600 font-black tracking-widest">{progress}%</span>
                </div>
              </div>
            )}

            {reasoning && !loading && (
              <div className="mt-2 bg-gradient-to-br from-primary-50/30 to-white border border-primary-100/50 rounded-xl p-5 shadow-sm backdrop-blur-sm overflow-hidden border-l-4 border-l-primary-400">
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
                        <div className="flex items-center gap-2 mb-3 mt-5 first:mt-0 pb-2 border-b border-gray-200">
                          {icon}
                          <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest" {...props} />
                        </div>
                      );
                    },
                    p: ({ node, ...props }) => {
                      return <p className="text-gray-700 leading-relaxed mb-4 font-medium text-sm" {...props} />;
                    },
                    ul: ({ node, ...props }) => <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-5" {...props} />,
                    li: ({ node, ...props }) => (
                      <li className="flex items-start gap-2.5 bg-white/60 p-3 rounded-lg border border-gray-100 transition-all hover:bg-white hover:shadow-md shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-2 shrink-0" />
                        <span className="text-gray-700 text-sm font-medium leading-relaxed" {...props} />
                      </li>
                    ),
                    strong: ({ node, ...props }) => <strong className="font-bold text-primary-900 bg-primary-100 px-1.5 py-0.5 rounded-md border border-primary-200 mx-0.5" {...props} />
                  }}
                >
                  {reasoning}
                </ReactMarkdown>
              </div>
            )}
          </div>
        )}
      </div>

      {recommendation.timing && (
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">
            {t('nextAction')}
          </p>
          <span className="text-[11px] font-black text-primary-700 bg-primary-100/50 px-2.5 py-1 rounded-md border border-primary-200/50">
            {recommendation.timing}
          </span>
        </div>
      )}
    </div>
  );
}; export default RecommendationCard;

