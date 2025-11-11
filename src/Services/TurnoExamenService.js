// src/Services/TurnoExamenService.js
import { httpClient } from './httpClient'

export const listarTurnos = async (token, anio) => {
  void token
  const url = anio ? `/turnos?anio=${anio}` : '/turnos'
  const data = await httpClient.get(url)
  const arr = Array.isArray(data.turnos) ? data.turnos : []
  return arr.map(t => ({
    id: t.id,
    nombre: t.nombre,
    anio: t.anio,
    fechaInicio: t.fechaInicio,
    fechaFin: t.fechaFin,
    activo: !!t.activo
  }))
}

export const crearTurno = async (token, payload) => {
  void token
  const data = await httpClient.post('/turnos', payload)
  if (data.code < 0) throw new Error(data.mensaje || 'Error al crear turno')
  return data.turno
}

export const actualizarTurno = async (token, id, payload) => {
  void token
  const data = await httpClient.put(`/turnos/${id}`, payload)
  if (data.code < 0) throw new Error(data.mensaje || 'Error al actualizar turno')
  return data.turno
}

export const eliminarTurno = async (token, id) => {
  void token
  const data = await httpClient.delete(`/turnos/${id}`)
  if (data.code < 0) throw new Error(data.mensaje || 'Error al eliminar turno')
  return true
}
