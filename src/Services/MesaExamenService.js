// src/Services/MesaExamenService.js
import { httpClient } from './httpClient'

export const crearMesa = async (token, payload) => {
  void token
  const data = await httpClient.post('/api/mesas', payload)
  if (data.code < 0) throw new Error(data.mensaje || 'Error al crear mesa')
  return data.mesa
};

export const actualizarMesa = async (token, payload) => {
  void token
  const data = await httpClient.put('/api/mesas', payload)
  if (data.code < 0) throw new Error(data.mensaje || 'Error al actualizar mesa')
  return data.mesa
};

export const eliminarMesa = async (token, id) => {
  void token
  const data = await httpClient.delete(`/api/mesas/${id}`)
  if (data.code < 0) throw new Error(data.mensaje || 'Error al eliminar mesa')
  return true
};

export const obtenerMesa = async (token, id) => {
  void token
  const data = await httpClient.get(`/api/mesas/${id}`)
  if (data.code < 0) throw new Error(data.mensaje || 'Error al obtener mesa')
  return data.mesa
};

export const listarMesasPorMateriaCurso = async (token, materiaCursoId) => {
  void token
  const data = await httpClient.get(`/api/mesas/materiaCurso/${materiaCursoId}`)
  if (data.code < 0) throw new Error(data.mensaje || 'Error al listar mesas')
  return Array.isArray(data.mesas) ? data.mesas : []
};

export const listarMesasPorCurso = async (token, cursoId, opts = {}) => {
  void token
  const params = new URLSearchParams();
  if (opts.anio) params.set('anio', String(opts.anio));
  if (opts.estado) params.set('estado', String(opts.estado));
  if (opts.materiaCursoId) params.set('materiaCursoId', String(opts.materiaCursoId));
  const qs = params.toString();
  const url = qs ? `/api/mesas/curso/${cursoId}?${qs}` : `/api/mesas/curso/${cursoId}`;
  const data = await httpClient.get(url)
  if (data.code < 0) throw new Error(data.mensaje || 'Error al listar mesas')
  return Array.isArray(data.mesas) ? data.mesas : []
};

export const agregarConvocados = async (token, mesaId, alumnoIds) => {
  void token
  const data = await httpClient.post(`/api/mesas/${mesaId}/convocados`, { alumnoIds })
  if (data.code < 0) throw new Error(data.mensaje || 'Error al agregar convocados')
  return data.mesa
};

export const quitarConvocado = async (token, mesaId, alumnoId) => {
  void token
  const data = await httpClient.delete(`/api/mesas/${mesaId}/convocados/${alumnoId}`)
  if (data.code < 0) throw new Error(data.mensaje || 'Error al quitar convocado')
  return data.mesa
};

export const cargarNotasFinales = async (token, mesaId, notasPorAlumno) => {
  void token
  const data = await httpClient.post(`/api/mesas/${mesaId}/notasFinales`, notasPorAlumno)
  if (data.code < 0) throw new Error(data.mensaje || 'Error al cargar notas')
  return data.mesa
};

export const finalizarMesa = async (token, mesaId) => {
  void token
  const data = await httpClient.post(`/api/mesas/${mesaId}/finalizar`)
  if (data.code < 0) throw new Error(data.mensaje || 'Error al finalizar mesa')
  return data.mesa
};
