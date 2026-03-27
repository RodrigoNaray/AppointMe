export const DEFAULT_WEEKLY_SCHEDULE = {
  monday: { isActive: true, start: '09:00', end: '17:00' },
  tuesday: { isActive: true, start: '09:00', end: '17:00' },
  wednesday: { isActive: true, start: '09:00', end: '17:00' },
  thursday: { isActive: true, start: '09:00', end: '17:00' },
  friday: { isActive: true, start: '09:00', end: '17:00' },
  saturday: { isActive: false, start: '00:00', end: '00:00' },
  sunday: { isActive: false, start: '00:00', end: '00:00' }
};

export const DEFAULT_BUSINESS_HOURS = {
  monday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
  tuesday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
  wednesday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
  thursday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
  friday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
  saturday: { isOpen: false, openTime: '00:00', closeTime: '00:00' },
  sunday: { isOpen: false, openTime: '00:00', closeTime: '00:00' }
};

export const BASE_ADMIN = {
  id: 'admin-1',
  email: 'admin@example.com'
};

export const BASE_CATEGORY = {
  id: 'category-1',
  name: 'Cortes',
  isActive: true
};

export const BASE_SERVICE = {
  id: 'service-1',
  name: 'Corte clasico',
  durationMinutes: 30,
  price: 500,
  isActive: true,
  categoryId: BASE_CATEGORY.id,
  adminId: BASE_ADMIN.id
};
