/**
 * Axios API Configuration
 * 
 * Sets up the base Axios instance for all HTTP requests to the backend.
 * Includes request interceptors for attaching JWT auth tokens and 
 * response interceptors for handling 401 Unauthorized errors and network failures globally.
 */
import axios from 'axios';

const API = import.meta.env.VITE_API_URL ?? "";

const api = axios.create({
    baseURL: API ? `${API}/api/v1` : '/api/v1',
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => {
        if (typeof response.data === 'string' && response.data.trim().startsWith('<')) {
            return Promise.reject(new Error('Server is unreachable (Received HTML)'));
        }
        return response;
    },
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            if (window.location.pathname !== '/login') {
                window.location.replace('/login');
            }
        }
        
        if (!error.response || error.code === 'ERR_NETWORK') {
            error.isNetworkError = true;
            if (typeof window !== 'undefined' && !window.navigator.onLine) {
                error.message = 'You are offline. Please check your internet connection.';
            } else {
                error.message = 'Server is offline or unreachable. Please try again later.';
            }
        } else if (error.response?.data?.detail) {
            const detail = error.response.data.detail;
            if (typeof detail === 'string') {
                error.message = detail;
            } else if (Array.isArray(detail)) {
                error.message = detail.map(d => {
                    const field = d.loc[d.loc.length - 1];
                    const msg = d.msg;
                    const niceField = typeof field === 'string' 
                        ? field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) 
                        : field;
                    return `${niceField}: ${msg}`;
                }).join(', ');
            }
        } else if (error.response?.data?.message) {
            error.message = error.response.data.message;
        } else if (error.response?.statusText) {
            error.message = `Server Error: ${error.response.statusText} (${error.response.status})`;
        }
        
        return Promise.reject(error);
    }
);

export const API_BASE = API;
export default api;
