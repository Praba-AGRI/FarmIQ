import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { recommendationService } from '../../services/recommendationService';
import RecommendationCard from '../field/RecommendationCard';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';
import { RECOMMENDATION_STATUS } from '../../utils/constants';

const RecommendationsTab = ({ fieldId }) => {
  const { t, language: globalLanguage } = useLanguage();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [aiReasoning, setAiReasoning] = useState('');
  const [generatingAdvisory, setGeneratingAdvisory] = useState(false);

  useEffect(() => {
    fetchRecommendations();
  }, [fieldId, globalLanguage]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      setError('');

      let lat, lon;
      
      // Try to get geolocation if available
      if (navigator.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 0
            });
          });
          lat = position.coords.latitude;
          lon = position.coords.longitude;
        } catch (geoErr) {
          console.warn('Geolocation failed for recommendations, using backend fallbacks:', geoErr);
        }
      }

      const response = await recommendationService.getRecommendations(fieldId, lat, lon, globalLanguage);
      const data = response.data;

      setRecommendations(data.recommendations || []);
      setAiReasoning(data.ai_reasoning_text || '');
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setError('Failed to load real-time AI recommendations. Please ensure your sensors are online.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAdvisory = async () => {
    try {
      setGeneratingAdvisory(true);
      let lat, lon;
      if (navigator.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          });
          lat = position.coords.latitude;
          lon = position.coords.longitude;
        } catch (e) {}
      }

      const response = await recommendationService.generateAdvisory(fieldId, lat, lon, globalLanguage);
      setAiReasoning(response.data.ai_reasoning_text);
    } catch (err) {
      console.error('Error generating advisory:', err);
      alert('Failed to generate AI advisory. Please try again in 1 minute.');
    } finally {
      setGeneratingAdvisory(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={fetchRecommendations} />;
  }

  if (recommendations.length === 0) {
    return <div className="text-center py-8 text-gray-600">No recommendations available</div>;
  }

  const isPlaceholder = !aiReasoning || aiReasoning.includes('Click \'Generate\'');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-gray-900">{t('recommendations')}</h3>
        <button
          onClick={fetchRecommendations}
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          {t('refresh')}
        </button>
      </div>

      {/* FarmIQ AI Smart Advisory Card */}
      <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-emerald-800 rounded-2xl shadow-xl overflow-hidden border border-white/20 relative group">
        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-4">
              <div className="bg-white/10 backdrop-blur-md p-2.5 rounded-xl border border-white/20 shadow-lg animate-pulse-slow">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.364-7.364l-.707-.707M6.34 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <h4 className="text-xl font-black text-white tracking-tight leading-none mb-1">FarmIQ AI Smart Advisory</h4>
                <p className="text-primary-100 text-[10px] font-bold uppercase tracking-widest opacity-80">Precision Cognitive Engine</p>
              </div>
            </div>
            
            {isPlaceholder && (
              <button
                onClick={handleGenerateAdvisory}
                disabled={generatingAdvisory}
                className={`px-5 py-2.5 rounded-xl font-black text-sm transition-all shadow-xl flex items-center gap-2 group/btn ${
                  generatingAdvisory 
                    ? 'bg-emerald-900/50 text-emerald-400 cursor-not-allowed border border-emerald-700/50' 
                    : 'bg-white text-emerald-700 hover:bg-emerald-50 active:scale-95 border border-transparent'
                }`}
              >
                {generatingAdvisory ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-emerald-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Processing Data...</span>
                  </>
                ) : (
                  <>
                    <span>Generate AI Smart Advisory</span>
                    <svg className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
            )}
          </div>
          
          <div className="prose prose-sm prose-invert max-w-none">
            <div className="bg-black/20 backdrop-blur-md p-5 rounded-xl border border-white/10 whitespace-pre-line text-emerald-50 leading-relaxed font-medium shadow-inner relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary-400 to-transparent opacity-50" />
                {aiReasoning}
            </div>
          </div>
          <div className="mt-4 flex justify-between items-center bg-black/10 px-4 py-2 rounded-lg border border-white/5">
            <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-emerald-100 font-black uppercase tracking-widest">Real-time ML Stream Active</span>
            </div>
            <span className="text-[10px] text-emerald-200 font-bold uppercase tracking-wider bg-white/10 px-3 py-1 rounded-full border border-white/10 shadow-sm backdrop-blur-md">
                Bilingual Output (EN/TA)
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        {recommendations.map((recommendation, index) => (
          <RecommendationCard key={recommendation.id || index} recommendation={recommendation} fieldId={fieldId} />
        ))}
      </div>
    </div>
  );
};

export default RecommendationsTab;






