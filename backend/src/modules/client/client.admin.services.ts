import prisma from '../../config/prisma';

export const getClientsForAdmin = async (adminId: string, searchQuery?: string) => {
  const searchCondition = searchQuery
    ? {
        OR: [
          { name: { contains: searchQuery, mode: 'insensitive' as const } },
          { email: { contains: searchQuery, mode: 'insensitive' as const } },
        ],
      }
    : {};

  const clients = await prisma.client.findMany({
    where: {
      bookings: {
        some: {
          adminId,
        },
      },
      ...searchCondition,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
    },
    orderBy: { name: 'asc' },
    take: 20,
  });

  return clients;
};
