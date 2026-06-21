import { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [preferences, setPreferences] = useState({
    theme: 'dark',
    fontSize: 14,
    fontFamily: 'Fira Code, Courier New, monospace',
    tabSize: 4,
    lineNumbers: 'on',
    minimap: true,
    cursorStyle: 'line',
    wordWrap: 'off',
    autoSave: true,
    terminalFontSize: 12
  });
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('token');
      const savedGuest = localStorage.getItem('isGuest') === 'true';

      if (savedToken) {
        try {
          const res = await api.get('/auth/me');
          if (res.data.success) {
            setUser(res.data.user);
            if (res.data.preferences) {
              setPreferences(res.data.preferences);
            }
            setToken(savedToken);
          } else {
            handleLogout();
          }
        } catch (err) {
          console.error("Auth initialization failed:", err.message);
          handleLogout();
        }
      } else if (savedGuest) {
        setIsGuest(true);
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const handleLogin = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.success) {
      localStorage.setItem('token', res.data.token);
      localStorage.removeItem('isGuest');
      setToken(res.data.token);
      setIsGuest(false);
      
      // Load user profile & preferences immediately
      const meRes = await api.get('/auth/me');
      if (meRes.data.success) {
        setUser(meRes.data.user);
        if (meRes.data.preferences) {
          setPreferences(meRes.data.preferences);
        }
      }
    }
    return res.data;
  };

  const handleRegister = async (userId, name, email, password) => {
    const res = await api.post('/auth/register', { userId, name, email, password });
    return res.data;
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('isGuest');
    setToken(null);
    setUser(null);
    setIsGuest(false);
    setPreferences({
      theme: 'dark',
      fontSize: 14,
      fontFamily: 'Fira Code, Courier New, monospace',
      tabSize: 4,
      lineNumbers: 'on',
      minimap: true,
      cursorStyle: 'line',
      wordWrap: 'off',
      autoSave: true,
      terminalFontSize: 12
    });
  };

  const enterGuestMode = () => {
    localStorage.removeItem('token');
    localStorage.setItem('isGuest', 'true');
    setIsGuest(true);
    setToken(null);
    setUser({
      _id: 'guest',
      userId: 'guest_user',
      name: 'Guest Developer',
      email: 'guest@example.com',
      avatar: ''
    });
  };

  const updatePreferences = async (newPrefs) => {
    // Optimistic UI updates
    setPreferences(prev => ({ ...prev, ...newPrefs }));

    if (token && !isGuest) {
      try {
        await api.put('/auth/preferences', newPrefs);
      } catch (err) {
        console.error("Failed to sync preferences to backend:", err.message);
      }
    }
  };

  const updateProfile = async (profileData) => {
    if (token && !isGuest) {
      const res = await api.put('/auth/profile', profileData);
      if (res.data.success) {
        setUser(res.data.user);
      }
      return res.data;
    } else if (isGuest) {
      setUser(prev => ({ ...prev, ...profileData }));
      return { success: true, message: 'Guest profile updated locally' };
    }
  };

  const uploadAvatar = async (base64Image) => {
    if (token && !isGuest) {
      const res = await api.post('/auth/avatar', { image: base64Image });
      if (res.data.success) {
        setUser(res.data.user);
      }
      return res.data;
    } else if (isGuest) {
      setUser(prev => ({ ...prev, avatar: base64Image }));
      return { success: true, message: 'Guest avatar updated locally' };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      preferences,
      token,
      isGuest,
      loading,
      login: handleLogin,
      register: handleRegister,
      logout: handleLogout,
      enterGuest: enterGuestMode,
      updatePreferences,
      updateProfile,
      uploadAvatar
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
