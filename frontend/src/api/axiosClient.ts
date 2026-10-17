import axios from 'axios';

const base = import.meta.env.BASE_URL || '/';
const normalizedBase = base.endsWith('/') ? base : `${base}/`;

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
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);