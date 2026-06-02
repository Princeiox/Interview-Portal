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
            error.message = 'Unable to connect to the server. Please check your internet connection.';
        }
        
        return Promise.reject(error);
    }
);

export const API_BASE = API;
export default api;
