import { describe, expect, it, vi } from 'vitest';

const { toastError, interceptorHandlers } = vi.hoisted(() => ({
  toastError: vi.fn(),
  interceptorHandlers: {} as {
    onFulfilled?: (r: unknown) => unknown;
    onRejected?: (e: unknown) => unknown;
  },
}));

vi.mock('react-hot-toast', () => ({
  default: { error: toastError },
}));

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      interceptors: {
        response: {
          use: (onFulfilled: (r: unknown) => unknown, onRejected: (e: unknown) => unknown) => {
            interceptorHandlers.onFulfilled = onFulfilled;
            interceptorHandlers.onRejected = onRejected;
          },
        },
      },
    })),
  },
}));

import '@/api/client';

describe('apiClient 429 interceptor', () => {
  it('calls toast.error when response status is 429', () => {
    const error = {
      response: {
        status: 429,
        headers: { 'retry-after': '60' },
        data: { message: 'Demasiadas solicitudes. Por favor, intenta más tarde.' },
      },
    };

    if (typeof interceptorHandlers.onRejected === 'function') {
      interceptorHandlers.onRejected(error);
    }

    expect(toastError).toHaveBeenCalledWith(
      'Demasiadas solicitudes. Por favor, intenta más tarde.'
    );
  });

  it('uses fallback message when backend does not provide one', () => {
    const error = {
      response: {
        status: 429,
        headers: {},
      },
    };

    if (typeof interceptorHandlers.onRejected === 'function') {
      interceptorHandlers.onRejected(error);
    }

    expect(toastError).toHaveBeenCalledWith(
      'Demasiadas solicitudes. Por favor, intenta en unos minutos.'
    );
  });
});
