import apiClient from '../client';
import type { AdminUser } from '@/types/auth';

export const adminAuthApi = {
  updateProfile: (data: { name: string }): Promise<{ success: boolean; user: AdminUser }> =>
    apiClient.put<{ success: boolean; user: AdminUser }>('auth/profile', data).then(r => r.data),
};
