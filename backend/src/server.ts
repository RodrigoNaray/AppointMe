// Importar los módulos necesarios
import express, { Express, Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
// Importa aquí tus futuros routers
// import authRoutes from './modules/auth/auth.routes';
// import servicesRoutes from './modules/services/services.routes';
// import availabilityRoutes from './modules/availability/availability.routes';
// import bookingsRoutes from './modules/bookings/bookings.routes';

// Cargar variables de entorno desde el archivo .env
dotenv.config();

// Crear una instancia de la aplicación Express
const app: Express = express();

// Definir el puerto
// Lee el puerto desde las variables de entorno o usa 5000 por defecto
const PORT: string | number = process.env.PORT || 5000;

// Middlewares Esenciales
// Habilitar CORS (Cross-Origin Resource Sharing) para permitir peticiones desde el frontend
// Configura las opciones de CORS según tus necesidades (ej. origin específico)
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173', // Permite peticiones desde la URL del cliente
  // credentials: true, // Si necesitas enviar cookies o cabeceras de autorización
}));

// Parsear cuerpos de petición en formato JSON
app.use(express.json());
// Parsear cuerpos de petición codificados en URL (ej. de formularios HTML)
app.use(express.urlencoded({ extended: true }));

// Rutas de la API
// Ruta de prueba inicial
app.get('/api', (req: Request, res: Response) => {
  res.json({ message: '¡Bienvenido a la API de AppointMe!' });
});

// Aquí montarás tus routers modulares más adelante:
// app.use('/api/auth', authRoutes);
// app.use('/api/admin/services', servicesRoutes); // Asumiendo que son rutas de admin
// app.use('/api/availability', availabilityRoutes);
// app.use('/api/bookings', bookingsRoutes);


// Middleware para Manejo de Errores (Ejemplo Básico)
// Este es un manejador de errores muy simple, puedes expandirlo.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Algo salió mal en el servidor.' });
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
  // Aquí podrías añadir la conexión a la base de datos si no la manejas en otro lado
});

export default app; // Exportar la app puede ser útil para pruebas
