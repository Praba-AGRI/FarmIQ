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

  useEffect(() => {
    fetchRecommendations();
  }, [fieldId]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      setError('');
      // Mock data for demonstration
      setRecommendations([
        {
          id: 1,
          title: t('irrigation'),
          description: 'Irrigate the field with 2 inches of water. Current soil moisture is below optimal levels.',
          status: RECOMMENDATION_STATUS.DO_NOW,
          explanation: 'Soil moisture is at 45%, which is below the optimal range of 60-70% for the current crop stage.',
          timing: 'Within next 6 hours',
        },
        {
          id: 2,
          title: t('nutrients'),
          description: 'Apply nitrogen fertilizer at recommended dosage.',
          status: RECOMMENDATION_STATUS.WAIT,
          explanation: 'Crop is in vegetative stage. Wait for 2 days after irrigation before applying fertilizer.',
          timing: 'After 2 days',
        },
        {
          id: 3,
          title: t('pestRisk'),
          description: 'Monitor for pest activity. High humidity conditions favor pest development.',
          status: RECOMMENDATION_STATUS.MONITOR,
          explanation: 'Relative humidity is above 60% and temperature is optimal for pest activity. Regular monitoring recommended.',
          timing: 'Daily monitoring',
        },
      ]);
      // const response = await recommendationService.getRecommendations(fieldId);
      // setRecommendations(response.data);
    } catch (err) {
      setError('Failed to load recommendations');
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
      <h3 className="text-xl font-semibold">{t('recommendations')}</h3>
      {recommendations.map((recommendation) => (
        <RecommendationCard key={recommendation.id} recommendation={recommendation} />
      ))}
    </div>
  );
};

export default RecommendationsTab;






