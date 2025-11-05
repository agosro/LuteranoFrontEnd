import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const CicloLectivoContext = createContext();

export function CicloLectivoProvider({ children }) {
  const [ciclo, setCiclo] = useState(() => {
    try {
      const raw = localStorage.getItem('cicloLectivo');
      return raw ? JSON.parse(raw) : null; // { id, nombre }
    } catch {
      return null;
    }
  });

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
