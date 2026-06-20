import { AdminUser } from '@prisma/client';
import prisma from '../../config/prisma';
import bcrypt from 'bcryptjs';
import { RegisterAdminDto, LoginAdminDto, ChangePasswordDto} from "./auth.types";
import logger from '../../utils/logger';
import { ConflictError } from "../../utils/error";
import jwt from 'jsonwebtoken';
import { JwtPayload } from './auth.types';
import { JWT_SECRET, JWT_EXPIRATION } from '../../config/auth.config';

type userWithoutPassword = Omit<AdminUser, 'passwordHash'>;

export const generateToken = (user: userWithoutPassword) => {
  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
    role: 'admin'
  };

  if(!process.env.JWT_SECRET) {
    logger.error('JWT_SECRET no esta definida en las variables de entorno')
    throw new Error('JWT_SECRET no esta definida en las variables de entorno');

  };

  const token = jwt.sign(payload, JWT_SECRET, {expiresIn: JWT_EXPIRATION});

  return token;
}

export const registerUser = async (userData: RegisterAdminDto): Promise<userWithoutPassword> => {
  
  const existingUser = await prisma.adminUser.findUnique({
    where: {email: userData.email}
  });

  if (existingUser) {

    throw new ConflictError('El correo electrónico ya está en uso.')

  }

  const hashedPassword = await bcrypt.hash(userData.password, 10);

  const newUser = await prisma.adminUser.create({
    data: {
      email: userData.email,
      passwordHash: hashedPassword,
    }
  });

  const {passwordHash, ...userWithoutPassword } = newUser;

  return userWithoutPassword;
};

export const validateUser = async (loginData: LoginAdminDto): Promise<userWithoutPassword | null> => {

  const user = await prisma.adminUser.findUnique({
    where: {email: loginData.email},
  });

  if (!user || !user.passwordHash){
    logger.warn(
      { email: loginData.email },
      "Intento de login fallido: Usuario no encontrado o sin hash de contraseña"
    );
    return null
  };

  const isPasswordValid = await bcrypt.compare(
    loginData.password,
    user.passwordHash
  );

  if (!isPasswordValid) {
    logger.warn(
      { email: loginData.email },
      "Intento de login fallido: Contraseña incorrecta"
    );
    return null; 
  }

  const { passwordHash, ...userWithoutPassword } = user;
  return userWithoutPassword;

};

export const changeAdminPassword = async (adminId: string, data: ChangePasswordDto): Promise<void> => {
  const admin = await prisma.adminUser.findUnique({ where: { id: adminId } });
  if (!admin || !admin.passwordHash) {
    throw new Error('Administrador no encontrado');
  }

  const isCurrentPasswordValid = await bcrypt.compare(data.currentPassword, admin.passwordHash);
  if (!isCurrentPasswordValid) {
    throw new Error('Contraseña actual incorrecta');
  }

  const hashedPassword = await bcrypt.hash(data.newPassword, 10);
  await prisma.adminUser.update({
    where: { id: adminId },
    data: { passwordHash: hashedPassword },
  });

  logger.info({ adminId }, 'Admin password changed successfully');
};