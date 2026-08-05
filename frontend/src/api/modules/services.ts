import apiClient from '../client';
import type { Service, Category } from '@/types/service';

export interface PaginationResponse {
  current_page: number;
  total_pages: number;
  total_count: number;
  per_page: number;
}

export interface GetServicesResponse {
  success: boolean;
  services: Service[];
  pagination: PaginationResponse;
}

export interface GetServicesParams {
  page?: number;
  limit?: number;
  categoryId?: string | null;
}

export async function getServices(params?: GetServicesParams): Promise<GetServicesResponse> {
  const response = await apiClient.get<GetServicesResponse>('/services', { params });
  return response.data;
}

export async function getCategories(): Promise<Category[]> {
  const response = await apiClient.get<Category[]>('/categories');
  return response.data;
}
