import React from 'react';

const SoilTemperatureGauge = ({ label, value, unit, min = 0, max = 50 }) => {
  // Check if value is null/undefined
  const hasData = value !== null && value !== undefined && !isNaN(value);
  
  const percentage = hasData ? ((value - min) / (max - min)) * 100 : 0;
  const normalizedPercentage = Math.max(0, Math.min(100, percentage));
  
  const padding = 6;
  const svgSize = 128 + (padding * 2);
  const radius = 60;
  const centerX = svgSize / 2;
  const centerY = svgSize / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = hasData ? (circumference - (normalizedPercentage / 100) * circumference) : circumference;

  // Determine color based on temperature
  const getColor = () => {
    if (!hasData) return '#d1d5db'; // Gray for no data
    if (value < 15) return '#3b82f6'; // Blue for cold
    if (value < 25) return '#22c55e'; // Green for moderate
    if (value < 35) return '#eab308'; // Yellow for warm
    return '#f97316'; // Orange for hot
  };

  const strokeColor = getColor();

  return (
    <div className="flex flex-col items-center">
      <div 
        className="relative rounded-full overflow-hidden"
        style={{ 
          width: `${svgSize}px`, 
          height: `${svgSize}px`,
          background: 'linear-gradient(135deg, #8b5a3c 0%, #a67c52 50%, #8b5a3c 100%)',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
        }}
      >
        <svg 
          className="transform -rotate-90 absolute" 
          width={svgSize} 
          height={svgSize}
          viewBox={`0 0 ${svgSize} ${svgSize}`}
          style={{ overflow: 'visible' }}
        >
          {/* Background circle */}
          <circle
            cx={centerX}
            cy={centerY}
            r={radius}
            stroke="rgba(139, 90, 60, 0.3)"
            strokeWidth="12"
            fill="none"
          />
          {/* Progress circle */}
          <circle
            cx={centerX}
            cy={centerY}
            r={radius}
            stroke={strokeColor}
            strokeWidth="12"
            fill="none"
            strokeDasharray={hasData ? circumference : `${circumference * 0.05} ${circumference * 0.95}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-500"
            opacity={hasData ? 1 : 0.5}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
          {hasData ? (
            <>
              <span className="text-2xl font-bold text-white drop-shadow-md">
                {value.toFixed(1)}
              </span>
              {unit && (
                <span className="text-xs text-white opacity-90 drop-shadow">{unit}</span>
              )}
            </>
          ) : (
            <>
              <svg className="w-8 h-8 text-white opacity-70 mb-1 drop-shadow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-xl font-semibold text-white opacity-70 drop-shadow-md">—</span>
              {unit && (
                <span className="text-xs text-white opacity-70 drop-shadow">{unit}</span>
              )}
            </>
          )}
        </div>
      </div>
      {label && (
        <p className="mt-2 text-sm font-medium text-amber-900 text-center">{label}</p>
      )}
    </div>
  );
};

export default SoilTemperatureGauge;



