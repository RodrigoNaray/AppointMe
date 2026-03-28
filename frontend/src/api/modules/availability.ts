import apiClient from "../client"

interface MonthAvailabilityParams {
    month: string;
    totalDuration: number;
}

interface SlotsAvailabilityParams {
    date: string;
    durationMinutes: number;
}

interface FirstMonthAvailableRequest {
    totalDuration: number;
    maxMonthsAhead?: number;
}

interface FirstMonthAvailableResponse {
    month: string | null;
}

const MONTH_REGEX = /^\d{4}-\d{2}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const assertValidMonthParams = (params: MonthAvailabilityParams): void => {
    if (!MONTH_REGEX.test(params.month)) {
        throw new Error('month debe tener formato YYYY-MM');
    }

    if (!Number.isInteger(params.totalDuration) || params.totalDuration <= 0) {
        throw new Error('totalDuration debe ser un entero mayor a 0');
    }
};

const assertValidSlotsParams = (params: SlotsAvailabilityParams): void => {
    if (!DATE_REGEX.test(params.date)) {
        throw new Error('date debe tener formato YYYY-MM-DD');
    }

    if (!Number.isInteger(params.durationMinutes) || params.durationMinutes <= 0) {
        throw new Error('durationMinutes debe ser un entero mayor a 0');
    }
};

const assertValidFirstMonthParams = (params: FirstMonthAvailableRequest): void => {
    if (!Number.isInteger(params.totalDuration) || params.totalDuration <= 0) {
        throw new Error('totalDuration debe ser un entero mayor a 0');
    }

    if (
        params.maxMonthsAhead !== undefined &&
        (!Number.isInteger(params.maxMonthsAhead) || params.maxMonthsAhead <= 0)
    ) {
        throw new Error('maxMonthsAhead debe ser un entero mayor a 0');
    }
};

export const availabilityService = {

    getAvailabilityPerMonth: async (params: MonthAvailabilityParams): Promise<string[]> => {
        assertValidMonthParams(params);

        const { data } = await apiClient.get<string[]>('/availability/month', { params });
        return data;

    },

    getAvailableSlots: async (params: SlotsAvailabilityParams): Promise<string[]> => {
        assertValidSlotsParams(params);

        const response = await apiClient.get<string[]>('/availability', { params });
        return response.data;
    },

    getFirstMonthAvailable: async (body: FirstMonthAvailableRequest): Promise<FirstMonthAvailableResponse> => {
        assertValidFirstMonthParams(body);

        const response = await apiClient.post<FirstMonthAvailableResponse>('/availability/firstMonthAvailable', body);
        return response.data;
    }

} as const
