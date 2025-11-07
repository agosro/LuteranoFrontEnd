import { httpClient } from './httpClient'
const BASE = '/api/calificaciones'

export async function crearCalificacion(token, payload) {
  void token
  return httpClient.post(`${BASE}/create`, payload)
}

export async function actualizarCalificacion(token, payload) {
  void token
  return httpClient.put(`${BASE}/update`, payload)
}

export async function listarCalifPorMateria(token, alumnoId, materiaId) {
  void token
  return httpClient.get(`${BASE}/alumno/${alumnoId}/materia/${materiaId}/all`)
}

export async function listarCalifPorAnioEtapa(token, alumnoId, anio, etapa) {
  void token
  const url = `${BASE}/alumno/${alumnoId}?anio=${encodeURIComponent(anio)}&etapa=${encodeURIComponent(etapa)}`
  return httpClient.get(url)
}

export async function eliminarCalificacion(token, alumnoId, materiaId, califId) {
  void token
  return httpClient.delete(`${BASE}/alumno/${alumnoId}/materia/${materiaId}/${califId}`)
}

export async function listarCalifPorAnio(token, alumnoId, anio) {
  void token
  const url = `${BASE}/alumno/${alumnoId}?anio=${encodeURIComponent(anio)}`
  return httpClient.get(url)
}
