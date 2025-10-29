import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';


const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Empezando el proceso de siembra...');

  if(!process.env.ADMIN_PASSWORD) {
    throw new Error('ADMIN_PASSWORD no esta definida en las variables de entorno');
  };

  if(!process.env.ADMIN_EMAIL) {
    throw new Error('ADMIN_EMAIL no esta definida en las variables de entorno');
  };
  // --- 1. Crear Administrador ---
  const adminPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || '', 10);
  const admin = await prisma.adminUser.upsert({
    where: { email: process.env.ADMIN_EMAIL || '' },
    update: {},
    create: {
      email: process.env.ADMIN_EMAIL || '',
      passwordHash: adminPassword,
      // IMPORTANTE: Horarios almacenados en UTC
      // Configuración original en hora local Argentina (UTC-3):
      // Lunes-Martes-Jueves: 09:00-18:00 local → 12:00-21:00 UTC
      // Miércoles: 09:00-13:00 local → 12:00-16:00 UTC
      // Viernes: 09:00-17:00 local → 12:00-20:00 UTC
      // Sábado: 10:00-14:00 local → 13:00-17:00 UTC (inactivo)
      schedule: {
        monday: { start: '12:00', end: '21:00', isActive: true },
        tuesday: { start: '12:00', end: '21:00', isActive: true },
        wednesday: { start: '12:00', end: '16:00', isActive: true },
        thursday: { start: '12:00', end: '21:00', isActive: true },
        friday: { start: '12:00', end: '20:00', isActive: true },
        saturday: { start: '13:00', end: '17:00', isActive: false },
        sunday: { start: '12:00', end: '21:00', isActive: false },
      },
    },
  });
  console.log(`👤 Administrador creado/actualizado: ${admin.email}`);

  // --- 2. Crear Clientes ---
  const clientPassword1 = await bcrypt.hash('clientpass1', 10);
  const client1 = await prisma.client.upsert({
    where: { email: 'ana.garcia@example.com' },
    update: {},
    create: {
      email: 'ana.garcia@example.com',
      name: 'Ana García',
      phone: '099123456',
      passwordHash: clientPassword1,
    },
  });

  const clientPassword2 = await bcrypt.hash('clientpass2', 10);
  const client2 = await prisma.client.upsert({
    where: { email: 'carlos.rodriguez@example.com' },
    update: {},
    create: {
      email: 'carlos.rodriguez@example.com',
      name: 'Carlos Rodríguez',
      phone: '098765432',
      passwordHash: clientPassword2,
    },
  });
  console.log(`👥 Clientes creados/actualizados: ${client1.email}, ${client2.email}`);

  // --- 3. Crear Categorías (globales para toda la plataforma) ---
  const categoryCortes = await prisma.category.upsert({
    where: { name: 'Cortes' },
    update: {},
    create: {
      name: 'Cortes',
      description: 'Servicios de corte de cabello y peinado',
    },
  });

  const categoryColoracion = await prisma.category.upsert({
    where: { name: 'Coloración' },
    update: {},
    create: {
      name: 'Coloración',
      description: 'Servicios de tinturas y mechas',
    },
  });

  const categoryBarba = await prisma.category.upsert({
    where: { name: 'Barba' },
    update: {},
    create: {
      name: 'Barba',
      description: 'Servicios de arreglo y cuidado de barba',
    },
  });

  const categoryMaquillaje = await prisma.category.upsert({
    where: { name: 'Maquillaje' },
    update: {},
    create: {
      name: 'Maquillaje',
      description: 'Servicios de maquillaje profesional',
    },
  });

  console.log(`📁 Categorías globales creadas/actualizadas: Cortes, Coloración, Barba, Maquillaje`);

  // --- 4. Crear Servicios (asociados al admin y categorías) ---
  const service1 = await prisma.service.upsert({
    where: { name: 'Corte y Peinado' },
    update: { categoryId: categoryCortes.id },
    create: {
      name: 'Corte y Peinado',
      description: 'Corte de cabello personalizado seguido de un peinado profesional.',
      durationMinutes: 60,
      price: 1500,
      adminId: admin.id,
      categoryId: categoryCortes.id,
    },
  });

  const service2 = await prisma.service.upsert({
    where: { name: 'Maquillaje Social de Noche' },
    update: { categoryId: categoryMaquillaje.id },
    create: {
      name: 'Maquillaje Social de Noche',
      description: 'Maquillaje completo para eventos nocturnos.',
      durationMinutes: 90,
      price: 2200,
      adminId: admin.id,
      categoryId: categoryMaquillaje.id,
    },
  });

  // Servicios adicionales para tener más variedad
  await prisma.service.upsert({
    where: { name: 'Arreglo de Barba' },
    update: { categoryId: categoryBarba.id },
    create: {
      name: 'Arreglo de Barba',
      description: 'Recorte y perfilado de barba con máquina y navaja.',
      durationMinutes: 30,
      price: 800,
      adminId: admin.id,
      categoryId: categoryBarba.id,
    },
  });

  await prisma.service.upsert({
    where: { name: 'Tinte Completo' },
    update: { categoryId: categoryColoracion.id },
    create: {
      name: 'Tinte Completo',
      description: 'Coloración completa del cabello con productos premium.',
      durationMinutes: 120,
      price: 3500,
      adminId: admin.id,
      categoryId: categoryColoracion.id,
    },
  });

  await prisma.service.upsert({
    where: { name: 'Mechas Californianas' },
    update: { categoryId: categoryColoracion.id },
    create: {
      name: 'Mechas Californianas',
      description: 'Mechas degradadas con efecto natural.',
      durationMinutes: 150,
      price: 4000,
      adminId: admin.id,
      categoryId: categoryColoracion.id,
    },
  });

  console.log(`💄 Servicios creados/actualizados con categorías asignadas`);

  // --- 5. Crear Bloqueos de Disponibilidad (asociados al admin) ---
  // CORRECCIÓN: Usamos una fecha fija y métodos UTC para consistencia
  const blockDate = new Date('2025-09-22T00:00:00.000Z');
  
  const blockStart = new Date(blockDate.getTime());
  blockStart.setUTCHours(14, 0, 0, 0); // 14:00 UTC

  const blockEnd = new Date(blockDate.getTime());
  blockEnd.setUTCHours(16, 0, 0, 0); // 16:00 UTC

  await prisma.availabilityBlock.upsert({
    where: {
      startTime_endTime_adminId: {
        startTime: blockStart,
        endTime: blockEnd,
        adminId: admin.id,
      },
    },
    update: {},
    create: {
      startTime: blockStart,
      endTime: blockEnd,
      reason: 'Cita médica',
      adminId: admin.id,
    },
  });
  console.log('🚫 Bloqueo de tiempo creado para el 22/09/2025 de 14:00 a 16:00 UTC.');

  // --- 5. Crear Reservas de Prueba (asociando clientes, servicios y admin) ---
  const bookingDate = new Date('2025-09-22T00:00:00.000Z');

  // Usamos los métodos nativos del objeto Date
  const booking1Time = new Date(bookingDate.getTime());
  booking1Time.setUTCHours(9, 0, 0, 0);

  await prisma.booking.upsert({
    where: {
      bookingTime_serviceId_clientId_adminId: {
        bookingTime: booking1Time,
        serviceId: service1.id,
        clientId: client1.id,
        adminId: admin.id,
      },
    },
    update: {},
    create: {
      bookingTime: booking1Time,
      clientId: client1.id,
      serviceId: service1.id,
      adminId: admin.id,
      durationMinutes: 60, // Snapshot de duración de service1
    },
  });

  const booking2Time = new Date(bookingDate.getTime());
  booking2Time.setUTCHours(17, 0, 0, 0);

  await prisma.booking.upsert({
    where: {
      bookingTime_serviceId_clientId_adminId: {
        bookingTime: booking2Time,
        serviceId: service1.id,
        clientId: client2.id,
        adminId: admin.id,
      },
    },
    update: {},
    create: {
      bookingTime: booking2Time,
      clientId: client2.id,
      serviceId: service1.id,
      adminId: admin.id,
      durationMinutes: 60, // Snapshot de duración de service1
    },
  });
  console.log('✅ Reservas de prueba creadas para el 22/09/2025.');

  console.log('🎉 ¡Siembra completada exitosamente!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
