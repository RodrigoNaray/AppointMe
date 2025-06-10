// backend/src/config/prisma.ts

import { PrismaClient } from '@prisma/client';

// 1. Declara una variable en el ámbito global de Node.js.
//    Esto es clave para que persista entre recargas en desarrollo.
declare global {
  var prisma: PrismaClient | undefined;
}

// 2. Implementación del Singleton
//    Comprueba si la instancia ya existe en el objeto global.
//    Si existe (global.prisma), la reutiliza.
//    Si NO existe, crea una nueva (`new PrismaClient()`).
const prisma = global.prisma || new PrismaClient();

// 3. Persistencia en Desarrollo
//    En un entorno que no sea de producción, guardamos la instancia
//    recién creada (o reutilizada) en la variable global.
//    Esto asegura que en la próxima recarga de código, el paso 2 la encontrará.
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

// 4. Punto de Acceso Global
//    Exportamos la única instancia para que toda la aplicación
//    (tus servicios) pueda importarla y usarla.
export default prisma;