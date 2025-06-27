import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import logger from '../src/utils/logger';

const prisma = new PrismaClient();

const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;

if (!adminEmail) {
  const errorMessage = 'ADMIN_EMAIL no está definido en las variables de entorno.';
  logger.error(errorMessage);
  throw new Error(errorMessage);
}

if (!adminPassword) {
  const errorMessage = 'ADMIN_PASSWORD no está definido en las variables de entorno.';
  logger.error(errorMessage);
  throw new Error(errorMessage);
} 

async function registerAdmin(email: string, password: string) {

  const existingAdmin = await prisma.adminUser.findUnique({
    where: { email: email },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.adminUser.create({
      data: {
        email: email,
        passwordHash: hashedPassword,
      },
    });
    console.log('Usuario administrador de seed creado.');
  } else {
    console.log('El usuario administrador de seed ya existe.');
  }
}

registerAdmin(adminEmail,adminPassword)
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });