import { httpClient } from './httpClient'
const BASE = `/api/reporteLibres/libres`;

export const fetchAlumnosLibres = async (anio, cursoId = null, token) => {
  void token
  const params = new URLSearchParams({ anio });
  if (cursoId) params.append('cursoId', cursoId);
  const url = `${BASE}?${params.toString()}`
  const data = await httpClient.get(url)
  return data
};
