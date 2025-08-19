import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { addMinutes, setHours, setMinutes } from 'date-fns';

// Inicializamos el cliente de Prisma
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Empezando el proceso de siembra...');

  // --- 1. Crear Administrador ---
  const adminPassword = await bcrypt.hash('adminpass123', 10);
  const admin = await prisma.adminUser.upsert({
    where: { email: 'admin@appointme.com' },
    update: {},
    create: {
      email: 'admin@appointme.com',
      passwordHash: adminPassword,
      schedule: {
        monday: { start: '09:00', end: '18:00', isActive: true },
        tuesday: { start: '09:00', end: '18:00', isActive: true },
        wednesday: { start: '09:00', end: '13:00', isActive: true },
        thursday: { start: '09:00', end: '18:00', isActive: true },
        friday: { start: '09:00', end: '17:00', isActive: true },
        saturday: { start: '10:00', end: '14:00', isActive: false },
        sunday: { start: '09:00', end: '18:00', isActive: false },
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

  // --- 3. Crear Servicios (asociados al admin) ---
  const service1 = await prisma.service.upsert({
    where: { name: 'Corte y Peinado' },
    update: {},
    create: {
      name: 'Corte y Peinado',
      description: 'Corte de cabello personalizado seguido de un peinado profesional.',
      durationMinutes: 60,
      price: 1500,
      adminId: admin.id, // Asociamos el servicio al admin
    },
  });

  const service2 = await prisma.service.upsert({
    where: { name: 'Maquillaje Social de Noche' },
    update: {},
    create: {
      name: 'Maquillaje Social de Noche',
      description: 'Maquillaje completo para eventos nocturnos.',
      durationMinutes: 90,
      price: 2200,
      adminId: admin.id,
    },
  });
  console.log(`💄 Servicios creados/actualizados: "${service1.name}", "${service2.name}"`);

  // --- 4. Crear Bloqueos de Disponibilidad (asociados al admin) ---
  const today = new Date();
  const blockStart = setMinutes(setHours(today, 14), 0); // Hoy a las 14:00
  const blockEnd = setMinutes(setHours(today, 16), 0); // Hoy a las 16:00

  await prisma.availabilityBlock.upsert({
    where: {
      // Necesitamos un identificador único para upsert, podemos usar la fecha de inicio
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
  console.log('🚫 Bloqueo de tiempo creado para hoy de 14:00 a 16:00.');

  // --- 5. Crear Reservas (asociando clientes, servicios y admin) ---
  const booking1Time = setMinutes(setHours(today, 10), 0); // Hoy a las 10:00
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
    },
  });

  const booking2Time = setMinutes(setHours(today, 11), 30); // Hoy a las 11:30
  await prisma.booking.upsert({
    where: {
      bookingTime_serviceId_clientId_adminId: {
        bookingTime: booking2Time,
        serviceId: service2.id,
        clientId: client2.id,
        adminId: admin.id,
      },
    },
    update: {},
    create: {
      bookingTime: booking2Time,
      clientId: client2.id,
      serviceId: service2.id,
      adminId: admin.id,
    },
  });
  console.log('✅ Reservas de ejemplo creadas para hoy.');

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