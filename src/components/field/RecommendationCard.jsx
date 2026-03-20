import React from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { RECOMMENDATION_STATUS } from '../../utils/constants';

const RecommendationCard = ({ recommendation, fieldId }) => {
  const { t } = useLanguage();

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
