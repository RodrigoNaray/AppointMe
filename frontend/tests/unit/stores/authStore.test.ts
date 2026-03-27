import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '@/api/client';
import clientAuthService from '@/api/modules/clientAuth';
import { useAuthStore } from '@/stores/authStore';
import { useBookingStore } from '@/stores/bookingStore';
import { createMockAdminUser, createMockClientUser, createMockService } from '../../fixtures/mockData';

describe('authStore', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();

    useBookingStore.setState({ cart: [] });
    useAuthStore.setState({
      authState: { type: null, user: null, isAuthenticated: false },
      isLoading: false,
    });
  });

  it('sets admin auth state on loginAdmin success', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValue({} as never);
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: {
        user: {
          id: 'admin-1',
          email: 'admin@example.com',
        },
      },
    } as never);

    await useAuthStore.getState().loginAdmin({
      email: 'admin@example.com',
      password: 'secret123',
    });

    const authState = useAuthStore.getState().authState;
    expect(authState.type).toBe('admin');
    expect(authState.isAuthenticated).toBe(true);
    if (authState.type === 'admin') {
      expect(authState.user.id).toBe('admin-1');
      expect(authState.user.type).toBe('admin');
    }
  });

  it('resets auth state when loginAdmin fails', async () => {
    vi.spyOn(apiClient, 'post').mockRejectedValue(new Error('invalid credentials'));

    await expect(
      useAuthStore.getState().loginAdmin({
        email: 'admin@example.com',
        password: 'wrong',
      })
    ).rejects.toThrow('invalid credentials');

    expect(useAuthStore.getState().authState).toEqual({
      type: null,
      user: null,
      isAuthenticated: false,
    });
  });

  it('sets client auth state on loginClient success', async () => {
    vi.spyOn(clientAuthService, 'login').mockResolvedValue(createMockClientUser());

    await useAuthStore.getState().loginClient({
      email: 'ana@example.com',
      password: 'secret123',
    });

    const authState = useAuthStore.getState().authState;
    expect(authState.type).toBe('client');
    expect(authState.isAuthenticated).toBe(true);
    if (authState.type === 'client') {
      expect(authState.user.email).toBe('ana@example.com');
    }
  });

  it('clears auth and booking cart on logoutClient', async () => {
    const service = createMockService();
    useBookingStore.getState().addService(service);

    useAuthStore.setState({
      authState: {
        type: 'client',
        user: createMockClientUser(),
        isAuthenticated: true,
      },
    });

    vi.spyOn(clientAuthService, 'logout').mockResolvedValue(undefined);

    await useAuthStore.getState().logoutClient();

    expect(useAuthStore.getState().authState).toEqual({
      type: null,
      user: null,
      isAuthenticated: false,
    });
    expect(useBookingStore.getState().cart).toEqual([]);
  });

  it('returns register result on registerClient success', async () => {
    vi.spyOn(clientAuthService, 'register').mockResolvedValue({
      success: true,
      message: 'Registro exitoso',
    });

    const result = await useAuthStore.getState().registerClient({
      name: 'Ana',
      email: 'ana@example.com',
      phone: '099123456',
      password: 'secret123',
    });

    expect(result).toEqual({
      success: true,
      message: 'Registro exitoso',
    });
  });

  it('throws when registerClient returns success false', async () => {
    vi.spyOn(clientAuthService, 'register').mockResolvedValue({
      success: false,
      message: 'Email ya existe',
    });

    await expect(
      useAuthStore.getState().registerClient({
        name: 'Ana',
        email: 'ana@example.com',
        phone: '099123456',
        password: 'secret123',
      })
    ).rejects.toThrow('Email ya existe');
  });

  it('checkSession authenticates as admin when admin profile is available', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: {
        user: createMockAdminUser(),
      },
    } as never);
    const getProfileSpy = vi.spyOn(clientAuthService, 'getProfile');

    await useAuthStore.getState().checkSession();

    const authState = useAuthStore.getState().authState;
    expect(authState.type).toBe('admin');
    expect(useAuthStore.getState().isLoading).toBe(false);
    expect(getProfileSpy).not.toHaveBeenCalled();
  });

  it('checkSession falls back to client when admin profile request fails', async () => {
    vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('admin not authenticated'));
    vi.spyOn(clientAuthService, 'getProfile').mockResolvedValue(createMockClientUser());

    await useAuthStore.getState().checkSession();

    const authState = useAuthStore.getState().authState;
    expect(authState.type).toBe('client');
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it('checkSession sets unauthenticated state when both profile requests fail', async () => {
    vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('admin not authenticated'));
    vi.spyOn(clientAuthService, 'getProfile').mockRejectedValue(new Error('client not authenticated'));

    await useAuthStore.getState().checkSession();

    expect(useAuthStore.getState().authState).toEqual({
      type: null,
      user: null,
      isAuthenticated: false,
    });
    expect(useAuthStore.getState().isLoading).toBe(false);
  });
});