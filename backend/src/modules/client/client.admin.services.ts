import prisma from '../../config/prisma';

export const getClientsForAdmin = async (
  adminId: string,
  searchQuery?: string,
  page = 1,
  limit = 20
) => {
  const searchCondition = searchQuery
    ? {
        OR: [
          { name: { contains: searchQuery, mode: 'insensitive' as const } },
          { email: { contains: searchQuery, mode: 'insensitive' as const } },
        ],
      }
    : {};

  const where = {
    bookings: {
      some: {
        adminId,
      },
    },
    ...searchCondition,
  };

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
      },
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.client.count({ where }),
  ]);

  return {
    clients,
    pagination: {
      current_page: page,
      total_pages: Math.ceil(total / limit),
      total_count: total,
      per_page: limit,
    },
  };
};
