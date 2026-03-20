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

  // Check if this card supports AI reasoning
  const supportsReasoning =
    recommendation.title === 'Irrigation' ||
    recommendation.title === 'Irrigation Recommendation' ||
    recommendation.title === 'Nutrients' ||
    recommendation.title === 'Nutrient Management' ||
    recommendation.title === 'Pest Management' ||
    recommendation.title === 'Pest Control' ||
    recommendation.title === 'Spraying Conditions';

  const fetchReasoning = async () => {
    try {
      setLoading(true);
      setProgress(10);

      // Simulate progress bar for better visual
      const interval = setInterval(() => {
        setProgress(prev => (prev < 90 ? prev + 10 : prev));
      }, 500);

      const response = await recommendationService.getCardReasoning(fieldId, recommendation.title, globalLanguage);
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

  return (
    <div className={`card border-2 shadow-xl overflow-hidden transition-all duration-300 flex flex-col h-full ${isCritical ? 'border-red-500 bg-red-50/50 ring-2 ring-red-200' : 'border-gray-200 bg-white'}`}>
      {/* Traffic Light Indicator */}
      <div className={`h-2.5 w-full ${
        recommendation.status === 'do_now' ? 'bg-red-500' : 
        recommendation.status === 'wait' ? 'bg-yellow-400' : 
        recommendation.status === 'green' ? 'bg-emerald-500' : 'bg-blue-400'
      }`} />

      {/* Main Content Area */}
      <div className="p-6 flex-grow flex flex-col">
        {/* Header: Title and Status */}
        <div className="flex justify-between items-start mb-6">
          <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full animate-pulse ${
              recommendation.status === 'do_now' ? 'bg-red-500' : 
              recommendation.status === 'wait' ? 'bg-yellow-400' : 
              recommendation.status === 'green' ? 'bg-emerald-500' : 'bg-blue-400'
            }`} />
            {recommendation.title}
          </h3>
          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black border-2 uppercase tracking-[0.1em] shadow-sm ${
            recommendation.status === 'do_now' ? 'bg-red-100 text-red-800 border-red-200' : 
            recommendation.status === 'wait' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 
            recommendation.status === 'green' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-blue-100 text-blue-800 border-blue-200'
          }`}>
            {getStatusText(recommendation.status)}
          </span>
        </div>

        {/* MAIN ACTION: Huge Text */}
        <div className="mb-6 flex-grow">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-gray-900 leading-[1.15] tracking-tight">
            "{recommendation.description}"
          </h2>
        </div>

        {/* THE SIMPLE WHY: Expert Logic simplified */}
        {recommendation.explanation && (
          <div className="bg-amber-50/70 border-l-4 border-amber-400 rounded-r-xl p-5 mb-6 shadow-sm">
            <div className="flex gap-4 items-start">
              <div className="mt-1 bg-amber-200 p-2 rounded-xl shrink-0">
                <svg className="w-5 h-5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-grow">
                <span className="text-[10px] font-black uppercase text-amber-600 tracking-[0.2em] block mb-1">Impact Analysis</span>
                <p className="text-base text-gray-800 font-bold leading-normal">
                  {recommendation.explanation}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SUBTLE ML DATA (Technical confirmation) */}
        {recommendation.ml_data && (
          <div className="mb-6 flex flex-wrap gap-3">
            <div className="flex items-center gap-2 text-[11px] font-black text-gray-500 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 shadow-sm transition-all hover:bg-white hover:border-emerald-200 cursor-default">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              AI CONFIDENCE: {recommendation.ml_data.confidence}%
            </div>
            
            {(recommendation.ml_data.pump_minutes || recommendation.ml_data.amount_mm) && (
              <div className="flex items-center gap-2 text-[11px] font-black text-gray-500 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 shadow-sm transition-all hover:bg-white hover:border-blue-200 cursor-default">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                DOSE: {recommendation.ml_data.amount_mm}mm
              </div>
            )}
            
            {recommendation.ml_data.nitro_kg && (
              <div className="flex items-center gap-2 text-[11px] font-black text-gray-500 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 shadow-sm transition-all hover:bg-white hover:border-yellow-200 cursor-default">
                <div className="w-2 h-2 rounded-full bg-yellow-400" />
                REQUIREMENT: {recommendation.ml_data.nitro_kg}kg N
              </div>
            )}
          </div>
        )}

        {/* Section 2: AI Reasoning Assistant */}
        {supportsReasoning && (
          <div className="mt-4 pt-5 border-t-2 border-dashed border-gray-100">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-primary-100 flex items-center justify-center shadow-inner">
                  <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h4 className="font-black text-[11px] text-primary-900 uppercase tracking-widest">AI Logic Explorer</h4>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={fetchReasoning}
                  disabled={loading}
                  className="p-2 text-primary-600 hover:bg-primary-50 rounded-xl transition-all border border-gray-100 shadow-sm"
                  title="Recalculate Logic"
                >
                  <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>

                <button
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className="flex items-center gap-2 text-[10px] font-black text-gray-500 hover:text-gray-900 transition-all uppercase tracking-widest px-3 py-2 rounded-xl bg-gray-50 hover:bg-white border border-gray-100 shadow-sm"
                >
                  {isCollapsed ? 'Deep Scan' : 'Compact'}
                </button>
              </div>
            </div>

            {!isCollapsed && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-400">
                {loading && (
                  <div className="mb-4 mt-4 bg-gray-50 rounded-2xl p-4 border border-gray-100">
                    <div className="w-full bg-white rounded-full h-3 shadow-inner overflow-hidden border border-gray-100">
                      <div
                        className="bg-gradient-to-r from-primary-400 via-primary-600 to-primary-400 h-full rounded-full transition-all duration-700 ease-out animate-shimmer"
                        style={{ width: `${progress}%`, backgroundSize: '1000px 100%' }}
                      />
                    </div>
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-[10px] text-primary-500 font-black uppercase tracking-[0.2em] animate-pulse">Consulting Farm Knowledge Base...</span>
                      <span className="text-[10px] text-primary-700 font-black">{progress}%</span>
                    </div>
                  </div>
                )}

                {reasoning && !loading && (
                  <div className="mt-4 bg-white border-2 border-primary-50 rounded-2xl p-6 shadow-sm border-l-8 border-l-primary-500 overflow-hidden prose prose-sm max-w-none">
                    <ReactMarkdown
                      components={{
                        h3: ({ node, ...props }) => {
                          const title = props.children?.toString() || '';
                          let icon = <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
                          if (title.includes('Observation')) icon = <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>;
                          if (title.includes('Action')) icon = <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
                          if (title.includes('Why')) icon = <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>;
                          
                          return (
                            <div className="flex items-center gap-2 mb-4 mt-6 first:mt-0 pt-2 border-t first:border-0 border-gray-100">
                              {icon}
                              <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest" {...props} />
                            </div>
                          );
                        },
                        p: ({ node, ...props }) => <p className="text-gray-700 leading-relaxed font-bold text-sm mb-4" {...props} />,
                        ul: ({ node, ...props }) => <ul className="grid grid-cols-1 gap-2 mb-6" {...props} />,
                        li: ({ node, ...props }) => (
                          <li className="flex items-start gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm">
                            <span className="w-2 h-2 rounded-full bg-primary-500 mt-2 shrink-0" />
                            <span className="text-gray-800 text-sm font-bold leading-relaxed" {...props} />
                          </li>
                        ),
                        strong: ({ node, ...props }) => <strong className="font-extrabold text-primary-950 bg-primary-100/80 px-2 py-0.5 rounded-md border border-primary-200" {...props} />
                      }}
                    >
                      {reasoning}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer: Timing */}
        {recommendation.timing && (
          <div className="mt-auto pt-6 border-t border-gray-100 flex items-center justify-between">
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">
              Expected Impact Window
            </p>
            <span className="text-[11px] font-black text-primary-800 bg-primary-100/80 px-4 py-2 rounded-xl border-2 border-primary-200/50 shadow-sm">
              {recommendation.timing}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecommendationCard;

