import express, { Express, Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import catalogRoutes from './modules/services/services.routes';
import authRoutes from './modules/auth/auth.routes';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import adminJwtStrategy from './config/passportAdmin'; 
import { clientJwtStrategy } from './config/passportClient';
import availabilityRouter from './modules/availability/availability.admin.routes';
import clientAuthRoutes from './modules/clientAuth/clientAuth.routes';
import { isAdminAuthenticated } from './middlewares/isAdminAuthenticated';
import availabilityPublicRoutes from './modules/availability/availability.public.routes';


dotenv.config();

const app: Express = express();

const PORT: string | number = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173', 
  credentials: true, // Si necesitas enviar cookies o cabeceras de autorización
}));


app.use(express.json());

app.use(express.urlencoded({ extended: true }));

//-- COOKIE PARSER --//
app.use(cookieParser(process.env.JWT_SECRET));

//-- PASSPORT --//
app.use(passport.initialize());
passport.use('jwt-admin', adminJwtStrategy); 
passport.use('jwt-client', clientJwtStrategy);

//---  ROUTES ---//
app.use('/api/admin/availability', isAdminAuthenticated, availabilityRouter);
app.use('/api/availability', availabilityPublicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/auth/client', clientAuthRoutes);
app.use('/api/services', catalogRoutes);


app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Algo salió mal en el servidor.' });
});

app.listen(PORT, () => {
  console.log(`[server]: 🚀 Servidor backend corriendo en http://localhost:${PORT}`);
});

export default app; 
