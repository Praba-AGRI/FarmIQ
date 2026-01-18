import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { fieldService } from '../services/fieldService';
import { reportService } from '../services/reportService';
import { profileService } from '../services/profileService';
import { generateFullFarmerReport } from '../utils/reportGenerator';
import ProfilePictureUpload from '../components/common/ProfilePictureUpload';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { FARMING_TYPES, LANGUAGES } from '../utils/constants';

const ProfilePage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [fields, setFields] = useState([]);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    location: '',
    farmingType: FARMING_TYPES.ORGANIC,
    preferredLanguage: LANGUAGES.ENGLISH,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [profilePicture, setProfilePicture] = useState(null);
  const [uploadingPicture, setUploadingPicture] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      // Mock data
      setFormData({
        name: user?.name || 'Farmer Name',
        mobile: user?.mobile || '9876543210',
        location: user?.location || 'Tamil Nadu, India',
        farmingType: user?.farmingType || FARMING_TYPES.ORGANIC,
        preferredLanguage: user?.preferredLanguage || LANGUAGES.ENGLISH,
      });
      setFields([
        { id: 1, name: 'Field 1', cropName: 'Rice' },
        { id: 2, name: 'Field 2', cropName: 'Cotton' },
      ]);
      // const response = await fieldService.getAllFields();
      // setFields(response.data);
      
      // Load profile picture
      // const pictureUrl = profileService.getProfilePicture(user?.user_id);
      // setProfilePicture(pictureUrl);
    } catch (err) {
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      // API call to update profile
      // await authService.updateProfile(formData);
      setEditing(false);
      alert('Profile updated successfully');
    } catch (err) {
      setError('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadFullReport = async () => {
    try {
      setGeneratingReport(true);
      setError('');
      
      const reportData = await reportService.fetchFullReportData();
      
      if (!reportData || !reportData.fields) {
        throw new Error('Failed to fetch report data');
      }
      
      const dateWiseData = reportService.aggregateDataByDate(
        reportData.fields,
        reportData.advisories || []
      );
      
      const farmerData = {
        name: formData.name || 'Farmer',
        location: formData.location || 'Unknown',
        farmingType: formData.farmingType || 'Unknown',
      };
      
      await generateFullFarmerReport(
        farmerData,
        { ...reportData, dateWiseData },
        t
      );
      
      alert(t('reportGenerated'));
    } catch (err) {
      const errorMessage = err.message || t('reportError');
      setError(errorMessage);
      console.error('Failed to generate report:', err);
    } finally {
      setGeneratingReport(false);
    }
  };

  const handlePictureUpload = async (file) => {
    try {
      setUploadingPicture(true);
      setError('');
      
      // Mock implementation - in production, use actual API call
      // const response = await profileService.uploadProfilePicture(file);
      // setProfilePicture(response.data.profile_picture_url);
      
      // For now, create a local preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicture(reader.result);
      };
      reader.readAsDataURL(file);
      
      alert(t('pictureUploaded'));
    } catch (err) {
      setError(t('pictureUploadError'));
      console.error('Failed to upload profile picture:', err);
    } finally {
      setUploadingPicture(false);
    }
  };

  const handlePictureRemove = async () => {
    try {
      setUploadingPicture(true);
      setError('');
      
      // Mock implementation - in production, use actual API call
      // await profileService.removeProfilePicture();
      
      setProfilePicture(null);
      alert(t('pictureRemoved'));
    } catch (err) {
      setError(t('pictureUploadError'));
      console.error('Failed to remove profile picture:', err);
    } finally {
      setUploadingPicture(false);
    }
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
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">{t('profile')}</h1>
            <button
              onClick={handleDownloadFullReport}
              disabled={generatingReport}
              className="btn-primary flex items-center gap-2"
            >
              {generatingReport ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {t('generatingReport')}
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {t('downloadFullReport')}
                </>
              )}
            </button>
          </div>

          {error && <ErrorMessage message={error} />}

          {/* Personal Details */}
          <div className="card mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{t('personalDetails')}</h2>
              {!editing && (
                <button onClick={() => setEditing(true)} className="btn-secondary text-sm">
                  {t('edit')}
                </button>
              )}
            </div>

            {/* Profile Picture */}
            <div className="mb-6 pb-6 border-b">
              <h3 className="text-sm font-medium text-gray-700 mb-4">{t('profilePicture')}</h3>
              <ProfilePictureUpload
                currentPicture={profilePicture}
                onUpload={handlePictureUpload}
                onRemove={handlePictureRemove}
                loading={uploadingPicture}
              />
            </div>

            {editing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('name')}
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('mobile')}
                  </label>
                  <input
                    type="tel"
                    name="mobile"
                    value={formData.mobile}
                    onChange={handleChange}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('location')}
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('farmingType')}
                  </label>
                  <select
                    name="farmingType"
                    value={formData.farmingType}
                    onChange={handleChange}
                    className="input-field"
                  >
                    <option value={FARMING_TYPES.ORGANIC}>{t('organic')}</option>
                    <option value={FARMING_TYPES.CONVENTIONAL}>{t('conventional')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('preferredLanguage')}
                  </label>
                  <select
                    name="preferredLanguage"
                    value={formData.preferredLanguage}
                    onChange={handleChange}
                    className="input-field"
                  >
                    <option value={LANGUAGES.ENGLISH}>English</option>
                    <option value={LANGUAGES.TAMIL}>தமிழ்</option>
                  </select>
                </div>
                <div className="flex space-x-4">
                  <button onClick={handleSave} className="btn-primary" disabled={saving}>
                    {saving ? t('loading') : t('save')}
                  </button>
                  <button
                    onClick={() => {
                      setEditing(false);
                      fetchData();
                    }}
                    className="btn-secondary"
                  >
                    {t('cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">{t('name')}</p>
                  <p className="font-medium">{formData.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">{t('mobile')}</p>
                  <p className="font-medium">{formData.mobile}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">{t('location')}</p>
                  <p className="font-medium">{formData.location}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">{t('farmingType')}</p>
                  <p className="font-medium capitalize">{formData.farmingType}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">{t('preferredLanguage')}</p>
                  <p className="font-medium">
                    {formData.preferredLanguage === LANGUAGES.ENGLISH ? 'English' : 'தமிழ்'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Fields List */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">{t('myFields')}</h2>
            {fields.length === 0 ? (
              <p className="text-gray-600">{t('noFields')}</p>
            ) : (
              <div className="space-y-2">
                {fields.map((field) => (
                  <div
                    key={field.id}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer"
                    onClick={() => navigate(`/field/${field.id}`)}
                  >
                    <div>
                      <p className="font-medium">{field.name}</p>
                      <p className="text-sm text-gray-600">{field.cropName}</p>
                    </div>
                    <svg
                      className="w-5 h-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ProfilePage;






