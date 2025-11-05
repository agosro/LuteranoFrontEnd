import { useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import { useCicloLectivo } from './CicloLectivoContext.jsx';

// Hook helper: devuelve cicloId y nombre. Si falta, muestra un warning (opcional) cuando se pide ensure.
export function useCicloIdOrWarn(message = 'Seleccioná un ciclo lectivo en Configuración > Ciclo lectivo') {
  const { cicloLectivo } = useCicloLectivo();
  const cicloId = cicloLectivo?.id ?? null;
  const cicloNombre = cicloLectivo?.nombre ?? '';

  const ensureCicloId = useCallback(() => {
    if (!cicloId) toast.warning(message);
    return cicloId;
  }, [cicloId, message]);

  return useMemo(() => ({ cicloId, cicloNombre, ensureCicloId }), [cicloId, cicloNombre, ensureCicloId]);
}
