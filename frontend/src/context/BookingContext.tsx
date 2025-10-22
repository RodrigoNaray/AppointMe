import { createContext, useState, useContext, ReactNode, useMemo, useCallback } from 'react';
import type { Service } from '../types/service';

/**
 * BookingContext - Context API para manejar estado del carrito de servicios
 * 
 * Mejores prácticas React 19 (2025):
 * - Discriminated unions para type safety
 * - useMemo/useCallback para optimización de renders
 * - Context API para estado compartido sin prop drilling
 * 
 * Arquitectura:
 * - Carrito almacena servicios con cantidad
 * - Cálculos automáticos de totales (precio + duración)
 * - Acciones: add, remove, clear
 */

interface CartItem {
  service: Service;
  quantity: number;
}

interface BookingContextType {
  cart: CartItem[];
  totalPrice: number;
  totalDuration: number;
  addService: (service: Service) => void;
  removeService: (serviceId: string) => void;
  clearCart: () => void;
  getServiceQuantity: (serviceId: string) => number;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export const BookingProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<CartItem[]>([]);

  // Agregar servicio al carrito (incrementa cantidad si ya existe)
  const addService = useCallback((service: Service) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.service.id === service.id);
      
      if (existingIndex >= 0) {
        // Incrementar cantidad si ya existe
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1,
        };
        return updated;
      }
      
      // Agregar nuevo servicio con cantidad 1
      return [...prev, { service, quantity: 1 }];
    });
  }, []);

  // Remover servicio del carrito (decrementa cantidad o elimina)
  const removeService = useCallback((serviceId: string) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.service.id === serviceId);
      
      if (existingIndex < 0) return prev;
      
      const updated = [...prev];
      const currentQuantity = updated[existingIndex].quantity;
      
      if (currentQuantity > 1) {
        // Decrementar cantidad
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: currentQuantity - 1,
        };
        return updated;
      }
      
      // Eliminar si cantidad es 1
      return updated.filter((item) => item.service.id !== serviceId);
    });
  }, []);

  // Limpiar carrito completamente
  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  // Obtener cantidad de un servicio específico en el carrito
  const getServiceQuantity = useCallback((serviceId: string): number => {
    const item = cart.find((item) => item.service.id === serviceId);
    return item?.quantity ?? 0;
  }, [cart]);

  // Cálculos automáticos memoizados (React 19 best practice)
  const totalPrice = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.service.price * item.quantity, 0);
  }, [cart]);

  const totalDuration = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.service.durationMinutes * item.quantity, 0);
  }, [cart]);

  const value = useMemo<BookingContextType>(
    () => ({
      cart,
      totalPrice,
      totalDuration,
      addService,
      removeService,
      clearCart,
      getServiceQuantity,
    }),
    [cart, totalPrice, totalDuration, addService, removeService, clearCart, getServiceQuantity]
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
};

// Hook personalizado para usar el contexto con type safety
export const useBooking = () => {
  const context = useContext(BookingContext);
  
  if (context === undefined) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  
  return context;
};
