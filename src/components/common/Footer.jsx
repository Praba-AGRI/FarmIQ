import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../hooks/useLanguage';

const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-gray-800 text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="relative flex-shrink-0">
                <div className="h-14 w-14 md:h-16 md:w-16 rounded-full shadow-2xl bg-white p-0 relative z-10 flex items-center justify-center overflow-hidden">
                  <img 
                    src="/website-logo.png" 
                    alt="FarmIQ Logo" 
                    className="w-full h-full object-contain"
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}
                  />
                </div>
              </div>
              <div className="flex flex-col">
                <h3 className="text-xl font-extrabold text-white" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif', letterSpacing: '-0.02em' }}>
                  Farm<span className="text-primary-400">IQ</span>
                </h3>
                <p className="text-[9px] text-gray-400 font-medium tracking-wide uppercase leading-tight">
                  Smarter Decisions for Better Yields
                </p>
              </div>
            </div>
            <p className="text-gray-400 mb-2 text-sm">
              AI-powered climate-resilient farming decision support system
            </p>
            <p className="text-sm text-gray-500 mb-2">
              {t('designedForIndianAgriculture')}
            </p>
            <p className="text-sm text-gray-500">
              {t('dataPrivacyNote')}
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-gray-400">
              <li><a href="/dashboard" className="hover:text-white">Dashboard</a></li>
              <li><a href="/advisories" className="hover:text-white">Advisory History</a></li>
              <li><a href="/profile" className="hover:text-white">Profile</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Support</h3>
            <p className="text-gray-400 mb-3">
              Based on ICAR/TNAU recommendations
            </p>
            <ul className="space-y-2 text-gray-400">
              <li><Link to="/contact" className="hover:text-white">{t('contact')}</Link></li>
              <li><a href="#" className="hover:text-white">{t('feedback')}</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; 2024 FarmIQ. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;






