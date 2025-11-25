// src/Services/ElegibilidadMesaExamenService.js
import { httpClient } from './httpClient'

export const obtenerAlumnosElegibles = async (token, mesaId) => {
  void token
  const data = await httpClient.get(`/elegibilidad/mesa-examen/${mesaId}/alumnos`)
  if (data.code < 0) throw new Error(data.mensaje || 'Error al obtener alumnos elegibles')
  return Array.isArray(data.alumnos) ? data.alumnos : []
}
