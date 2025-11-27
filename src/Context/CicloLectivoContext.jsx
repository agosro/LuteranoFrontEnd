import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { obtenerCicloLectivoActual } from '../Services/CicloLectivoService';

const CicloLectivoContext = createContext();

export function CicloLectivoProvider({ children }) {
  const { user } = useAuth();
  const [ciclo, setCiclo] = useState(() => {
    try {
      const raw = localStorage.getItem('cicloLectivo');
      return raw ? JSON.parse(raw) : null; // { id, nombre }
    } catch {
      return null;
    }
  });

  // Para roles restringidos (DOCENTE, AUXILIAR, PRECEPTOR), cargar automáticamente el ciclo actual
  useEffect(() => {
    const rolesRestringidos = ['ROLE_DOCENTE', 'ROLE_AUXILIAR', 'ROLE_PRECEPTOR'];
    if (user?.rol && rolesRestringidos.includes(user.rol) && user.token) {
      // Solo cargar si no hay ciclo seleccionado o si cambió de usuario
      if (!ciclo) {
        obtenerCicloLectivoActual(user.token)
          .then(response => {
            if (response?.cicloLectivoDto) {
              const actual = response.cicloLectivoDto;
              setCiclo({ id: actual.id, nombre: actual.nombre || actual.anio });
            }
          })
          .catch(err => {
            console.warn('No se pudo cargar el ciclo lectivo actual:', err);
          });
      }
    }
  }, [user?.rol, user?.token, ciclo]);

  useEffect(() => {
    if (ciclo) localStorage.setItem('cicloLectivo', JSON.stringify(ciclo));
    else localStorage.removeItem('cicloLectivo');
  }, [ciclo]);

  const value = useMemo(() => ({ cicloLectivo: ciclo, setCicloLectivo: setCiclo }), [ciclo]);

  return (
    <CicloLectivoContext.Provider value={value}>
      {children}
    </CicloLectivoContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCicloLectivo() {
  return useContext(CicloLectivoContext);
}
