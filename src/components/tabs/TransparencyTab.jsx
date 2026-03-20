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

  const irrigationShap = transparencyData?.irrigation_shap_weights || transparencyData?.irrigationShapWeights || {};
  const pestShap = transparencyData?.pest_shap_weights || transparencyData?.pestShapWeights || {};

  const renderShapBars = (shapData, title) => {
    if (Object.keys(shapData).length === 0) return null;
    
    // Sort by absolute value descending
    const sortedFeatures = Object.entries(shapData).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
    const maxVal = Math.max(...sortedFeatures.map(([_, v]) => Math.abs(v)), 0.1);

    return (
      <div className="mt-6">
        <h5 className="text-sm font-semibold text-gray-700 mb-3">{title} - Key Feature Impact (XAI)</h5>
        <div className="space-y-3">
          {sortedFeatures.map(([feature, weight]) => (
            <div key={feature} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-gray-600">{feature}</span>
                <span className={weight > 0 ? "text-green-600" : "text-red-500"}>
                  {weight > 0 ? "+" : ""}{weight.toFixed(4)}
                </span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${weight > 0 ? "bg-green-500" : "bg-red-400"}`}
                  style={{ width: `${(Math.abs(weight) / maxVal) * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold">{t('transparency')}</h3>
      <p className="text-gray-600 mb-6">
        This page shows the data and logic used by the AI system to generate recommendations.
      </p>

      {/* Sensor values card */}
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h4 className="text-lg font-semibold mb-2">{t('predictedStage')}</h4>
          <p className="text-xl font-semibold text-primary-600">{predictedStage}</p>
        </div>
        <div className="card">
          <h4 className="text-lg font-semibold mb-2">{t('gddValue')}</h4>
          <p className="text-xl font-semibold">{gddValue} GDD</p>
        </div>
      </div>

      <div className="card">
        <h4 className="text-lg font-semibold mb-4">ML & Logic Transparency</h4>
        
        {/* Irrigation Logic */}
        <div className="mb-6 p-4 bg-blue-50/50 rounded-lg border border-blue-100">
          <h5 className="text-md font-semibold text-blue-800 mb-2">Irrigation Decision (Bi-LSTM Model)</h5>
          <p className="text-sm text-gray-700 bg-white p-2 rounded mb-3 border border-blue-100">{irrigationLogic}</p>
          
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white p-2 rounded shadow-sm">
              <span className="text-[10px] text-gray-500 block">ET0</span>
              <span className="font-mono text-sm text-blue-700 font-bold">{transparencyData.et0 ?? 'N/A'} mm</span>
            </div>
            <div className="bg-white p-2 rounded shadow-sm">
              <span className="text-[10px] text-gray-500 block">Kc (Crop Coeff.)</span>
              <span className="font-mono text-sm text-green-700 font-bold">{transparencyData.kc ?? 'N/A'}</span>
            </div>
            <div className="bg-white p-2 rounded shadow-sm">
              <span className="text-[10px] text-gray-500 block">ETc (Crop ET)</span>
              <span className="font-mono text-sm text-indigo-700 font-bold">{transparencyData.etc ?? 'N/A'} mm</span>
            </div>
          </div>
          
          {renderShapBars(irrigationShap, "Irrigation Drivers")}
        </div>

        {/* Nutrient Logic */}
        <div className="mb-6 p-4 bg-green-50/50 rounded-lg border border-green-100">
          <h5 className="text-md font-semibold text-green-800 mb-2">Nutrient Recommendation (Random Forest)</h5>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 mb-3">
            {(transparencyData?.nutrient_recommendations || transparencyData?.nutrientRecommendations || []).map((factor, index) => (
              <li key={index}>{factor}</li>
            ))}
          </ul>
          {renderShapBars(transparencyData?.nutrient_shap_weights || transparencyData?.nutrientShapWeights || {}, "Nutrient Drivers")}
        </div>

        {/* Pest Logic */}
        <div className="mb-6 p-4 bg-red-50/50 rounded-lg border border-red-100">
          <h5 className="text-md font-semibold text-red-800 mb-2">Pest Risk (Random Forest Classifier)</h5>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 mb-3">
            {pestRiskFactors.map((factor, index) => (
              <li key={index}>{factor}</li>
            ))}
          </ul>
          {renderShapBars(pestShap, "Pest/Disease Drivers")}
        </div>

        {/* Spraying Logic */}
        <div className="p-4 bg-yellow-50/50 rounded-lg border border-yellow-100">
          <h5 className="text-md font-semibold text-yellow-800 mb-2">Spraying Conditions (Rule-Based Engine)</h5>
          <p className="text-sm text-gray-700 mb-3">Decision drivers based on sensor safety thresholds:</p>
          {renderShapBars(transparencyData?.spraying_shap_weights || transparencyData?.sprayingShapWeights || {}, "Safety Factor Proximity")}
        </div>
      </div>
    </div>
  );
};

export default TransparencyTab;






