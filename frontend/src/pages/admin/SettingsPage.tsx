import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { getBookingRules, updateBookingRules } from '@/api/settings';

/**
 * SettingsPage - Página de configuración administrativa
 * 
 * Funcionalidades:
 * - Configurar tiempo mínimo de anticipación para reservas
 * - Input dual: minutos o horas (tabs)
 * - Edición libre del campo (permite borrar y escribir)
 * - Validación client-side (0-10080 minutos = 1 semana)
 * - Conversiones visuales (minutos → horas/días)
 * 
 * Justificaciones:
 * - OWASP: Validación doble (client + server), prevención de inputs vacíos
 * - UX: Tabs para elegir unidad (minutos/horas), edición libre mejora experiencia
 * - Arquitectura: Separación de concerns (API client independiente)
 * - React 19: Controlled components con estado local, validación en onChange
 */
export default function SettingsPage() {
  // Estado para tiempo de anticipación de reserva
  const [inputValue, setInputValue] = useState<string>('60'); // String para permitir edición libre
  const [inputUnit, setInputUnit] = useState<'minutes' | 'hours'>('minutes');
  const [initialValue, setInitialValue] = useState<number>(60); // Valor original en minutos
  
  // Estado para tiempo de cancelación
  const [cancelInputValue, setCancelInputValue] = useState<string>('120');
  const [cancelInputUnit, setCancelInputUnit] = useState<'minutes' | 'hours'>('minutes');
  const [initialCancelValue, setInitialCancelValue] = useState<number>(120);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Convertir input a minutos según la unidad seleccionada (RESERVA)
  const getMinutesFromInput = (): number => {
    const num = parseFloat(inputValue);
    if (isNaN(num)) return 0;
    return inputUnit === 'hours' ? Math.round(num * 60) : Math.round(num);
  };

  // Convertir input de cancelación a minutos
  const getCancelMinutesFromInput = (): number => {
    const num = parseFloat(cancelInputValue);
    if (isNaN(num)) return 0;
    return cancelInputUnit === 'hours' ? Math.round(num * 60) : Math.round(num);
  };

  // Obtener valores actuales en minutos
  const currentMinutes = getMinutesFromInput();
  const currentCancelMinutes = getCancelMinutesFromInput();

  // Función para convertir minutos a formato legible
  const formatMinutesToReadable = (minutes: number): string => {
    if (minutes === 0) return '0 minutos (reservas inmediatas)';
    if (minutes < 60) return `${minutes} minutos`;
    if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}min` : `${hours} horas`;
    }
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    return hours > 0 ? `${days} días ${hours}h` : `${days} días`;
  };

  // Detectar si hay cambios sin guardar
  const hasUnsavedChanges = currentMinutes !== initialValue || currentCancelMinutes !== initialCancelValue;

  // Validar si el input de reserva es válido
  const isInputValid = (): boolean => {
    if (inputValue.trim() === '') return false;
    const num = parseFloat(inputValue);
    if (isNaN(num)) return false;
    const minutes = getMinutesFromInput();
    return minutes >= 0 && minutes <= 10080;
  };

  // Validar si el input de cancelación es válido
  const isCancelInputValid = (): boolean => {
    if (cancelInputValue.trim() === '') return false;
    const num = parseFloat(cancelInputValue);
    if (isNaN(num)) return false;
    const minutes = getCancelMinutesFromInput();
    return minutes >= 0 && minutes <= 10080;
  };

  // Manejar cambio de unidad (minutos ↔ horas) - RESERVA
  const handleUnitChange = (newUnit: string) => {
    if (newUnit !== 'minutes' && newUnit !== 'hours') return;
    
    const currentMinutesValue = getMinutesFromInput();
    
    if (newUnit === 'hours') {
      const hours = currentMinutesValue / 60;
      setInputValue(hours.toString());
    } else {
      setInputValue(currentMinutesValue.toString());
    }
    
    setInputUnit(newUnit as 'minutes' | 'hours');
  };

  // Manejar cambio de unidad - CANCELACIÓN
  const handleCancelUnitChange = (newUnit: string) => {
    if (newUnit !== 'minutes' && newUnit !== 'hours') return;
    
    const currentMinutesValue = getCancelMinutesFromInput();
    
    if (newUnit === 'hours') {
      const hours = currentMinutesValue / 60;
      setCancelInputValue(hours.toString());
    } else {
      setCancelInputValue(currentMinutesValue.toString());
    }
    
    setCancelInputUnit(newUnit as 'minutes' | 'hours');
  };

  // Cargar configuración actual
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await getBookingRules();
        
        // Validar que data exista (OWASP: null safety)
        if (data) {
          // Tiempo de anticipación de reserva
          if (typeof data.minBookingAdvanceMinutes === 'number') {
            setInputValue(data.minBookingAdvanceMinutes.toString());
            setInitialValue(data.minBookingAdvanceMinutes);
          } else {
            setInputValue('60');
            setInitialValue(60);
          }
          
          // Tiempo de cancelación
          if (typeof data.minCancellationNoticeMinutes === 'number') {
            setCancelInputValue(data.minCancellationNoticeMinutes.toString());
            setInitialCancelValue(data.minCancellationNoticeMinutes);
          } else {
            setCancelInputValue('120');
            setInitialCancelValue(120);
          }
        } else {
          // Fallback a valores por defecto
          setInputValue('60');
          setInitialValue(60);
          setCancelInputValue('120');
          setInitialCancelValue(120);
        }
      } catch (error) {
        console.error('Error al cargar configuración:', error);
        setError('No se pudo cargar la configuración actual. Usando valores por defecto.');
        // Mantener valores por defecto en caso de error
        setInputValue('60');
        setInitialValue(60);
        setCancelInputValue('120');
        setInitialCancelValue(120);
      } finally {
        setIsFetching(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // Validación: campos no vacíos
    if (inputValue.trim() === '' || cancelInputValue.trim() === '') {
      setError('Debes ingresar valores en ambos campos');
      return;
    }

    const minutes = getMinutesFromInput();
    const cancelMinutes = getCancelMinutesFromInput();

    // Validación client-side (OWASP: nunca confiar solo en validación backend)
    if (minutes < 0 || minutes > 10080) {
      setError('El tiempo de anticipación debe estar entre 0 y 10080 minutos (1 semana)');
      return;
    }

    if (cancelMinutes < 0 || cancelMinutes > 10080) {
      setError('El tiempo de cancelación debe estar entre 0 y 10080 minutos (1 semana)');
      return;
    }

    setIsLoading(true);
    try {
      await updateBookingRules({ 
        minBookingAdvanceMinutes: minutes,
        minCancellationNoticeMinutes: cancelMinutes
      });
      setInitialValue(minutes);
      setInitialCancelValue(cancelMinutes);
      setSuccessMessage('Configuración actualizada correctamente');
    } catch (error: any) {
      console.error('Error al actualizar configuración:', error);
      
      // Manejo de errores específicos (OWASP: no exponer detalles técnicos al usuario)
      if (error.code === 'ERR_NETWORK') {
        setError('No se pudo conectar con el servidor.');
      } else if (error.response?.status === 401 || error.response?.status === 403) {
        setError('No tienes permisos para realizar esta acción. Verifica tu sesión.');
      } else if (error.response?.status === 400) {
        setError('Valor inválido. Verifica que esté dentro del rango permitido.');
      } else {
        setError('No se pudo guardar la configuración. Intenta nuevamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="grid gap-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Cargando configuración...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración del Sistema</h1>
        <p className="text-muted-foreground mt-2">
          Administra los parámetros generales de AppointMe
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Reglas de Reserva
              </CardTitle>
              <CardDescription className="mt-1.5">
                Configura las restricciones para las reservas de clientes
              </CardDescription>
            </div>
            {!isFetching && (
              <div className="flex flex-col gap-1 text-right">
                <Badge variant="secondary" className="text-xs">
                  Anticipación: {formatMinutesToReadable(initialValue)}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Cancelación: {formatMinutesToReadable(initialCancelValue)}
                </Badge>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-start gap-3 bg-destructive/15 text-destructive px-4 py-3 rounded-md text-sm">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            
            {successMessage && (
              <div className="flex items-start gap-3 bg-green-50 text-green-700 px-4 py-3 rounded-md text-sm">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">
                  Tiempo mínimo de anticipación
                </Label>
                {hasUnsavedChanges && (
                  <Badge variant="outline" className="text-xs">
                    Sin guardar
                  </Badge>
                )}
              </div>

              {/* Tabs para elegir unidad */}
              <Tabs value={inputUnit} onValueChange={handleUnitChange} className="w-full">
                <TabsList className="grid w-full max-w-[400px] grid-cols-2">
                  <TabsTrigger value="minutes">Minutos</TabsTrigger>
                  <TabsTrigger value="hours">Horas</TabsTrigger>
                </TabsList>
                
                <TabsContent value="minutes" className="space-y-3 mt-4">
                  <div className="flex items-center gap-3">
                    <Input
                      id="minAdvanceMinutes"
                      type="text"
                      inputMode="numeric"
                      value={inputValue}
                      onChange={(e) => {
                        // Permitir solo números y punto decimal
                        const value = e.target.value;
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          setInputValue(value);
                        }
                      }}
                      onBlur={() => {
                        // Limpiar si está vacío al perder foco
                        if (inputValue.trim() === '') {
                          setInputValue('0');
                        }
                      }}
                      disabled={isLoading}
                      placeholder="Ej: 60"
                      className="max-w-[200px]"
                    />
                    <span className="text-sm text-muted-foreground">minutos</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Rango válido: 0 a 10080 minutos
                  </p>
                </TabsContent>

                <TabsContent value="hours" className="space-y-3 mt-4">
                  <div className="flex items-center gap-3">
                    <Input
                      id="minAdvanceHours"
                      type="text"
                      inputMode="decimal"
                      value={inputValue}
                      onChange={(e) => {
                        // Permitir solo números y punto decimal
                        const value = e.target.value;
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          setInputValue(value);
                        }
                      }}
                      onBlur={() => {
                        // Limpiar si está vacío al perder foco
                        if (inputValue.trim() === '') {
                          setInputValue('0');
                        }
                      }}
                      disabled={isLoading}
                      placeholder="Ej: 1.5"
                      className="max-w-[200px]"
                    />
                    <span className="text-sm text-muted-foreground">horas</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Rango válido: 0 a 168 horas (1 semana)
                  </p>
                </TabsContent>
              </Tabs>

              {/* Mostrar conversión en tiempo real */}
              {isInputValid() && currentMinutes !== initialValue && (
                <div className="flex items-center gap-2 text-sm bg-muted/50 px-3 py-2 rounded-md">
                  <span className="text-muted-foreground">Nuevo valor:</span>
                  <span className="font-medium text-foreground">
                    {formatMinutesToReadable(currentMinutes)}
                  </span>
                </div>
              )}

              {/* Advertencia si el valor no es válido */}
              {inputValue.trim() !== '' && !isInputValid() && (
                <div className="flex items-start gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>
                    Valor fuera de rango. Debe estar entre 0 y {inputUnit === 'minutes' ? '10080 minutos' : '168 horas'}.
                  </span>
                </div>
              )}

              <div className="bg-muted/50 px-4 py-3 rounded-md space-y-2">
                <p className="text-sm text-muted-foreground">
                  Los clientes deben reservar con al menos esta cantidad de tiempo de anticipación.
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Rango válido:</strong> 0 a 10080 minutos (0 min a 1 semana)
                </p>
              </div>
            </div>

            {/* SEGUNDO CAMPO: Tiempo de cancelación */}
            <div className="space-y-4 pt-6 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">
                  Tiempo mínimo para cancelar
                </Label>
                {(currentCancelMinutes !== initialCancelValue) && (
                  <Badge variant="outline" className="text-xs">
                    Sin guardar
                  </Badge>
                )}
              </div>

              {/* Tabs para elegir unidad - CANCELACIÓN */}
              <Tabs value={cancelInputUnit} onValueChange={handleCancelUnitChange} className="w-full">
                <TabsList className="grid w-full max-w-[400px] grid-cols-2">
                  <TabsTrigger value="minutes">Minutos</TabsTrigger>
                  <TabsTrigger value="hours">Horas</TabsTrigger>
                </TabsList>
                
                <TabsContent value="minutes" className="space-y-3 mt-4">
                  <div className="flex items-center gap-3">
                    <Input
                      id="minCancelMinutes"
                      type="text"
                      inputMode="numeric"
                      value={cancelInputValue}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          setCancelInputValue(value);
                        }
                      }}
                      onBlur={() => {
                        if (cancelInputValue.trim() === '') {
                          setCancelInputValue('0');
                        }
                      }}
                      disabled={isLoading}
                      placeholder="Ej: 120"
                      className="max-w-[200px]"
                    />
                    <span className="text-sm text-muted-foreground">minutos</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Rango válido: 0 a 10080 minutos
                  </p>
                </TabsContent>

                <TabsContent value="hours" className="space-y-3 mt-4">
                  <div className="flex items-center gap-3">
                    <Input
                      id="minCancelHours"
                      type="text"
                      inputMode="decimal"
                      value={cancelInputValue}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          setCancelInputValue(value);
                        }
                      }}
                      onBlur={() => {
                        if (cancelInputValue.trim() === '') {
                          setCancelInputValue('0');
                        }
                      }}
                      disabled={isLoading}
                      placeholder="Ej: 2"
                      className="max-w-[200px]"
                    />
                    <span className="text-sm text-muted-foreground">horas</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Rango válido: 0 a 168 horas (1 semana)
                  </p>
                </TabsContent>
              </Tabs>

              {/* Mostrar conversión en tiempo real - CANCELACIÓN */}
              {isCancelInputValid() && currentCancelMinutes !== initialCancelValue && (
                <div className="flex items-center gap-2 text-sm bg-muted/50 px-3 py-2 rounded-md">
                  <span className="text-muted-foreground">Nuevo valor:</span>
                  <span className="font-medium text-foreground">
                    {formatMinutesToReadable(currentCancelMinutes)}
                  </span>
                </div>
              )}

              {/* Advertencia si el valor no es válido - CANCELACIÓN */}
              {cancelInputValue.trim() !== '' && !isCancelInputValid() && (
                <div className="flex items-start gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>
                    Valor fuera de rango. Debe estar entre 0 y {cancelInputUnit === 'minutes' ? '10080 minutos' : '168 horas'}.
                  </span>
                </div>
              )}

              <div className="bg-amber-50 border border-amber-200 px-4 py-3 rounded-md space-y-2">
                <p className="text-sm text-amber-900">
                  <strong>⚠️ Política de cancelación:</strong> Los clientes solo podrán cancelar reservas con al menos esta cantidad de tiempo de anticipación.
                </p>
                <p className="text-sm text-amber-800">
                  Si intentan cancelar con menos tiempo, verán un mensaje de error indicando el plazo mínimo.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button 
                type="submit" 
                disabled={isLoading || !hasUnsavedChanges || !isInputValid() || !isCancelInputValid()}
                className="min-w-[140px]"
              >
                {isLoading ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}