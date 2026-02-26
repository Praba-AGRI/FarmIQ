import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import LanguageSwitcher from './LanguageSwitcher';
import ProfileDropdown from './ProfileDropdown';

const Header = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Detect if we're in demo mode by checking if the path starts with /demo
  const isDemoMode = location.pathname.startsWith('/demo');

  return (
    <header className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
              <div className="flex-shrink-0 h-11 w-11 sm:h-14 sm:w-14 rounded-full shadow-lg bg-white p-0 flex items-center justify-center overflow-hidden">
                <img
                  src="/website-logo.png"
                  alt="FarmIQ Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex flex-col justify-center">
                <span className="text-lg sm:text-xl font-semibold text-primary-600 leading-tight" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif', letterSpacing: '-0.01em' }}>
                  Farm<span className="text-primary-700">IQ</span>
                </span>
                <span className="hidden sm:block text-[9px] text-gray-500 font-medium tracking-wide uppercase leading-tight mt-0.5">
                  Smarter Decisions for Better Yields
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <LanguageSwitcher />

            {(user || isDemoMode) ? (
              <>
                <Link to={isDemoMode ? "/demo" : "/dashboard"} className="text-gray-700 hover:text-primary-600">
                  {t('dashboard')}
                </Link>
                <Link to="/community" className="text-gray-700 hover:text-primary-600">
                  Community
                </Link>
                <Link to="/market" className="text-gray-700 hover:text-primary-600">
                  Market
                </Link>
                {!isDemoMode && (
                  <>
                    <Link to="/advisories" className="text-gray-700 hover:text-primary-600">
                      {t('advisoryHistory')}
                    </Link>
                    <Link to="/settings" className="text-gray-700 hover:text-primary-600">
                      {t('settings')}
                    </Link>
                    <ProfileDropdown />
                  </>
                )}
              </>
            ) : (
              <>
                <Link to="/login" className="text-gray-700 hover:text-primary-600">
                  {t('login')}
                </Link>
                <Link to="/signup" className="btn-primary text-sm">
                  {t('signup')}
                </Link>
              </>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-md text-gray-700 hover:text-primary-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <div className="flex flex-col space-y-4">
              <div className="px-2">
                <LanguageSwitcher />
              </div>

              {(user || isDemoMode) ? (
                <>
                  <Link
                    to={isDemoMode ? "/demo" : "/dashboard"}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-primary-600 rounded-md"
                  >
                    {t('dashboard')}
                  </Link>
                  <Link
                    to="/community"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-primary-600 rounded-md"
                  >
                    Community
                  </Link>
                  <Link
                    to="/market"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-primary-600 rounded-md"
                  >
                    Market
                  </Link>
                  {!isDemoMode && (
                    <>
                      <Link
                        to="/advisories"
                        onClick={() => setMobileMenuOpen(false)}
                        className="block px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-primary-600 rounded-md"
                      >
                        {t('advisoryHistory')}
                      </Link>
                      <Link
                        to="/settings"
                        onClick={() => setMobileMenuOpen(false)}
                        className="block px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-primary-600 rounded-md"
                      >
                        {t('settings')}
                      </Link>
                      <div className="px-4 py-2">
                        <ProfileDropdown />
                      </div>
                    </>
                  )}
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-primary-600 rounded-md"
                  >
                    {t('login')}
                  </Link>
                  <Link
                    to="/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-2 btn-primary text-center"
                  >
                    {t('signup')}
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;