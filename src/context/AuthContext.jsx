import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { farmerService } from '../services/farmerService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (storedUser && token) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        
        // Fetch fresh profile data from backend to ensure we have latest info (including profile picture)
        fetchUserProfile();
      } catch (e) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUserProfile = async () => {
    try {
      const profile = await farmerService.getProfile();
      // Update user with fresh profile data
      setUser(profile);
      localStorage.setItem('user', JSON.stringify(profile));
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      // If token is invalid, clear storage
      if (error.response?.status === 401) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setUser(null);
      }
      // Continue with stored user data if fetch fails
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      // Transform to backend format
      const backendData = {
        email_or_mobile: credentials.emailOrMobile,
        password: credentials.password,
      };
      
      const response = await authService.login(backendData);
      const tokenData = response.data;
      
      // Backend returns { access_token, token_type, user }
      const user = tokenData.user;
      setUser(user);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', tokenData.access_token);
      
      // Fetch fresh profile to get profile picture URL
      try {
        const profile = await farmerService.getProfile();
        setUser(profile);
        localStorage.setItem('user', JSON.stringify(profile));
      } catch (error) {
        console.error('Failed to fetch profile after login:', error);
        // Continue with user data from login response
      }
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || error.response?.data?.message || error.message || 'Login failed' 
      };
    }
  };

  const signup = async (userData) => {
    try {
      // Transform frontend field names to backend format
      const backendData = {
        name: userData.name,
        mobile: userData.mobile || null,
        email: userData.email || null,
        password: userData.password,
        location: userData.location,
        farming_type: userData.farmingType,
        preferred_language: userData.preferredLanguage,
      };
      
      const response = await authService.signup(backendData);
      const tokenData = response.data;
      
      // Backend returns { access_token, token_type, user }
      const user = tokenData.user;
      setUser(user);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', tokenData.access_token);
      return { success: true };
    } catch (error) {
      console.error('Signup error:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || error.response?.data?.message || error.message || 'Signup failed' 
      };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};





