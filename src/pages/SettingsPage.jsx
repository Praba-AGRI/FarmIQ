import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { LANGUAGES, THEMES } from '../utils/constants';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import LoadingSpinner from '../components/common/LoadingSpinner';

const SettingsPage = () => {
  const { user } = useAuth();
  const { language, switchLanguage } = useLanguage();
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      sms: false,
      push: true,
    },
    alerts: {
      irrigation: true,
      pest: true,
      weather: true,
      nutrients: false,
    },
    theme: THEMES.LIGHT,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadSettings();
  }, [user, navigate]);

  const loadSettings = () => {
    // Load from localStorage or API
    const savedSettings = localStorage.getItem('settings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        // Use defaults
      }
    }
    setLoading(false);
  };

  const handleNotificationChange = (key) => {
    setSettings({
      ...settings,
      notifications: {
        ...settings.notifications,
        [key]: !settings.notifications[key],
      },
    });
  };

  const handleAlertChange = (key) => {
    setSettings({
      ...settings,
      alerts: {
        ...settings.alerts,
        [key]: !settings.alerts[key],
      },
    });
  };

  const handleLanguageChange = (lang) => {
    switchLanguage(lang);
  };

  const handleThemeChange = (theme) => {
    setSettings({
      ...settings,
      theme,
    });
    // Apply theme (would need theme context/provider)
    document.documentElement.classList.toggle('dark', theme === THEMES.DARK);
  };

  const handleSave = () => {
    setSaving(true);
    localStorage.setItem('settings', JSON.stringify(settings));
    setTimeout(() => {
      setSaving(false);
      alert('Settings saved successfully');
    }, 500);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow">
          <LoadingSpinner />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Settings</h1>

          {/* Notifications */}
          <div className="card mb-6">
            <h2 className="text-xl font-semibold mb-4">Notifications</h2>
            <div className="space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-gray-700">Email Notifications</span>
                <input
                  type="checkbox"
                  checked={settings.notifications.email}
                  onChange={() => handleNotificationChange('email')}
                  className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-gray-700">SMS Notifications</span>
                <input
                  type="checkbox"
                  checked={settings.notifications.sms}
                  onChange={() => handleNotificationChange('sms')}
                  className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-gray-700">Push Notifications</span>
                <input
                  type="checkbox"
                  checked={settings.notifications.push}
                  onChange={() => handleNotificationChange('push')}
                  className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                />
              </label>
            </div>
          </div>

          {/* Alert Preferences */}
          <div className="card mb-6">
            <h2 className="text-xl font-semibold mb-4">Alert Preferences</h2>
            <div className="space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-gray-700">Irrigation Alerts</span>
                <input
                  type="checkbox"
                  checked={settings.alerts.irrigation}
                  onChange={() => handleAlertChange('irrigation')}
                  className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-gray-700">Pest/Disease Alerts</span>
                <input
                  type="checkbox"
                  checked={settings.alerts.pest}
                  onChange={() => handleAlertChange('pest')}
                  className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-gray-700">Weather Alerts</span>
                <input
                  type="checkbox"
                  checked={settings.alerts.weather}
                  onChange={() => handleAlertChange('weather')}
                  className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-gray-700">Nutrient Alerts</span>
                <input
                  type="checkbox"
                  checked={settings.alerts.nutrients}
                  onChange={() => handleAlertChange('nutrients')}
                  className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                />
              </label>
            </div>
          </div>

          {/* Language */}
          <div className="card mb-6">
            <h2 className="text-xl font-semibold mb-4">Language</h2>
            <div className="space-y-2">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="language"
                  value={LANGUAGES.ENGLISH}
                  checked={language === LANGUAGES.ENGLISH}
                  onChange={() => handleLanguageChange(LANGUAGES.ENGLISH)}
                  className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-gray-700">English</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="language"
                  value={LANGUAGES.TAMIL}
                  checked={language === LANGUAGES.TAMIL}
                  onChange={() => handleLanguageChange(LANGUAGES.TAMIL)}
                  className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-gray-700">தமிழ்</span>
              </label>
            </div>
          </div>

          {/* Theme */}
          <div className="card mb-6">
            <h2 className="text-xl font-semibold mb-4">Theme</h2>
            <div className="space-y-2">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="theme"
                  value={THEMES.LIGHT}
                  checked={settings.theme === THEMES.LIGHT}
                  onChange={() => handleThemeChange(THEMES.LIGHT)}
                  className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-gray-700">Light</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="theme"
                  value={THEMES.DARK}
                  checked={settings.theme === THEMES.DARK}
                  onChange={() => handleThemeChange(THEMES.DARK)}
                  className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-gray-700">Dark</span>
              </label>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button onClick={handleSave} className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SettingsPage;






