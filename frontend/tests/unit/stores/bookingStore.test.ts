import { beforeEach, describe, expect, it } from 'vitest';
import {
  selectCart,
  selectClearCart,
  selectTotalDuration,
  selectTotalPrice,
  useBookingStore,
} from '@/stores/bookingStore';
import { createMockService } from '../../fixtures/mockData';

describe('bookingStore', () => {
  beforeEach(() => {
    sessionStorage.clear();
    useBookingStore.setState({ cart: [] });
  });

  it('adds a new service with quantity 1', () => {
    const service = createMockService();

    useBookingStore.getState().addService(service);

    const cart = useBookingStore.getState().cart;
    expect(cart).toHaveLength(1);
    expect(cart[0].service.id).toBe(service.id);
    expect(cart[0].quantity).toBe(1);
  });

  it('increments quantity when adding an existing service', () => {
    const service = createMockService();

    useBookingStore.getState().addService(service);
    useBookingStore.getState().addService(service);

    const cart = useBookingStore.getState().cart;
    expect(cart).toHaveLength(1);
    expect(cart[0].quantity).toBe(2);
  });

  it('decrements quantity on remove when quantity is greater than 1', () => {
    const service = createMockService();

    useBookingStore.getState().addService(service);
    useBookingStore.getState().addService(service);
    useBookingStore.getState().removeService(service.id);

    const cart = useBookingStore.getState().cart;
    expect(cart).toHaveLength(1);
    expect(cart[0].quantity).toBe(1);
  });

  it('removes service when quantity reaches 0', () => {
    const service = createMockService();

    useBookingStore.getState().addService(service);
    useBookingStore.getState().removeService(service.id);

    expect(useBookingStore.getState().cart).toEqual([]);
  });

  it('keeps cart unchanged when removing an unknown service', () => {
    const service = createMockService();

    useBookingStore.getState().addService(service);
    useBookingStore.getState().removeService('missing-service-id');

    const cart = useBookingStore.getState().cart;
    expect(cart).toHaveLength(1);
    expect(cart[0].service.id).toBe(service.id);
  });

  it('calculates total price and duration correctly', () => {
    const serviceA = createMockService({ id: 'service-a', price: 500, durationMinutes: 30 });
    const serviceB = createMockService({ id: 'service-b', price: 800, durationMinutes: 45 });

    useBookingStore.getState().addService(serviceA);
    useBookingStore.getState().addService(serviceA);
    useBookingStore.getState().addService(serviceB);

    expect(useBookingStore.getState().getTotalPrice()).toBe(1800);
    expect(useBookingStore.getState().getTotalDuration()).toBe(105);
  });

  it('clears the cart through action and selector', () => {
    const service = createMockService();
    useBookingStore.getState().addService(service);

    const clearCart = selectClearCart(useBookingStore.getState());
    clearCart();

    expect(useBookingStore.getState().cart).toEqual([]);
    expect(selectCart(useBookingStore.getState())).toEqual([]);
    expect(selectTotalPrice(useBookingStore.getState())).toBe(0);
    expect(selectTotalDuration(useBookingStore.getState())).toBe(0);
  });

  it('persists cart data into sessionStorage', () => {
    const service = createMockService({ id: 'service-persist-1' });

    useBookingStore.getState().addService(service);

    const persisted = sessionStorage.getItem('appointmepro-booking-storage');
    expect(persisted).toBeTruthy();
    expect(persisted).toContain('service-persist-1');
  });
});