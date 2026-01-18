import React from 'react';
import FieldCard from './FieldCard';

const FieldList = ({ fields, demoMode = false }) => {
  if (!fields || fields.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {fields.map((field) => (
        <FieldCard key={field.id} field={field} demoMode={demoMode} />
      ))}
    </div>
  );
};

export default FieldList;






