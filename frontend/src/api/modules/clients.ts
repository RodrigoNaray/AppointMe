import apiClient from '../client';

export interface AdminClient {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}

export interface AdminClientsResponse {
  clients: AdminClient[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_count: number;
    per_page: number;
  };
}

export const getAdminClients = async (
  searchQuery?: string,
  page = 1,
  limit = 20
): Promise<AdminClientsResponse> => {
  const params: Record<string, string | number> = { page, limit };
  if (searchQuery) params.q = searchQuery;
  const response = await apiClient.get<AdminClientsResponse>('/admin/clients', { params });
  return response.data;
};
