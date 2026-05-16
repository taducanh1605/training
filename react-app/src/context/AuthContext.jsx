import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getTrainingExercises, getUserProfile, logout as logoutFn } from '../services/api.js';
import { STORAGE_KEYS, getItem, setItem, removeItem } from '../services/storage.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getItem(STORAGE_KEYS.TOKEN));
  const [user_name, setUserName] = useState(() => getItem(STORAGE_KEYS.USER_NAME));
  const [user_email, setUserEmail] = useState(() => getItem(STORAGE_KEYS.USER_EMAIL));
  const [mentor_code, setMentorCode] = useState(() => getItem(STORAGE_KEYS.MENTOR_CODE));
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [profileData, setProfileData] = useState(null);

  const login = useCallback((newToken) => {
    setToken(newToken);
    setItem(STORAGE_KEYS.TOKEN, newToken);
  }, []);

  const handleLogout = useCallback(() => {
    logoutFn();
    setToken(null);
    setUserName(null);
    setUserEmail(null);
    setMentorCode(null);
    setIsLoggedIn(false);
    setNeedsProfile(false);
  }, []);

  const checkLogin = useCallback(async (setWorkoutData) => {
    // Skip API call entirely when there is no token to avoid unnecessary 401 errors.
    // This mirrors the Vue.js behaviour where checkLoginAndFetchToken() exits early
    // when localStorage.token is absent.
    if (!getItem(STORAGE_KEYS.TOKEN)) return;

    try {
      const response = await getTrainingExercises();
      const data = response.data;
      const user = data?.user;
      const exercises = data?.exercises;

      if (response && user) {
        if (response.needsRegistration) {
          alert('You have a valid account, but you need to complete registration in the Training App first.');
          removeItem(STORAGE_KEYS.TOKEN);
          removeItem(STORAGE_KEYS.USER_NAME);
          removeItem(STORAGE_KEYS.USER_EMAIL);
          removeItem(STORAGE_KEYS.MENTOR_CODE);
          setToken(null);
          setIsLoggedIn(false);
          return;
        }

        setItem(STORAGE_KEYS.USER_NAME, user.name || '');
        setItem(STORAGE_KEYS.USER_EMAIL, user.email || '');
        setItem(STORAGE_KEYS.MENTOR_CODE, user.mentor_id || '');
        setUserName(user.name);
        setUserEmail(user.email);
        setMentorCode(user.mentor_id || null);
        setIsLoggedIn(true);

        try {
          const profileResult = await getUserProfile();
          const profile = profileResult.profile;
          const metric = profileResult.metrics;
          if (!metric || !profile || !profile.gender || !metric.weight || !metric.height || !profile.birthdate) {
            setNeedsProfile(true);
          } else {
            setNeedsProfile(false);
            setProfileData({ profile, metric });
          }
        } catch (e) {
          setNeedsProfile(false);
        }
      } else {
        removeItem(STORAGE_KEYS.USER_NAME);
        removeItem(STORAGE_KEYS.USER_EMAIL);
        removeItem(STORAGE_KEYS.MENTOR_CODE);
        setUserName(null);
        setUserEmail(null);
        setMentorCode(null);
        setIsLoggedIn(false);
        setNeedsProfile(false);
      }

      if (exercises) {
        setWorkoutData && setWorkoutData(exercises);
      }
    } catch (error) {
      console.log('Login check failed:', error);
      removeItem(STORAGE_KEYS.USER_NAME);
      removeItem(STORAGE_KEYS.USER_EMAIL);
      if (getItem(STORAGE_KEYS.SELECTED_LVL)?.[0] === 'p') {
        removeItem(STORAGE_KEYS.SELECTED_LVL);
      }
      if (getItem(STORAGE_KEYS.RESUME)?.[0] === 'p') {
        removeItem(STORAGE_KEYS.RESUME);
      }
      setItem(STORAGE_KEYS.TEXT_MODE, 'free');
      setIsLoggedIn(false);
      setNeedsProfile(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      token,
      user_name,
      user_email,
      mentor_code,
      isLoggedIn,
      needsProfile,
      profileData,
      login,
      handleLogout,
      checkLogin,
      setNeedsProfile,
      setProfileData
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
