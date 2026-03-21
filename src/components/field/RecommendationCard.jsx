import React, { useState } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { RECOMMENDATION_STATUS } from '../../utils/constants';
import { recommendationService } from '../../services/recommendationService';

const RecommendationCard = ({ recommendation, fieldId, isLoadingReasoning, aiLanguage = 'EN' }) => {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

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

  const handleMarkCompleted = async () => {
    try {
      setIsCompleting(true);
      
      let volume = 0;
      if (recommendation.title === 'Irrigation' && recommendation.ml_data?.amount_mm) {
        volume = recommendation.ml_data.amount_mm;
      } else if (recommendation.title === 'Nutrients' && recommendation.ml_data?.nitro_kg) {
        volume = recommendation.ml_data.nitro_kg;
      }

      await recommendationService.completeAction(fieldId, recommendation.title, volume);
      setIsCompleted(true);
    } catch (err) {
      console.error('Failed to mark action as completed:', err);
      alert('Failed to log intervention. Please try again.');
    } finally {
      setIsCompleting(false);
    }
  };

  if (isCompleted) {
    return (
      <div className="card border-2 shadow-sm rounded-xl overflow-hidden transition-all duration-300 border-emerald-200 bg-emerald-50 content-center h-full p-6 opacity-80">
        <div className="flex flex-col items-center justify-center text-center gap-3">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-black text-emerald-800">{recommendation.title} Completed</h3>
          <p className="text-sm font-bold text-emerald-600">The ML baseline has been instantly recalibrated.</p>
        </div>
      </div>
    );
  }

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
          <div className="bg-amber-50/70 border-l-4 border-amber-400 rounded-r-xl p-5 mb-4 shadow-sm">
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

        {/* AI REASONING DROPDOWN (Injection State) */}
        <div className="mb-6 border border-gray-100 rounded-xl overflow-hidden bg-white shadow-sm">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full px-5 py-3 flex items-center justify-between text-left hover:bg-gray-50 focus:outline-none transition-colors"
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="font-bold text-gray-800 text-sm tracking-tight">AI Reasoning Explorer</span>
            </div>
            <svg className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-96 opacity-100 border-t border-gray-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
            <div className="p-5 bg-gray-50/50">
              {isLoadingReasoning ? (
                <div className="animate-pulse flex flex-col gap-2">
                  <div className="h-2.5 bg-gray-200 rounded w-full"></div>
                  <div className="h-2.5 bg-gray-200 rounded w-5/6"></div>
                  <div className="h-2.5 bg-gray-200 rounded w-4/6"></div>
                </div>
              ) : recommendation.detailed_reasoning_en || recommendation.detailed_reasoning ? (
                <p className="text-sm font-medium text-gray-700 leading-relaxed whitespace-pre-line transition-opacity duration-700 focus:outline-none">
                  {aiLanguage === 'EN' 
                    ? (recommendation.detailed_reasoning_en || recommendation.detailed_reasoning)
                    : (recommendation.detailed_reasoning_ta || recommendation.detailed_reasoning)}
                </p>
              ) : (
                <p className="text-sm text-gray-500 italic">No detailed reasoning available.</p>
              )}
            </div>
          </div>
        </div>

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

            {recommendation.title === "Market & Harvest" && (
              <>
                <div className="flex items-center gap-2 text-[11px] font-black text-gray-500 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 shadow-sm transition-all hover:bg-white hover:border-emerald-200 cursor-default">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  PRICE: ₹{recommendation.ml_data.price} / Q
                </div>
                <div className={`flex items-center gap-2 text-[11px] font-black px-3 py-2 rounded-xl border shadow-sm transition-all cursor-default ${
                  recommendation.ml_data.trend === 'UP' ? 'bg-green-50 text-green-700 border-green-200' : 
                  recommendation.ml_data.trend === 'DOWN' ? 'bg-red-50 text-red-700 border-red-200' : 
                  'bg-gray-50 text-gray-500 border-gray-100'
                }`}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {recommendation.ml_data.trend === 'UP' ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    ) : recommendation.ml_data.trend === 'DOWN' ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 12h14" />
                    )}
                  </svg>
                  TREND: {recommendation.ml_data.trend}
                </div>
              </>
            )}
          </div>
        )}

        {/* Footer: Timing & HITL Button */}
        <div className="mt-auto pt-6 border-t border-gray-100 flex items-center justify-between">
          <div>
            {recommendation.timing && (
              <>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mb-1">
                  Expected Impact Window
                </p>
                <span className="text-[11px] font-black text-primary-800 bg-primary-100/80 px-4 py-2 rounded-xl border-2 border-primary-200/50 shadow-sm inline-block">
                  {recommendation.timing}
                </span>
              </>
            )}
          </div>
          
          {isCritical && (
            <button 
              onClick={handleMarkCompleted}
              disabled={isCompleting}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black shadow-md text-sm transition-all active:scale-95 ${
                isCompleting 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                  : 'bg-emerald-600 text-white hover:bg-emerald-500 border border-emerald-700'
              }`}
            >
              {isCompleting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Logging...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  Mark as Completed
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecommendationCard;
