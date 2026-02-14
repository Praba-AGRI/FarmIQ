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

  useEffect(() => {
    fetchRecommendations();
  }, [fieldId]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await recommendationService.getRecommendations(fieldId);
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

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={fetchRecommendations} />;
  }

  if (recommendations.length === 0) {
    return <div className="text-center py-8 text-gray-600">No recommendations available</div>;
  }

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

      {aiReasoning && (
        <div className="bg-primary-50 border-l-4 border-primary-500 p-4 rounded-r-lg shadow-sm">
          <div className="flex items-center mb-2">
            <svg className="w-5 h-5 text-primary-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <h4 className="font-bold text-primary-900">{t('aiReasoningAssistant')}</h4>
          </div>
          <div className="prose prose-sm max-w-none text-primary-800 whitespace-pre-line">
            {aiReasoning}
          </div>
        </div>
      )}

      <div className="grid gap-6">
        {recommendations.map((recommendation, index) => (
          <RecommendationCard key={recommendation.id || index} recommendation={recommendation} />
        ))}
      </div>
    </div>
  );
};

export default RecommendationsTab;






