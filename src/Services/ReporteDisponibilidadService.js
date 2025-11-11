import { httpClient } from './httpClient'
const API_URL = '/reporteDisponibilidad'

export const obtenerDisponibilidadDocente = async (token, docenteId) => {
  if (!docenteId) throw new Error('Falta docente')
  void token
  return httpClient.get(`${API_URL}/docentes/${encodeURIComponent(docenteId)}`)
};

export default { obtenerDisponibilidadDocente };
