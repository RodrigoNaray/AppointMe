/**
 * Utilidad para detectar dispositivos iOS y Safari
 */

export const isIOS = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

export const isSafari = (): boolean => {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
};

export const isIOSSafari = (): boolean => {
  return isIOS() && isSafari();
};

/**
 * Detecta si es iOS Safari y aplica configuraciones específicas
 */
export const getApiConfig = () => {
  const baseConfig = {
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
    }
  };

  // Agregar header específico para iOS Safari si es necesario
  if (isIOSSafari()) {
    return {
      ...baseConfig,
      headers: {
        ...baseConfig.headers,
        'X-iOS-Safari': 'true',
      }
    };
  }

  return baseConfig;
};

/**
 * Log información del dispositivo para debugging
 */
export const logDeviceInfo = () => {
  if (import.meta.env.DEV) {
    console.log('Device Detection:', {
      userAgent: navigator.userAgent,
      isIOS: isIOS(),
      isSafari: isSafari(),
      isIOSSafari: isIOSSafari(),
    });
  }
};
