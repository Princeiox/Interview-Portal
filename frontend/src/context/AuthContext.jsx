import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

/**
 * Decodes a base64 encoded JWT access token signature payload.
 * Extracts the critical user session metadata: email, role, full name, and designation.
 * 
 * @param {string} accessToken - Signed JWT string from the backend server
 * @returns {object} Decoded user session profile properties
 */
function decodeToken(accessToken) {
  // Extract and parse the middle JSON payload section of the JWT
  const payload = JSON.parse(atob(accessToken.split('.')[1]));
  return { 
    email: payload.sub,       // User email identifier
    role: payload.role,       // System role (ADMIN, HR, INTERVIEWER)
    name: payload.name,       // User's display name
    position: payload.position // Interviewer's designation (e.g. Senior Tech Lead)
  };
}

export function AuthProvider({ children }) {
  // Global authenticated user profile session state
  const [user, setUser] = useState(null);
  
  // Persisted token reference loaded directly from the browser local storage
  const [token, setToken] = useState(localStorage.getItem('token'));
  
  // UI states for loading states and the universal logout modal popup
  const [loading, setLoading] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Automatically validate and decode the JWT session token when the page boots or token refreshes
  useEffect(() => {
    if (token) {
      try {
        // Decode the active token and mount the user metadata to Auth state
        setUser(decodeToken(token));
      } catch {
        // Automatically sign out if the token structure is corrupted or invalid
        logout();
      }
    }
  }, [token]);

  /**
   * Signs in the user using the email and password credentials.
   * Utilizes OAuth2 password grant form-encoded payload structure.
   */
  const login = async (email, password) => {
    // Pack the raw strings into URL-encoded form parameters required by FastAPI
    const form = new URLSearchParams();
    form.append('username', email);
    form.append('password', password);

    const res = await api.post('/auth/login', form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    
    // Store the signed JWT access token in the browser's local storage for persistence
    const accessToken = res.data.access_token;
    const nextUser = decodeToken(accessToken);
    localStorage.setItem('token', accessToken);
    setToken(accessToken);
    setUser(nextUser);
    return { ...res.data, user: nextUser };
  };

  /**
   * Registers a brand new HR Manager or Interviewer account in the database.
   */
  const signup = async (data) => {
    const res = await api.post('/auth/signup', data);
    return res.data;
  };

  /**
   * Universal sign-out routine. Cleans the memory state and persistent local storage keys.
   */
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  /**
   * Displays the universal modal warning prompt prior to logging out
   */
  const requestLogout = () => {
    setShowLogoutModal(true);
  };

  /**
   * Confirms the signout, clears active JWT variables, and hides the modal popup
   */
  const confirmLogout = () => {
    logout();
    setShowLogoutModal(false);
  };

  /**
   * Closes the logout prompt window without clearing session state variables
   */
  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  const value = useMemo(() => ({
    user, token, loading, login, signup, logout,
    isAuthenticated: !!token,
    showLogoutModal, requestLogout, confirmLogout, cancelLogout
  }), [user, token, loading, showLogoutModal]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
