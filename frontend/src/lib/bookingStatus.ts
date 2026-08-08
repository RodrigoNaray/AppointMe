export type BookingDisplayStatus = 'Confirmada' | 'Cancelada' | 'Finalizada';

export const isBookingPast = (
  bookingTimeISO: string,
  now: Date = new Date()
): boolean => {
  const bookingTime = new Date(bookingTimeISO);
  if (isNaN(bookingTime.getTime())) return false;
  return bookingTime <= now;
};

export const deriveBookingDisplayStatus = (
  status: string,
  bookingTimeISO: string,
  now: Date = new Date()
): BookingDisplayStatus => {
  if (status === 'CANCELLED') return 'Cancelada';
  if (status === 'CONFIRMED' && isBookingPast(bookingTimeISO, now)) return 'Finalizada';
  return 'Confirmada';
};
