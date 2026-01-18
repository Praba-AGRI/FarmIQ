import React from 'react';

const SensorMeter = ({ label, value, unit, min = 0, max = 100 }) => {
  const percentage = ((value - min) / (max - min)) * 100;
  const normalizedPercentage = Math.max(0, Math.min(100, percentage));

  const getColor = () => {
    if (normalizedPercentage < 33) return 'bg-red-500';
    if (normalizedPercentage < 66) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-semibold text-gray-900">
          {value.toFixed(1)} {unit}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div
          className={`h-3 rounded-full ${getColor()} transition-all duration-500`}
          style={{ width: `${normalizedPercentage}%` }}
        ></div>
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs text-gray-500">{min} {unit}</span>
        <span className="text-xs text-gray-500">{max} {unit}</span>
      </div>
    </div>
  );
};

export default SensorMeter;






