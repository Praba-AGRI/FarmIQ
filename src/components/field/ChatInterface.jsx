import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { chatService } from '../../services/chatService';

const ChatInterface = ({ fieldId }) => {
  const { t } = useLanguage();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Only load chat history if fieldId is valid
    if (fieldId && fieldId !== 'NaN' && fieldId !== 'undefined') {
      loadChatHistory();
    }
  }, [fieldId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChatHistory = async () => {
    try {
      // Initialize with welcome message if no history exists
      try {
        const response = await chatService.getChatHistory(fieldId);
        if (response.data && response.data.length > 0) {
          setMessages(response.data);
        } else {
          // No history, show welcome message
          setMessages([
            {
              id: 1,
              type: 'ai',
              message: 'Hello! I am your AI Reasoning Assistant. Ask me why I made any recommendation.',
              timestamp: new Date().toISOString(),
            },
          ]);
        }
      } catch (historyError) {
        // If history endpoint doesn't exist or fails, show welcome message
        setMessages([
          {
            id: 1,
            type: 'ai',
            message: 'Hello! I am your AI Reasoning Assistant. Ask me why I made any recommendation.',
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
      // Show welcome message on error
      setMessages([
        {
          id: 1,
          type: 'ai',
          message: 'Hello! I am your AI Reasoning Assistant. Ask me why I made any recommendation.',
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || loading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      message: inputMessage,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setLoading(true);

    try {
      // Validate fieldId before making API call
      if (!fieldId || fieldId === 'NaN' || fieldId === 'undefined') {
        throw new Error('Invalid field ID. Please navigate from the dashboard.');
      }
      
      // Call actual API to get reasoning layer response
      const response = await chatService.sendMessage(fieldId, inputMessage);
      
      const aiResponse = {
        id: Date.now() + 1,
        type: 'ai',
        message: response.data.response || response.data.message || 'I apologize, but I could not generate a response. Please try again.',
        timestamp: response.data.timestamp || new Date().toISOString(),
      };
      
      setMessages((prev) => [...prev, aiResponse]);
    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Extract error message
      let errorMessage = 'Sorry, I encountered an error. Please try again.';
      
      if (error.response) {
        // Backend returned an error
        if (error.response.status === 404) {
          errorMessage = error.response.data?.detail || 'Field not found. Please ensure you are viewing a valid field.';
        } else if (error.response.status === 401) {
          errorMessage = 'Please log in to use the AI assistant.';
        } else if (error.response.data?.detail) {
          errorMessage = error.response.data.detail;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      const errorResponse = {
        id: Date.now() + 1,
        type: 'ai',
        message: errorMessage,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorResponse]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-primary-600 text-white p-4 rounded-t-lg">
        <h3 className="font-semibold">{t('aiReasoning')}</h3>
        <p className="text-sm text-primary-100 mt-1">
          Ask questions about AI recommendations and get explanations
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4" style={{ maxHeight: '500px' }}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] sm:max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                msg.type === 'user'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-800 border border-gray-200'
              }`}
            >
              <p className="text-sm">{msg.message}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 px-4 py-2 rounded-lg">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-3 sm:p-4 bg-white border-t border-gray-200">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={t('askQuestion')}
            className="flex-1 input-field text-sm sm:text-base"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !inputMessage.trim()}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base px-3 sm:px-6 whitespace-nowrap"
          >
            {t('send')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatInterface;






