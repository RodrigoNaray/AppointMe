import express, { Express, Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import catalogRoutes from './modules/catalog/catalog.routes';
import authRoutes from './modules/auth/auth.routes';
import passport from 'passport';
import jwtStrategy from './config/passport';

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
  origin: process.env.CLIENT_URL || 'http://localhost:5173', 
  // credentials: true, // Si necesitas enviar cookies o cabeceras de autorización
}));


app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use(passport.initialize());
passport.use(jwtStrategy);

app.get('/', (req: Request, res: Response) => {
  res.json({ message: '¡Bienvenido a la API de AppointMe!' });
});

app.use('/api/catalog', catalogRoutes);
app.use('/api/auth', authRoutes);
// Aquí montarás tus routers modulares más adelante:

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

app.listen(PORT, () => {
  console.log(`[server]: 🚀 Servidor backend corriendo en http://localhost:${PORT}`);
});

export default app; 
