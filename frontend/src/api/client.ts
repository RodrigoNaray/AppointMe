import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL, 
  withCredentials: true, // Activado para enviar las credenciales en cada peticion (Cookies)
});

export default apiClient;