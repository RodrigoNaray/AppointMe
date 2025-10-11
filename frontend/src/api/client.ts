import axios from 'axios';
import { API_CONFIG } from './config';

/**
 * Cliente HTTP genérico para llamadas API
 * 
 * Uso: servicios generales, bookings, availability, etc.
 * Para autenticación de clientes, usar clientAuthService desde clientAuth.ts
 * 
 * Configuración: importada desde config.ts para mantener consistencia
 */
const apiClient = axios.create(API_CONFIG);

export default apiClient;