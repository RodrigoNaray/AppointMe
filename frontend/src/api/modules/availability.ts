import apiClient from "../client"




export const availabilityService = {

    getAvailabilityPerMonth: async (params: {month:string, totalDuration: number}) => { 
        const { data } = await apiClient.get('/availability/month', { params });
        return data;

    },

    getAvailableSlots: async (params: {date: string, durationMinutes: number}) => {
        const response = await apiClient.get('/availability',{params});
        return response.data;
    },

    getFirstMonthAvailable: async (body: { totalDuration: number; maxMonthsAhead?: number}) => {
        const response = await apiClient.post('/availability/firstMonthAvailable', body);
        return response.data; // { month: "YYYY-MM" }
    }

} as const