import axios from 'axios'
import { API_CONFIG } from './config';

const apiClient = axios.create(API_CONFIG);

export default apiClient;