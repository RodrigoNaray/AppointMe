import prisma from '../../config/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import {
  RegisterClientDto,
  LoginClientDto,
  ClientJwtPayload,
  PublicClient,
} from './clientAuth.types';
import { ConflictError } from '../../utils/error';

/**
 * Registra un nuevo cliente en la base de datos.
 * @param data - Datos del cliente para el registro.
 * @returns El objeto del cliente público (sin contraseña).
 */
export const registerClient = async (data: RegisterClientDto): Promise<PublicClient> => {
  // 1. Verificar si el email ya está en uso
  const existingClient = await prisma.client.findUnique({
    where: { email: data.email },
  });

  if (existingClient) {
    throw new ConflictError('El correo electrónico ya está en uso.');
  }

  // 2. Hashear la contraseña si se proporcionó una
  let passwordHash: string | undefined = undefined;
  if (data.password) {
    passwordHash = await bcrypt.hash(data.password, 10);
  }

  // 3. Crear el nuevo cliente en la base de datos
  const newClient = await prisma.client.create({
    data: {
      email: data.email,
      name: data.name,
      phone: data.phone,
      passwordHash,
    },
  });

  // 4. Omitir el passwordHash antes de devolver el objeto
  const { passwordHash: _, ...publicClient } = newClient;
  return publicClient;
};

/**
 * Valida las credenciales de un cliente para el inicio de sesión.
 * @param data - Email y contraseña del cliente.
 * @returns El objeto del cliente público si las credenciales son válidas, de lo contrario null.
 */
export const validateClient = async (data: LoginClientDto): Promise<PublicClient | null> => {
  const client = await prisma.client.findUnique({
    where: { email: data.email },
  });

  if (!client || !client.passwordHash) {
    return null; // Usuario no encontrado o no tiene contraseña (se registró con Google)
  }

  const isPasswordValid = await bcrypt.compare(data.password, client.passwordHash);

  if (!isPasswordValid) {
    return null; // Contraseña incorrecta
  }

  const { passwordHash, ...publicClient } = client;
  return publicClient;
};

/**
 * Genera un token JWT para una sesión de cliente.
 * @param client - El objeto del cliente público autenticado.
 * @returns Un string con el token JWT.
 */
export const generateClientToken = (client: PublicClient): string => {
  const payload: ClientJwtPayload = {
    sub: client.id,
    email: client.email,
    name: client.name,
    role: 'client', // Asignamos el rol explícitamente
  };

  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET no está definida en las variables de entorno');
  }

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '7d', // Damos a los clientes una sesión más larga
  });

  return token;
};