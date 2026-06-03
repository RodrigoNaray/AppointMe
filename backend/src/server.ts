import express, { Express, Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import catalogRoutes from './modules/services/services.routes';
import authRoutes from './modules/auth/auth.routes';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import adminJwtStrategy from './config/passportAdmin'; 
import { clientJwtStrategy, googleStrategy } from './config/passportClient';
import availabilityRouter from './modules/availability/admin/availability.admin.routes';
import clientAuthRoutes from './modules/clientAuth/clientAuth.routes';
import healthRoutes from './modules/health/health.routes';
import bookingRoutes, { adminBookingRoutes } from './modules/booking/booking.routes';
import { isAdminAuthenticated } from './middlewares/isAdminAuthenticated';
import availabilityPublicRoutes from './modules/availability/public/availability.public.routes';
import categoryRoutes from './modules/category/category.routes';
import { settingsRoutes, adminSettingsRoutes } from './modules/settings/settings.routes';
import sitemapRoutes from './modules/sitemap/sitemap.routes';
import compression from "compression";
import helmet from "helmet";


dotenv.config();

const app: Express = express();

const PORT: string | number = process.env.PORT || 5000;

app.set('trust proxy', 1);


app.use(cors({
  origin: process.env.CLIENT_URL, 
  credentials: true, // Si necesitas enviar cookies o cabeceras de autorización
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
}));


app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);    
app.use(compression()); 

//-- COOKIE PARSER --//
app.use(cookieParser(process.env.JWT_SECRET));

//-- PASSPORT --//
app.use(passport.initialize());
passport.use('jwt-admin', adminJwtStrategy); 
passport.use('jwt-client', clientJwtStrategy);
passport.use('google', googleStrategy);

//---  ROUTES ---//
app.use('/api/admin/availability', isAdminAuthenticated, availabilityRouter);
app.use('/api/admin/bookings', isAdminAuthenticated, adminBookingRoutes);
app.use('/api/admin/settings', adminSettingsRoutes); // Ya incluye isAdminAuthenticated en routes
app.use('/api/availability', availabilityPublicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/auth/client', clientAuthRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/categories', categoryRoutes); // Rutas públicas y admin de categorías
app.use('/api/services', catalogRoutes);
app.use('/api/settings', settingsRoutes); // Rutas públicas de settings
app.use('/api/health', healthRoutes);
app.use('/', sitemapRoutes); // Sitemap en raíz (público)


app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Algo salió mal en el servidor.' });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[server]: 🚀 Servidor backend corriendo en http://localhost:${PORT}`);
  });
}

export default app; 
