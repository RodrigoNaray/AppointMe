import prisma from '../../config/prisma';
import bcrypt from 'bcrypt';
import { RegisterAdminDto, LoginAdminDto} from "./auth.types";
import logger from '../../utils/logger';
import { ConflictError } from "../../utils/error";


export const registerUser = async (userData: RegisterAdminDto) => {
  
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

export const validateUser = async (loginData: LoginAdminDto) => {

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