import apiClient from '../client';

export interface AdminClient {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}

export const getAdminClients = async (searchQuery?: string): Promise<AdminClient[]> => {
  const params = searchQuery ? { q: searchQuery } : {};
  const response = await apiClient.get<AdminClient[]>('/admin/clients', { params });
  return response.data;
};
