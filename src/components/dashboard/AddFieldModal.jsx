import React, { useState } from 'react';
import { useLanguage } from '../../hooks/useLanguage';

const AddFieldModal = ({ isOpen, onClose, onSubmit, loading }) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: '',
    crop: '',
    sowing_date: '',
    area_acres: '',
    sensor_node_id: '',
    location: '',
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    // Clear error when user types
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: '',
      });
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = t('required');
    }
    if (!formData.crop.trim()) {
      newErrors.crop = t('required');
    }
    if (!formData.sowing_date) {
      newErrors.sowing_date = t('required');
    } else {
      // Validate date format YYYY-MM-DD
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(formData.sowing_date)) {
        newErrors.sowing_date = t('invalidDate');
      }
    }
    if (!formData.area_acres || parseFloat(formData.area_acres) <= 0) {
      newErrors.area_acres = t('invalidArea');
    }
    if (!formData.sensor_node_id.trim()) {
      newErrors.sensor_node_id = t('required');
    }
    if (!formData.location.trim()) {
      newErrors.location = t('required');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({
        ...formData,
        area_acres: parseFloat(formData.area_acres),
      });
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      crop: '',
      sowing_date: '',
      area_acres: '',
      sensor_node_id: '',
      location: '',
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">{t('addNewField')}</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
              disabled={loading}
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                {t('fieldName')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder={t('fieldName')}
                disabled={loading}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="crop" className="block text-sm font-medium text-gray-700 mb-1">
                {t('cropName')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="crop"
                name="crop"
                value={formData.crop}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors.crop ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder={t('cropName')}
                disabled={loading}
              />
              {errors.crop && <p className="text-xs text-red-500 mt-1">{errors.crop}</p>}
            </div>

            <div>
              <label htmlFor="sowing_date" className="block text-sm font-medium text-gray-700 mb-1">
                {t('sowingDate')} <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="sowing_date"
                name="sowing_date"
                value={formData.sowing_date}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors.sowing_date ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={loading}
              />
              {errors.sowing_date && <p className="text-xs text-red-500 mt-1">{errors.sowing_date}</p>}
            </div>

            <div>
              <label htmlFor="area_acres" className="block text-sm font-medium text-gray-700 mb-1">
                {t('areaAcres')} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="area_acres"
                name="area_acres"
                value={formData.area_acres}
                onChange={handleChange}
                min="0.01"
                step="0.01"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors.area_acres ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0.00"
                disabled={loading}
              />
              {errors.area_acres && <p className="text-xs text-red-500 mt-1">{errors.area_acres}</p>}
            </div>

            <div>
              <label htmlFor="sensor_node_id" className="block text-sm font-medium text-gray-700 mb-1">
                {t('sensorNodeId')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="sensor_node_id"
                name="sensor_node_id"
                value={formData.sensor_node_id}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors.sensor_node_id ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder={t('sensorNodeId')}
                disabled={loading}
              />
              {errors.sensor_node_id && <p className="text-xs text-red-500 mt-1">{errors.sensor_node_id}</p>}
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                {t('location')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors.location ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder={t('location')}
                disabled={loading}
              />
              {errors.location && <p className="text-xs text-red-500 mt-1">{errors.location}</p>}
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                disabled={loading}
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? t('loading') : t('save')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddFieldModal;

