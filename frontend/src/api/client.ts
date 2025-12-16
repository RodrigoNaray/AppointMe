import axios from 'axios'
import type { CreateAxiosDefaults } from 'axios';


const rawBaseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
export const API_BASE_URL = rawBaseURL.replace(/\/$/, '');


export const API_CONFIG: CreateAxiosDefaults = {
  baseURL: API_BASE_URL,
  withCredentials: true, // Crucial para cookies HttpOnly de sesión
  timeout: 10000, // 10 segundos
  headers: {
    'Content-Type': 'application/json',
  },
};

const apiClient = axios.create(API_CONFIG);

export default apiClient;