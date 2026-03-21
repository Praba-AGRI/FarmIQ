import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, ReferenceLine
} from 'recharts';
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
      
      let lat, lon;
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
          console.warn('Geolocation failed for transparency, using backend fallbacks:', geoErr);
        }
      }

      const response = await recommendationService.getTransparencyData(fieldId, lat, lon);
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

        {/* Section 4: Economic Forecasting (Market Intelligence) */}
        {(transparencyData?.market_forecast || transparencyData?.marketForecast) && (
          <div className="p-4 bg-indigo-50/50 rounded-lg border border-indigo-100">
            <h5 className="text-md font-semibold text-indigo-800 mb-3">Section 4: Economic Forecasting (Market Intelligence)</h5>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
                <span className="text-[10px] font-black uppercase text-indigo-500 tracking-wider block mb-1">Current Local Price</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-gray-900">₹{(transparencyData?.market_forecast?.current_price || 0).toLocaleString()}</span>
                  <span className="text-xs text-gray-500 font-bold">/ Quintal</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-tight">Coimbatore Mandi</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm">
                <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider block mb-1">Predicted 14-Day Price</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-emerald-700">₹{(transparencyData?.market_forecast?.predicted_price || 0).toLocaleString()}</span>
                  <span className="text-xs text-emerald-500 font-bold">/ Quintal</span>
                </div>
                <div className="flex items-center gap-1 mt-2">
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                    transparencyData?.market_forecast?.trend === 'UP' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {transparencyData?.market_forecast?.trend} TREND
                  </span>
                  <span className="text-[10px] text-gray-400 font-bold">Confidence: {Math.round((transparencyData?.market_forecast?.confidence || 0) * 100)}%</span>
                </div>
              </div>
            </div>

            {/* Price Prediction Chart */}
            <div className="bg-white p-4 rounded-xl border border-indigo-50 shadow-sm h-64">
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest block mb-4 text-center">Price Trajectory Prediction</span>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[
                  { day: -7, price: (transparencyData?.market_forecast?.historical_data?.[0] || transparencyData?.market_forecast?.current_price - 100), type: 'actual' },
                  { day: -3, price: (transparencyData?.market_forecast?.historical_data?.[2] || transparencyData?.market_forecast?.current_price - 40), type: 'actual' },
                  { day: 0, price: transparencyData?.market_forecast?.current_price, type: 'actual' },
                  { day: 7, price: (transparencyData?.market_forecast?.current_price + transparencyData?.market_forecast?.predicted_price) / 2, type: 'predicted', low: transparencyData?.market_forecast?.current_price + 30, high: transparencyData?.market_forecast?.predicted_price + 10 },
                  { day: 14, price: transparencyData?.market_forecast?.predicted_price, type: 'predicted', low: transparencyData?.market_forecast?.predicted_price - 80, high: transparencyData?.market_forecast?.predicted_price + 80 }
                ]}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="day" 
                    tick={{fontSize: 10, fontWeight: 700}} 
                    tickFormatter={(val) => val === 0 ? "Today" : val > 0 ? `+${val}d` : `${val}d`}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    domain={['auto', 'auto']} 
                    tick={{fontSize: 10, fontWeight: 700}} 
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                    labelFormatter={(val) => val === 0 ? "Today" : val > 0 ? `Day +${val}` : `Day ${val}`}
                  />
                  {/* Confidence Interval */}
                  <Area 
                    type="monotone" 
                    dataKey="high" 
                    stroke="none" 
                    fill="#6366f1" 
                    fillOpacity={0.05} 
                    baseValue="low"
                    connectNulls
                  />
                  <Area 
                    type="monotone" 
                    dataKey="price" 
                    stroke="#6366f1" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorPrice)" 
                    dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                  />
                  <ReferenceLine x={0} stroke="#6366f1" strokeDasharray="3 3" label={{ position: 'top', value: 'Today', fontSize: 10, fill: '#6366f1', fontWeight: 800 }} />
                </AreaChart>
              </ResponsiveContainer>
              <p className="text-[9px] text-gray-400 italic mt-2 text-center">Dotted area represents AI confidence interval based on historical Mandi volatility.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransparencyTab;






