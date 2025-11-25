import { useEffect, useState } from 'react';

/**
 * Hook para detectar si la página fue abierta en una nueva pestaña
 * desde un reporte (usando window.open con _blank)
 */
export function useOpenedInNewTab() {
  const [isNewTab, setIsNewTab] = useState(false);

  useEffect(() => {
    // Detectar si se abrió en nueva pestaña verificando el referrer y el historial
    const isNew = 
      (document.referrer === '' || !document.referrer) && 
      (window.history.length === 1);
    
    setIsNewTab(isNew);
  }, []);

  return isNewTab;
}
