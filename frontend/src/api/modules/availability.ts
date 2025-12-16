import apiClient from "../client"


interface AvailabilityParams {
    mounth: string;
    totalDuration: number;
}

export const availabilityService = {

    getAvailabilityPerMounth: async (params: AvailabilityParams) => { 
        const response = await apiClient.get('/availability/month', { params });
        return response.data.data;
    }

} as const