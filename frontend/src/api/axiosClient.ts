import axios from 'axios';

const base = import.meta.env.BASE_URL || 'https://dose-api-dev.home-ratti.duckdns.org/';
const normalizedBase = base;

export const axiosClient = axios.create({
    baseURL: `${normalizedBase}api`,
    headers: {
        'Content-Type': 'application/json',
    },
});

axiosClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('dose_token');
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

axiosClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('dose_token');
            localStorage.removeItem('dose_user');
            if (!window.location.pathname.includes('/login')) {
                window.location.href = `${normalizedBase}login`;
            }
        }
        return Promise.reject(error);
    }
);