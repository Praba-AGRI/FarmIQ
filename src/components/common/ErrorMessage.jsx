import React from 'react';
import { useLanguage } from '../../hooks/useLanguage';

const ErrorMessage = ({ message, onRetry }) => {
  const { t } = useLanguage();

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
      <div className="flex items-center">
        <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
        <p className="text-red-800 flex-1">{message || t('error')}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="ml-4 text-red-600 hover:text-red-800 font-medium"
          >
            {t('retry') || 'Retry'}
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorMessage;






