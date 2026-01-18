import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { profileService } from '../../services/profileService';
import { reportService } from '../../services/reportService';
import { generateFullFarmerReport } from '../../utils/reportGenerator';
import api from '../../services/api';

const ProfileDropdown = () => {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [profilePicture, setProfilePicture] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const dropdownRef = useRef(null);

  // Default farmer image (using a placeholder - you can replace with actual image)
  const defaultFarmerImage = 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=100&h=100&fit=crop&crop=face&auto=format';

  useEffect(() => {
    // Fetch profile picture on mount
    fetchProfilePicture();

    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [user]);

  const fetchProfilePicture = async () => {
    if (!user) return;

    try {
      // Check if user has profile_picture_url in stored user data
      if (user.profile_picture_url) {
        // Use the profile picture URL from user data
        const baseURL = api.defaults.baseURL || 'http://localhost:8000';
        const pictureUrl = user.profile_picture_url.startsWith('http')
          ? user.profile_picture_url
          : `${baseURL}${user.profile_picture_url}`;
        setProfilePicture(`${pictureUrl}&t=${Date.now()}`);
      } else {
        // Try to fetch from API
        try {
          const baseURL = api.defaults.baseURL || 'http://localhost:8000';
          const pictureUrl = `${baseURL}/api/farmers/me/profile-picture?t=${Date.now()}`;
          // Test if image exists by creating an image element
          const img = new Image();
          img.onload = () => setProfilePicture(pictureUrl);
          img.onerror = () => setProfilePicture(null);
          img.src = pictureUrl;
        } catch (error) {
          setProfilePicture(null);
        }
      }
    } catch (error) {
      console.error('Error fetching profile picture:', error);
      setProfilePicture(null);
    }
  };

  const handleLogout = () => {
    logout();
    setIsOpen(false);
    navigate('/login');
  };

  const handleDownloadReport = async () => {
    try {
      setDownloadingReport(true);
      setIsOpen(false);
      
      const reportData = await reportService.fetchFullReportData();
      
      if (!reportData || !reportData.fields) {
        throw new Error('Failed to fetch report data');
      }
      
      await generateFullFarmerReport(reportData, user, t);
      alert(t('reportGenerated') || 'Report generated successfully!');
    } catch (error) {
      console.error('Failed to generate report:', error);
      alert(t('reportError') || 'Failed to generate report. Please try again.');
    } finally {
      setDownloadingReport(false);
    }
  };

  if (!user) return null;

  const displayImage = profilePicture || defaultFarmerImage;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-full"
        aria-label="Profile menu"
      >
        <img
          src={displayImage}
          alt={user.name || 'Farmer'}
          className="w-10 h-10 rounded-full object-cover border-2 border-primary-600 hover:border-primary-700 transition-colors"
          onError={(e) => {
            // Fallback to default image if profile picture fails to load
            e.target.src = defaultFarmerImage;
          }}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
          <div className="px-4 py-2 border-b border-gray-200">
            <p className="text-sm font-medium text-gray-900">{user.name || 'Farmer'}</p>
            <p className="text-xs text-gray-500 truncate">{user.location || ''}</p>
          </div>
          
          <Link
            to="/profile"
            onClick={() => setIsOpen(false)}
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
          >
            {t('profile')}
          </Link>
          
          <button
            onClick={handleDownloadReport}
            disabled={downloadingReport}
            className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloadingReport ? t('generatingReport') || 'Generating...' : t('downloadFullReport') || 'Download Full Report'}
          </button>
          
          <button
            onClick={handleLogout}
            className="w-full text-left block px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            {t('logout')}
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfileDropdown;

