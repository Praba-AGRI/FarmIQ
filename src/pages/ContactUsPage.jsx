import React, { useState } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';

const ContactUsPage = () => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Form submission will be handled later with backend
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: '', email: '', subject: '', message: '' });
    }, 3000);
  };

  // Social Media Icons
  const InstagramIcon = () => (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  );

  const LinkedInIcon = () => (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );

  const WhatsAppIcon = () => (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
  );

  const EmailIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );

  const LocationIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow bg-gray-50 py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Section */}
          <div className="text-center mb-8 sm:mb-12">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {t('contactUs')}
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {t('contactUsSubtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Contact Information Card */}
            <div className="lg:col-span-1">
              <div className="card shadow-xl border-2 border-primary-100 bg-gradient-to-br from-white to-primary-50 h-full">
                <div className="mb-6 pb-4 border-b-2 border-primary-200">
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center">
                    <span className="bg-primary-600 text-white p-2 rounded-lg mr-3">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </span>
                    {t('getInTouch')}
                  </h2>
                  <p className="text-sm text-gray-600 mt-2 ml-14">
                    {t('contactUsSubtitle')}
                  </p>
                </div>
                
                {/* Contact Details */}
                <div className="space-y-6">
                  {/* Email */}
                  <div className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-shadow border border-gray-100">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 p-3 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl text-white shadow-md">
                        <EmailIcon />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-gray-800 mb-2 uppercase tracking-wide">
                          {t('email')}
                        </h3>
                        <a 
                          href="mailto:sprabakaran7484@gmail.com" 
                          className="text-primary-600 hover:text-primary-800 font-semibold break-all transition-colors inline-block"
                        >
                          sprabakaran7484@gmail.com
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-shadow border border-gray-100">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 p-3 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl text-white shadow-md">
                        <LocationIcon />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wide">
                          {t('location')}
                        </h3>
                        <div className="text-gray-700 leading-relaxed space-y-1">
                          <p className="font-semibold text-gray-900">S. Prabakaran</p>
                          <p className="text-sm">KIT KalaignarKarunanidhi Institute Of Technology</p>
                          <p className="text-sm font-medium text-primary-700">Coimbatore</p>
                          <p className="text-sm mt-2 pt-2 border-t border-gray-200">
                            Department of Agricultural Engineering
                          </p>
                          <p className="text-sm font-semibold text-primary-700">
                            BTech Agricultural Engineering
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Social Media */}
                  <div className="pt-4 border-t-2 border-primary-200">
                    <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center">
                      <span className="bg-primary-100 p-1.5 rounded-lg mr-2">
                        <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      </span>
                      {t('connectWithUs')}
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      <a
                        href="https://www.linkedin.com/in/prabakaran-s-agri"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2 p-3 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 hover:shadow-md transition-all duration-200 border-2 border-blue-200 hover:border-blue-400"
                        aria-label="LinkedIn"
                      >
                        <LinkedInIcon />
                        <span className="text-sm font-semibold hidden sm:inline">LinkedIn</span>
                      </a>
                      <a
                        href="https://wa.me/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2 p-3 bg-green-50 text-green-700 rounded-xl hover:bg-green-100 hover:shadow-md transition-all duration-200 border-2 border-green-200 hover:border-green-400"
                        aria-label="WhatsApp"
                      >
                        <WhatsAppIcon />
                        <span className="text-sm font-semibold hidden sm:inline">WhatsApp</span>
                      </a>
                      <a
                        href="https://instagram.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2 p-3 bg-pink-50 text-pink-700 rounded-xl hover:bg-pink-100 hover:shadow-md transition-all duration-200 border-2 border-pink-200 hover:border-pink-400"
                        aria-label="Instagram"
                      >
                        <InstagramIcon />
                        <span className="text-sm font-semibold hidden sm:inline">Instagram</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form Card */}
            <div className="lg:col-span-2">
              <div className="card shadow-xl border-2 border-primary-100 bg-gradient-to-br from-white to-primary-50">
                <div className="mb-6 pb-4 border-b-2 border-primary-200">
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center">
                    <span className="bg-primary-600 text-white p-2 rounded-lg mr-3">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                    </span>
                    {t('sendMessage')}
                  </h2>
                  <p className="text-sm text-gray-600 mt-2 ml-14">
                    Fill out the form below and we'll get back to you as soon as possible.
                  </p>
                </div>
                
                {submitted ? (
                  <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300 rounded-xl p-8 text-center shadow-lg">
                    <div className="bg-green-500 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center shadow-md">
                      <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-xl font-bold text-green-900 mb-2">
                      {t('messageSent')}
                    </p>
                    <p className="text-sm text-green-800 mt-2">
                      {t('messageSentNote')}
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                      <label htmlFor="name" className="block text-sm font-bold text-gray-800 mb-2 uppercase tracking-wide">
                        {t('name')} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all bg-gray-50 focus:bg-white"
                        placeholder={t('yourName')}
                      />
                    </div>

                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                      <label htmlFor="email" className="block text-sm font-bold text-gray-800 mb-2 uppercase tracking-wide">
                        {t('email')} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all bg-gray-50 focus:bg-white"
                        placeholder={t('yourEmail')}
                      />
                    </div>

                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                      <label htmlFor="subject" className="block text-sm font-bold text-gray-800 mb-2 uppercase tracking-wide">
                        {t('subject')} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="subject"
                        name="subject"
                        required
                        value={formData.subject}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all bg-gray-50 focus:bg-white"
                        placeholder={t('messageSubject')}
                      />
                    </div>

                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                      <label htmlFor="message" className="block text-sm font-bold text-gray-800 mb-2 uppercase tracking-wide">
                        {t('message')} <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        required
                        rows={6}
                        value={formData.message}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all resize-none bg-gray-50 focus:bg-white"
                        placeholder={t('yourMessage')}
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white py-4 rounded-xl font-bold text-lg hover:from-primary-700 hover:to-primary-800 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 flex items-center justify-center space-x-2"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      <span>{t('sendMessage')}</span>
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>

          {/* Privacy Note */}
          <div className="mt-8 bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
            <div className="flex items-start space-x-3">
              <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <div>
                <h3 className="text-lg font-semibold text-blue-900 mb-2">
                  {t('privacyNote')}
                </h3>
                <p className="text-base text-blue-800 leading-relaxed">
                  {t('privacyNoteDescription')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ContactUsPage;
