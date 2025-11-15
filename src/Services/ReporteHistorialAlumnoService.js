import { httpClient } from './httpClient'

const API_URL = '/reportes/historial-alumno'

export const obtenerHistorialCompleto = async (token, alumnoId) => {
  if (!alumnoId) throw new Error('Falta alumnoId')
  void token
  return httpClient.get(`${API_URL}/completo/${encodeURIComponent(alumnoId)}`)
}

export const obtenerHistorialPorCiclo = async (token, alumnoId, cicloLectivoId) => {
  if (!alumnoId) throw new Error('Falta alumnoId')
  if (!cicloLectivoId) throw new Error('Falta cicloLectivoId')
  void token
  return httpClient.get(`${API_URL}/ciclo/${encodeURIComponent(alumnoId)}/${encodeURIComponent(cicloLectivoId)}`)
}

export default { obtenerHistorialCompleto, obtenerHistorialPorCiclo }
