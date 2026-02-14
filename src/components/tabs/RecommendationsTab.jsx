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

      <div className="grid gap-6">
        {recommendations.map((recommendation, index) => (
          <RecommendationCard key={recommendation.id || index} recommendation={recommendation} />
        ))}
      </div>
    </div>
  );
};

export default RecommendationsTab;






