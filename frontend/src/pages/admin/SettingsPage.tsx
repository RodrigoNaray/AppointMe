import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Clock, CheckCircle2, AlertCircle, Phone, Mail, MapPin } from 'lucide-react';
import { getBookingRules, updateBookingRules, getContactInfo, updateContactInfo, type ContactInfo, type UpdateContactInfoDTO } from '@/api/settings';
import { AdminMapPicker } from '@/components/AdminMapPicker';

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

  // Estado para información de contacto
  const [contactInfo, setContactInfo] = useState<ContactInfo>({ phone: '', email: '', address: '', latitude: null, longitude: null });
  const [contactError, setContactError] = useState<string | null>(null);
  const [contactSuccess, setContactSuccess] = useState<string | null>(null);
  const [contactLoading, setContactLoading] = useState(false);
  const [initialContactInfo, setInitialContactInfo] = useState<ContactInfo>({ phone: '', email: '', address: '', latitude: null, longitude: null });

  // Detectar cambios sin guardar en contact info
  const hasUnsavedContactChanges = JSON.stringify(contactInfo) !== JSON.stringify(initialContactInfo);

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

  // Cargar información de contacto
  useEffect(() => {
    const fetchContactInfo = async () => {
      try {
        const data = await getContactInfo();
        setContactInfo(data);
        setInitialContactInfo(data);
      } catch (error) {
        console.error('Error fetching contact info:', error);
        setContactError('No se pudo cargar la información de contacto');
      }
    };
    fetchContactInfo();
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

  // Manejar submit de información de contacto
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactError(null);
    setContactSuccess(null);

    setContactLoading(true);
    try {
      const updateData: UpdateContactInfoDTO = {
        businessPhone: contactInfo.phone || undefined,
        businessEmail: contactInfo.email || undefined,
        businessAddress: contactInfo.address || undefined,
        businessLatitude: contactInfo.latitude !== null ? contactInfo.latitude : undefined,
        businessLongitude: contactInfo.longitude !== null ? contactInfo.longitude : undefined
      };

      const updatedData = await updateContactInfo(updateData);
      setContactInfo(updatedData);
      setInitialContactInfo(updatedData);
      setContactSuccess('Información de contacto actualizada correctamente');
    } catch (error: any) {
      console.error('Error al actualizar información de contacto:', error);
      
      if (error.code === 'ERR_NETWORK') {
        setContactError('No se pudo conectar con el servidor.');
      } else if (error.response?.status === 401 || error.response?.status === 403) {
        setContactError('No tienes permisos para realizar esta acción. Verifica tu sesión.');
      } else if (error.response?.status === 400) {
        setContactError(error.response?.data?.message || 'Formato inválido en alguno de los campos.');
      } else {
        setContactError('No se pudo guardar la información de contacto. Intenta nuevamente.');
      }
    } finally {
      setContactLoading(false);
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
          Administra los parámetros generales de AppointMePro
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

      {/* Card de Información de Contacto */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Información de Contacto
              </CardTitle>
              <CardDescription className="mt-1.5">
                Configura los datos de contacto que se mostrarán en HomePage y ContactPage
              </CardDescription>
            </div>
            {hasUnsavedContactChanges && (
              <Badge variant="outline" className="text-xs">
                Sin guardar
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleContactSubmit} className="space-y-6">
            {contactError && (
              <div className="flex items-start gap-3 bg-destructive/15 text-destructive px-4 py-3 rounded-md text-sm">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <span>{contactError}</span>
              </div>
            )}
            
            {contactSuccess && (
              <div className="flex items-start gap-3 bg-green-50 text-green-700 px-4 py-3 rounded-md text-sm">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <span>{contactSuccess}</span>
              </div>
            )}

            <div className="space-y-6">
              {/* Teléfono */}
              <div className="space-y-2">
                <Label htmlFor="businessPhone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Teléfono de Contacto
                </Label>
                <Input
                  id="businessPhone"
                  type="tel"
                  value={contactInfo.phone}
                  onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
                  placeholder="+598 123 456 789"
                  disabled={contactLoading}
                  className="max-w-md"
                />
                <p className="text-xs text-muted-foreground">
                  Formato internacional recomendado: +XX XXX XXX XXX
                </p>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="businessEmail" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email de Contacto
                </Label>
                <Input
                  id="businessEmail"
                  type="email"
                  value={contactInfo.email}
                  onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
                  placeholder="info@tusitio.com"
                  disabled={contactLoading}
                  className="max-w-md"
                />
                <p className="text-xs text-muted-foreground">
                  Email público para consultas (diferente de tu email de administrador)
                </p>
              </div>

              {/* Dirección */}
              <div className="space-y-2">
                <Label htmlFor="businessAddress" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Dirección
                </Label>
                <Textarea
                  id="businessAddress"
                  value={contactInfo.address}
                  onChange={(e) => setContactInfo({ ...contactInfo, address: e.target.value })}
                  placeholder="Av. Principal 123, Ciudad, País"
                  disabled={contactLoading}
                  rows={3}
                  className="max-w-md resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Dirección física de tu negocio (máximo 500 caracteres)
                </p>
              </div>

              {/* Selector Visual de Ubicación (Mapa Interactivo) */}
              <AdminMapPicker
                value={{
                  lat: contactInfo.latitude ?? -34.9011,
                  lng: contactInfo.longitude ?? -56.1645,
                  address: contactInfo.address || '',
                }}
                onChange={(newValue) => {
                  setContactInfo({
                    ...contactInfo,
                    latitude: newValue.lat,
                    longitude: newValue.lng,
                    address: newValue.address,
                  });
                }}
                height="500px"
              />

              <div className="bg-blue-50 border border-blue-200 px-4 py-3 rounded-md">
                <p className="text-sm text-blue-900">
                  <strong>ℹ️ Nota:</strong> Esta información se mostrará públicamente en la página de inicio y contacto. Si dejas campos vacíos, se mostrarán valores por defecto.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button 
                type="submit" 
                disabled={contactLoading || !hasUnsavedContactChanges}
                className="min-w-[140px]"
              >
                {contactLoading ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}