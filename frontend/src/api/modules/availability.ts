import apiClient from "../client"




export const availabilityService = {

    getAvailabilityPerMonth: async (params: {month:string, totalDuration: number}) => { 
        const { data } = await apiClient.get('/availability/month', { params });
        return data;

    },

    getAvailableSlots: async (params: {date: string, durationMinutes: number}) => {
        const response = await apiClient.get('/availability',{params});
        return response.data;
    }

} as const