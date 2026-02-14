import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { recommendationService } from '../../services/recommendationService';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';

const TransparencyTab = ({ fieldId }) => {
  const { t } = useLanguage();
  const [transparencyData, setTransparencyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTransparencyData();
  }, [fieldId]);

  const fetchTransparencyData = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await recommendationService.getTransparencyData(fieldId);
      setTransparencyData(response.data);
    } catch (err) {
      console.error('Error fetching transparency data:', err);
      setError('Failed to load transparency data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={fetchTransparencyData} />;
  }

  if (!transparencyData) {
    return <div className="text-center py-8 text-gray-600">No transparency data available</div>;
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold">{t('transparency')}</h3>
      <p className="text-gray-600 mb-6">
        This page shows the data and logic used by the AI system to generate recommendations.
      </p>

      <div className="card">
        <h4 className="text-lg font-semibold mb-4">{t('sensorValues')}</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(transparencyData.sensorValues).map(([key, value]) => (
            <div key={key} className="bg-gray-50 p-3 rounded">
              <p className="text-sm text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
              <p className="text-lg font-semibold">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h4 className="text-lg font-semibold mb-4">{t('predictedStage')}</h4>
        <p className="text-xl font-semibold text-primary-600">{transparencyData.predictedStage}</p>
      </div>

      <div className="card">
        <h4 className="text-lg font-semibold mb-4">{t('gddValue')}</h4>
        <p className="text-xl font-semibold">{transparencyData.gddValue} GDD</p>
        <p className="text-sm text-gray-600 mt-2">Growing Degree Days accumulated</p>
      </div>

      <div className="card">
        <h4 className="text-lg font-semibold mb-4">{t('irrigationLogic')}</h4>
        <p className="text-gray-700">{transparencyData.irrigationLogic}</p>
      </div>

      <div className="card">
        <h4 className="text-lg font-semibold mb-4">{t('pestRiskFactors')}</h4>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          {transparencyData.pestRiskFactors.map((factor, index) => (
            <li key={index}>{factor}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default TransparencyTab;






