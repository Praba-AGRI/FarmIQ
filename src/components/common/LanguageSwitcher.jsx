import React from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { LANGUAGES } from '../../utils/constants';

const LanguageSwitcher = () => {
  const { language, switchLanguage, t } = useLanguage();

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={() => switchLanguage(LANGUAGES.ENGLISH)}
        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
          language === LANGUAGES.ENGLISH
            ? 'bg-primary-600 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        English
      </button>
      <button
        onClick={() => switchLanguage(LANGUAGES.TAMIL)}
        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
          language === LANGUAGES.TAMIL
            ? 'bg-primary-600 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        தமிழ்
      </button>
    </div>
  );
};

export default LanguageSwitcher;






