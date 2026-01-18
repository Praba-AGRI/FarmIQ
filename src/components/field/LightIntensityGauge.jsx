import React from 'react';

const LightIntensityGauge = ({ label, value, unit, min = 0, max = 1000 }) => {
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

  // Determine color based on light intensity
  const getColor = () => {
    if (!hasData) return '#d1d5db'; // Gray for no data
    if (value < 200) return '#64748b'; // Gray for low
    if (value < 500) return '#fbbf24'; // Yellow for moderate
    if (value < 800) return '#f59e0b'; // Orange for bright
    return '#fbbf24'; // Bright yellow/gold for very bright
  };

  const strokeColor = getColor();

  // Generate sun rays for background
  const rays = Array.from({ length: 12 }, (_, i) => {
    const angle = (i * 360) / 12;
    const radian = (angle * Math.PI) / 180;
    return {
      x1: centerX + Math.cos(radian) * (radius - 10),
      y1: centerY + Math.sin(radian) * (radius - 10),
      x2: centerX + Math.cos(radian) * (radius + 15),
      y2: centerY + Math.sin(radian) * (radius + 15),
    };
  });

  return (
    <div className="flex flex-col items-center">
      <div 
        className="relative rounded-full overflow-hidden"
        style={{ 
          width: `${svgSize}px`, 
          height: `${svgSize}px`,
          background: 'radial-gradient(circle, #fef3c7 0%, #fde68a 30%, #fbbf24 70%, #f59e0b 100%)',
          boxShadow: '0 0 20px rgba(251, 191, 36, 0.5), inset 0 0 20px rgba(255, 255, 255, 0.3)'
        }}
      >
        {/* Sun rays background */}
        <svg 
          className="absolute top-0 left-0"
          width={svgSize} 
          height={svgSize}
          viewBox={`0 0 ${svgSize} ${svgSize}`}
          style={{ opacity: 0.6 }}
        >
          {rays.map((ray, i) => (
            <line
              key={i}
              x1={ray.x1}
              y1={ray.y1}
              x2={ray.x2}
              y2={ray.y2}
              stroke="#f59e0b"
              strokeWidth="2"
              strokeLinecap="round"
            />
          ))}
        </svg>

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
            stroke="rgba(251, 191, 36, 0.3)"
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
            style={{ 
              filter: hasData ? 'drop-shadow(0 0 4px rgba(251, 191, 36, 0.8))' : 'none',
              opacity: hasData ? 1 : 0.5
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
          {hasData ? (
            <>
              <span className="text-2xl font-bold text-amber-900 drop-shadow-md">
                {value.toFixed(0)}
              </span>
              {unit && (
                <span className="text-xs text-amber-800 opacity-90 drop-shadow">{unit}</span>
              )}
            </>
          ) : (
            <>
              <svg className="w-8 h-8 text-amber-900 opacity-70 mb-1 drop-shadow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-xl font-semibold text-amber-900 opacity-70 drop-shadow-md">—</span>
              {unit && (
                <span className="text-xs text-amber-800 opacity-70 drop-shadow">{unit}</span>
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

export default LightIntensityGauge;



