import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Service } from '../types/service';

/**
 * BookingStore - Zustand store para estado del carrito de servicios
 * 
 * Arquitectura Redux-ready (preparada para migración futura):
 * - Actions separadas del estado (patrón Redux-like)
 * - Selectors explícitos para composición
 * - Persist middleware con localStorage
 * - TypeScript strict mode
 * 
 * Mejores prácticas Zustand 5.0 (2025):
 * - Immer automático para mutaciones (set con funciones)
 * - Persist API v4 (storage personalizado)
 * - Selectores granulares para optimización de renders
 * 
 * Referencias:
 * - Zustand docs: https://docs.pmnd.rs/zustand/getting-started/introduction
 * - Persist middleware: https://docs.pmnd.rs/zustand/integrations/persisting-store-data
 */

// ============================================================================
// TYPES
// ============================================================================

export interface CartItem {
  service: Service;
  quantity: number;
}

interface BookingState {
  // Estado
  cart: CartItem[];
  
  // Actions (patrón Redux-like: verbos descriptivos)
  addService: (service: Service) => void;
  removeService: (serviceId: string) => void;
  clearCart: () => void;
  
  // Selectors (computed values)
  getServiceQuantity: (serviceId: string) => number;
  getTotalPrice: () => number;
  getTotalDuration: () => number;
}

// ============================================================================
// STORE
// ============================================================================

export const useBookingStore = create<BookingState>()(
  persist(
    (set, get) => ({
      // Estado inicial
      cart: [],

      // ========================================================================
      // ACTIONS
      // ========================================================================

      /**
       * addService - Agrega servicio al carrito (incrementa cantidad si ya existe)
       * 
       * @param service - Servicio a agregar
       * 
       * Lógica:
       * - Si existe: incrementa quantity
       * - Si no existe: agrega con quantity = 1
       */
      addService: (service) =>
        set((state) => {
          const existingIndex = state.cart.findIndex(
            (item) => item.service.id === service.id
          );

          if (existingIndex >= 0) {
            // Incrementar cantidad (Immer automático en Zustand 5)
            const updatedCart = [...state.cart];
            updatedCart[existingIndex] = {
              ...updatedCart[existingIndex],
              quantity: updatedCart[existingIndex].quantity + 1,
            };
            return { cart: updatedCart };
          }

          // Agregar nuevo servicio
          return { cart: [...state.cart, { service, quantity: 1 }] };
        }),

      /**
       * removeService - Remueve servicio del carrito (decrementa cantidad o elimina)
       * 
       * @param serviceId - ID del servicio a remover
       * 
       * Lógica:
       * - Si quantity > 1: decrementa
       * - Si quantity = 1: elimina del carrito
       */
      removeService: (serviceId) =>
        set((state) => {
          const existingIndex = state.cart.findIndex(
            (item) => item.service.id === serviceId
          );

          if (existingIndex < 0) return state;

          const currentQuantity = state.cart[existingIndex].quantity;

          if (currentQuantity > 1) {
            // Decrementar cantidad
            const updatedCart = [...state.cart];
            updatedCart[existingIndex] = {
              ...updatedCart[existingIndex],
              quantity: currentQuantity - 1,
            };
            return { cart: updatedCart };
          }

          // Eliminar servicio
          return {
            cart: state.cart.filter((item) => item.service.id !== serviceId),
          };
        }),

      /**
       * clearCart - Limpia el carrito completamente
       * 
       * Usado después de confirmar reserva exitosa
       */
      clearCart: () => set({ cart: [] }),

      // ========================================================================
      // SELECTORS (computed values)
      // ========================================================================

      /**
       * getServiceQuantity - Obtiene cantidad de un servicio específico
       * 
       * @param serviceId - ID del servicio
       * @returns Cantidad en carrito (0 si no existe)
       */
      getServiceQuantity: (serviceId) => {
        const item = get().cart.find((item) => item.service.id === serviceId);
        return item?.quantity ?? 0;
      },

      /**
       * getTotalPrice - Calcula precio total del carrito
       * 
       * @returns Suma de (precio × cantidad) de todos los servicios
       */
      getTotalPrice: () => {
        return get().cart.reduce(
          (sum, item) => sum + item.service.price * item.quantity,
          0
        );
      },

      /**
       * getTotalDuration - Calcula duración total del carrito
       * 
       * @returns Suma de (duración × cantidad) en minutos
       */
      getTotalDuration: () => {
        return get().cart.reduce(
          (sum, item) => sum + item.service.durationMinutes * item.quantity,
          0
        );
      },
    }),
    {
      // Configuración de persist
      name: 'appointme-booking-storage', // Clave en localStorage
      version: 1, // Versión del schema (para migraciones futuras)
      
      // Opcional: Migración de versiones antiguas
      // migrate: (persistedState: any, version: number) => {
      //   if (version === 0) {
      //     // Migrar de v0 a v1
      //   }
      //   return persistedState as BookingState;
      // },
    }
  )
);

// ============================================================================
// SELECTORS EXPORTADOS (para uso granular en componentes)
// ============================================================================

/**
 * Selectores granulares para optimización de renders
 * Componentes solo re-renderizan si la parte específica del estado cambia
 * 
 * Uso:
 * const cart = useBookingStore(selectCart);
 * const totalPrice = useBookingStore(selectTotalPrice);
 */

export const selectCart = (state: BookingState) => state.cart;
export const selectTotalPrice = (state: BookingState) => state.getTotalPrice();
export const selectTotalDuration = (state: BookingState) => state.getTotalDuration();
export const selectAddService = (state: BookingState) => state.addService;
export const selectRemoveService = (state: BookingState) => state.removeService;
export const selectClearCart = (state: BookingState) => state.clearCart;
