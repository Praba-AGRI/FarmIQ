import React, { useState, useEffect } from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const LineChart = ({ data, dataKey, name, color = '#16a34a', unit = '' }) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Responsive chart height: optimized for better fit in cards
  const chartHeight = isMobile ? 200 : 250;

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={chartHeight}>
        <RechartsLineChart 
          data={data} 
          margin={{ 
            top: 8, 
            right: isMobile ? 8 : 20, 
            left: isMobile ? -5 : 15, 
            bottom: isMobile ? 35 : 50 
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.25} />
          <XAxis 
            dataKey="time" 
            tick={{ fontSize: isMobile ? 9 : 11, fill: '#6b7280' }}
            angle={-45}
            textAnchor="end"
            height={isMobile ? 45 : 50}
            stroke="#9ca3af"
            interval={isMobile ? 'preserveStartEnd' : 'equidistantPreserveStart'}
            tickMargin={8}
          />
          <YAxis 
            tick={{ fontSize: isMobile ? 9 : 11, fill: '#6b7280' }}
            label={{ 
              value: unit, 
              angle: -90, 
              position: 'insideLeft',
              style: { textAnchor: 'middle', fontSize: isMobile ? 9 : 11, fill: '#6b7280' }
            }}
            stroke="#9ca3af"
            width={isMobile ? 35 : 45}
          />
          <Tooltip 
            formatter={(value) => [`${Number(value).toFixed(1)} ${unit}`, name]}
            labelStyle={{ color: '#374151', fontWeight: 'bold', fontSize: isMobile ? 10 : 11 }}
            contentStyle={{ 
              backgroundColor: 'white', 
              border: `1px solid ${color}20`, 
              borderRadius: '6px',
              fontSize: isMobile ? 10 : 11,
              padding: isMobile ? '6px 8px' : '8px 10px',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
            }}
            cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '3 3', opacity: 0.4 }}
          />
          <Legend 
            wrapperStyle={{ fontSize: isMobile ? 10 : 11, paddingTop: '8px' }}
            iconType="line"
            iconSize={12}
          />
          <Line 
            type="monotone" 
            dataKey={dataKey} 
            name={name}
            stroke={color} 
            strokeWidth={isMobile ? 2 : 2.5}
            dot={false}
            activeDot={{ r: isMobile ? 4 : 5, stroke: color, strokeWidth: 2, fill: 'white' }}
            animationDuration={600}
          />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default LineChart;