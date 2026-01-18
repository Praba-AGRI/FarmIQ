import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { advisoryService } from '../services/advisoryService';
import { fieldService } from '../services/fieldService';
import { reportService } from '../services/reportService';
import { generateAdvisoriesReport } from '../utils/reportGenerator';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';

const AdvisoryHistoryPage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [advisories, setAdvisories] = useState([]);
  const [fields, setFields] = useState([]);
  const [selectedField, setSelectedField] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generatingReport, setGeneratingReport] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchData();
  }, [user, navigate, selectedField, dateRange]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      // Mock data for demonstration
      setFields([
        { id: 1, name: 'Field 1' },
        { id: 2, name: 'Field 2' },
      ]);
      setAdvisories([
        {
          id: 1,
          fieldId: 1,
          fieldName: 'Field 1',
          date: '2024-01-15',
          recommendations: [
            { type: 'irrigation', status: 'do_now', message: 'Irrigate with 2 inches of water' },
            { type: 'nutrients', status: 'wait', message: 'Apply nitrogen fertilizer after 2 days' },
          ],
        },
        {
          id: 2,
          fieldId: 1,
          fieldName: 'Field 1',
          date: '2024-01-10',
          recommendations: [
            { type: 'irrigation', status: 'monitor', message: 'Monitor soil moisture levels' },
          ],
        },
        {
          id: 3,
          fieldId: 2,
          fieldName: 'Field 2',
          date: '2024-01-12',
          recommendations: [
            { type: 'pest', status: 'do_now', message: 'Apply pest control measures' },
          ],
        },
      ]);
      // const [fieldsRes, advisoriesRes] = await Promise.all([
      //   fieldService.getAllFields(),
      //   advisoryService.getAdvisoryHistory({ fieldId: selectedField, dateRange }),
      // ]);
      // setFields(fieldsRes.data);
      // setAdvisories(advisoriesRes.data);
    } catch (err) {
      setError('Failed to load advisory history');
    } finally {
      setLoading(false);
    }
  };

  const filteredAdvisories = advisories.filter((advisory) => {
    if (selectedField !== 'all' && advisory.fieldId !== parseInt(selectedField)) {
      return false;
    }
    // Date filtering logic would go here
    return true;
  });

  const handleDownloadAdvisoriesReport = async () => {
    try {
      setGeneratingReport(true);
      setError('');
      
      const advisoriesData = await reportService.fetchAdvisoriesData(
        selectedField !== 'all' ? selectedField : null
      );
      await generateAdvisoriesReport(advisoriesData, t);
      alert(t('reportGenerated'));
    } catch (err) {
      setError(t('reportError'));
      console.error('Failed to generate advisories report:', err);
    } finally {
      setGeneratingReport(false);
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">{t('advisoryHistory')}</h1>
            <button
              onClick={handleDownloadAdvisoriesReport}
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
                  {t('downloadAdvisoriesReport')}
                </>
              )}
            </button>
          </div>

          {/* Filters */}
          <div className="card mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('filterByField')}
                </label>
                <select
                  value={selectedField}
                  onChange={(e) => setSelectedField(e.target.value)}
                  className="input-field"
                >
                  <option value="all">All Fields</option>
                  {fields.map((field) => (
                    <option key={field.id} value={field.id}>
                      {field.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('filterByDate')}
                </label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="input-field"
                >
                  <option value="all">All Time</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="90d">Last 90 Days</option>
                </select>
              </div>
            </div>
          </div>

          {error && <ErrorMessage message={error} onRetry={fetchData} />}

          {/* Timeline */}
          <div className="space-y-6">
            {filteredAdvisories.length === 0 ? (
              <div className="card text-center py-12">
                <p className="text-gray-600">No advisories found</p>
              </div>
            ) : (
              filteredAdvisories.map((advisory) => (
                <div key={advisory.id} className="card">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{advisory.fieldName}</h3>
                      <p className="text-sm text-gray-600">{advisory.date}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {advisory.recommendations.map((rec, index) => (
                      <div
                        key={index}
                        className="bg-gray-50 p-3 rounded border-l-4 border-primary-500"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium capitalize">{rec.type}</p>
                            <p className="text-sm text-gray-600 mt-1">{rec.message}</p>
                          </div>
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${
                              rec.status === 'do_now'
                                ? 'bg-red-100 text-red-800'
                                : rec.status === 'wait'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {rec.status === 'do_now' ? t('doNow') : rec.status === 'wait' ? t('wait') : t('monitor')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdvisoryHistoryPage;






