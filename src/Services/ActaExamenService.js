// src/Services/ActaExamenService.js
import { httpClient } from './httpClient'

const parseActa = (data) => {
  // Tolerante al shape: intenta encontrar el objeto de acta
  const acta = data?.acta || data?.data || data?.resultado || data;
  return acta;
};

export const generarActa = async (token, payload) => {
  void token
  const data = await httpClient.post('/actas/generar', payload)
  if (data.code < 0) throw new Error(data.mensaje || 'Error al generar acta')
  return parseActa(data)
};

export const actualizarActa = async (token, payload) => {
  void token
  const data = await httpClient.put('/actas', payload)
  if (data.code < 0) throw new Error(data.mensaje || 'Error al actualizar acta')
  return parseActa(data)
};

export const eliminarActa = async (token, id) => {
  void token
  const data = await httpClient.delete(`/actas/${id}`)
  if (data.code < 0) throw new Error(data.mensaje || 'Error al eliminar acta')
  return true
};

export const obtenerActaPorId = async (token, id) => {
  void token
  const data = await httpClient.get(`/actas/${id}`)
  if (data.code < 0) throw new Error(data.mensaje || 'Error al obtener acta')
  return parseActa(data)
};

export const obtenerActaPorMesa = async (token, mesaId) => {
  void token
  const data = await httpClient.get(`/actas/mesa/${mesaId}`)
  if (data.code < 0) throw new Error(data.mensaje || 'Acta no encontrada')
  return parseActa(data)
};

export const buscarActas = async (token, q) => {
  void token
  const data = await httpClient.get(`/actas/buscar?q=${encodeURIComponent(q)}`)
  if (data.code < 0) throw new Error(data.mensaje || 'Error en la búsqueda')
  return Array.isArray(data.actas) ? data.actas : (Array.isArray(data.lista) ? data.lista : [])
};

export const listarActasPorTurno = async (token, turnoId) => {
  void token
  const data = await httpClient.get(`/actas/turno/${turnoId}`)
  if (data.code < 0) throw new Error(data.mensaje || 'Error al listar por turno')
  return Array.isArray(data.actas) ? data.actas : []
};

export const listarActasPorCurso = async (token, cursoId) => {
  void token
  const data = await httpClient.get(`/actas/curso/${cursoId}`)
  if (data.code < 0) throw new Error(data.mensaje || 'Error al listar por curso')
  return Array.isArray(data.actas) ? data.actas : []
};

export const listarActasEntreFechas = async (token, desde, hasta) => {
  void token
  const params = new URLSearchParams({ desde, hasta }).toString()
  const data = await httpClient.get(`/actas/entre-fechas?${params}`)
  if (data.code < 0) throw new Error(data.mensaje || 'Error al listar entre fechas')
  return Array.isArray(data.actas) ? data.actas : []
};
