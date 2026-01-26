import React from 'react';

const SensorGauge = ({ label, value, unit, min = 0, max = 100, color = 'primary' }) => {
  // Check if value is null/undefined
  const hasData = value !== null && value !== undefined && !isNaN(value);
  
  const percentage = hasData ? ((value - min) / (max - min)) * 100 : 0;
  const normalizedPercentage = Math.max(0, Math.min(100, percentage));
  
  const colorClasses = {
    primary: 'text-primary-600',
    blue: 'text-blue-600',
    green: 'text-green-600',
    orange: 'text-orange-600',
    red: 'text-red-600',
  };

  const strokeColor = {
    primary: '#16a34a',
    blue: '#2563eb',
    green: '#22c55e',
    orange: '#f97316',
    red: '#ef4444',
  };

  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const offset = hasData ? (circumference - (normalizedPercentage / 100) * circumference) : circumference;

  // Add padding to prevent edge clipping (strokeWidth/2 on all sides)
  const padding = 6;
  const svgSize = 128 + (padding * 2);
  const centerX = svgSize / 2;
  const centerY = svgSize / 2;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: `${svgSize}px`, height: `${svgSize}px` }}>
        <svg 
          className="transform -rotate-90" 
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
            stroke="#e5e7eb"
            strokeWidth="12"
            fill="none"
          />
          {/* Progress circle */}
          <circle
            cx={centerX}
            cy={centerY}
            r={radius}
            stroke={hasData ? strokeColor[color] : '#d1d5db'}
            strokeWidth="12"
            fill="none"
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-500"
            style={{
              strokeDasharray: hasData ? circumference : `${circumference * 0.05} ${circumference * 0.95}`
            }}
            opacity={hasData ? 1 : 0.5}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {hasData ? (
            <>
          <span className={`text-2xl font-bold ${colorClasses[color]}`}>
            {value.toFixed(1)}
          </span>
          {unit && (
            <span className="text-xs text-gray-500">{unit}</span>
              )}
            </>
          ) : (
            <>
              <svg className="w-8 h-8 text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-lg font-semibold text-gray-400">—</span>
              {unit && (
                <span className="text-xs text-gray-400">{unit}</span>
              )}
            </>
          )}
        </div>
      </div>
      {label && (
      <p className="mt-2 text-sm font-medium text-gray-700 text-center">{label}</p>
      )}
    </div>
  );
};

export default SensorGauge;






