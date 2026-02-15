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

  // Add defensive checks - handle both camelCase and snake_case from backend
  const sensorValues = transparencyData?.sensorValues || transparencyData?.sensor_values || {};
  const pestRiskFactors = Array.isArray(transparencyData?.pestRiskFactors)
    ? transparencyData.pestRiskFactors
    : Array.isArray(transparencyData?.pest_risk_factors)
      ? transparencyData.pest_risk_factors
      : [];
  const predictedStage = transparencyData?.predictedStage || transparencyData?.predicted_stage || 'Unknown';
  const gddValue = transparencyData?.gddValue ?? transparencyData?.gdd_value ?? 0;
  const irrigationLogic = transparencyData?.irrigationLogic || transparencyData?.irrigation_logic || 'No data available';

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold">{t('transparency')}</h3>
      <p className="text-gray-600 mb-6">
        This page shows the data and logic used by the AI system to generate recommendations.
      </p>

      <div className="card">
        <h4 className="text-lg font-semibold mb-4">{t('sensorValues')}</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(sensorValues).map(([key, value]) => (
            <div key={key} className="bg-gray-50 p-3 rounded">
              <p className="text-sm text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
              <p className="text-lg font-semibold">{value ?? 'N/A'}</p>
            </div>
          ))}
        </div>
        {Object.keys(sensorValues).length === 0 && (
          <p className="text-gray-500 text-center py-4">No sensor values available</p>
        )}
      </div>

      <div className="card">
        <h4 className="text-lg font-semibold mb-4">{t('predictedStage')}</h4>
        <p className="text-xl font-semibold text-primary-600">{predictedStage}</p>
      </div>

      <div className="card">
        <h4 className="text-lg font-semibold mb-4">{t('gddValue')}</h4>
        <p className="text-xl font-semibold">{gddValue} GDD</p>
        <p className="text-sm text-gray-600 mt-2">Growing Degree Days accumulated</p>
      </div>

      <div className="card">
        <h4 className="text-lg font-semibold mb-4">{t('irrigationLogic')}</h4>
        <p className="text-gray-700">{irrigationLogic}</p>

        {/* Detailed Irrigation Metrics */}
        {(transparencyData.et0 !== undefined || transparencyData.etc !== undefined) && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <h5 className="text-sm font-semibold text-gray-700 mb-2">Calculated Metrics (Penman-Monteith)</h5>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 p-2 rounded">
                <span className="text-xs text-gray-500 block">ET0</span>
                <span className="font-mono text-blue-700">{transparencyData.et0 ?? 'N/A'} mm</span>
              </div>
              <div className="bg-green-50 p-2 rounded">
                <span className="text-xs text-gray-500 block">Kc (Crop Coeff.)</span>
                <span className="font-mono text-green-700">{transparencyData.kc ?? 'N/A'}</span>
              </div>
              <div className="bg-indigo-50 p-2 rounded">
                <span className="text-xs text-gray-500 block">ETc (Crop ET)</span>
                <span className="font-mono text-indigo-700">{transparencyData.etc ?? 'N/A'} mm</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h4 className="text-lg font-semibold mb-4">{t('pestRiskFactors')}</h4>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          {pestRiskFactors.map((factor, index) => (
            <li key={index}>{factor}</li>
          ))}
        </ul>
        {pestRiskFactors.length === 0 && (
          <p className="text-gray-500 text-center py-4">No pest risk factors identified</p>
        )}
      </div>
    </div>
  );
};

export default TransparencyTab;






