import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { recommendationService } from '../../services/recommendationService';
import RecommendationCard from '../field/RecommendationCard';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';
import { RECOMMENDATION_STATUS } from '../../utils/constants';

const RecommendationsTab = ({ fieldId }) => {
  const { t } = useLanguage();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [aiReasoning, setAiReasoning] = useState('');
  const [generatingAdvisory, setGeneratingAdvisory] = useState(false);

  useEffect(() => {
    fetchRecommendations();
  }, [fieldId]);

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

      const response = await recommendationService.getRecommendations(fieldId, lat, lon);
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

      const response = await recommendationService.generateAdvisory(fieldId, lat, lon);
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

      {/* Gemini Human Advisory Card */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-xl shadow-lg overflow-hidden border border-emerald-400/20">
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.364-7.364l-.707-.707M6.34 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h4 className="text-lg font-bold text-white tracking-wide">Gemini AI Smart Advisory</h4>
            </div>
            
            {isPlaceholder && (
              <button
                onClick={handleGenerateAdvisory}
                disabled={generatingAdvisory}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all shadow-md ${
                  generatingAdvisory 
                    ? 'bg-emerald-800 text-emerald-400 cursor-not-allowed' 
                    : 'bg-white text-emerald-700 hover:bg-emerald-50 active:scale-95'
                }`}
              >
                {generatingAdvisory ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-emerald-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </span>
                ) : 'Generate AI Advisory'}
              </button>
            )}
          </div>
          
          <div className="prose prose-sm prose-invert max-w-none">
            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg border border-white/10 whitespace-pre-line text-emerald-50 leading-relaxed italic">
              {aiReasoning}
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <span className="text-[10px] text-emerald-200 font-medium uppercase tracking-wider bg-emerald-900/40 px-2 py-1 rounded">Bilingual Output (EN/TA)</span>
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






