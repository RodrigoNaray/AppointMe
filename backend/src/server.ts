import express, { Express, Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import catalogRoutes from './modules/services/services.routes';
import authRoutes from './modules/auth/auth.routes';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import jwtStrategy from './config/passport';
import availabilityRouter from './modules/availability/availability.routes';
import { isAuthenticated } from './middlewares/isAuthenticated';


dotenv.config();

const app: Express = express();

const PORT: string | number = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173', 
  credentials: true, // Si necesitas enviar cookies o cabeceras de autorización
}));


app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use(cookieParser(process.env.JWT_SECRET));
app.use(passport.initialize());
passport.use(jwtStrategy);

//---  ROUTES ---//
app.use('/api/services', catalogRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin/availability', isAuthenticated, availabilityRouter);

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Algo salió mal en el servidor.' });
});

app.listen(PORT, () => {
  console.log(`[server]: 🚀 Servidor backend corriendo en http://localhost:${PORT}`);
});

export default app; 
