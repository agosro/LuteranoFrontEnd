import { httpClient } from './httpClient'

// Crear/solicitar una reserva (docente autenticado)
export async function solicitarReserva(token, payload) {
  void token
  const data = await httpClient.post('/reservas/solicitar', payload)
  if (data.code < 0) throw new Error(data.mensaje || 'Error al solicitar la reserva')
  return data
}

// Cancelar reserva por id (docente dueño de la reserva)
export async function cancelarReserva(id, token) {
  void token
  const data = await httpClient.request(`/reservas/${id}/cancelar`, { method: 'PATCH' })
  if (data.code < 0) throw new Error(data.mensaje || 'Error al cancelar la reserva')
  return data
}

// Listado general (admin/director/preceptor) o para filtros (opcional)
export async function listarReservas(token) {
  void token
  const data = await httpClient.get('/reservas/list-reservas')
  if (data.code < 0) throw new Error(data.mensaje || 'Error al obtener reservas')
  return data
}

// Listar reservas con filtros
// NOTA: El backend usa GET con @RequestBody (no es estándar REST)
// Convertimos los filtros a query params para evitar el error de fetch
export async function obtenerReservas(token, filtros = {}) {
  void token
  
  // Construir body con solo los filtros que tienen valor
  const body = {};
  
  if (filtros.usuarioId) body.usuarioId = filtros.usuarioId;
  if (filtros.cursoId) body.cursoId = filtros.cursoId;
  if (filtros.espacioAulicoId) body.espacioAulicoId = filtros.espacioAulicoId;
  if (filtros.estado) body.estado = filtros.estado;
  if (filtros.fecha) body.fecha = filtros.fecha;
  if (filtros.moduloId) body.moduloId = filtros.moduloId;
  
  const data = await httpClient.post('/reservas/filtros', body);
  if (data.code < 0) throw new Error(data.mensaje || 'Error al obtener reservas');
  return data;
}

// Aprobar una reserva (roles: ADMIN, DIRECTOR, PRECEPTOR)
export async function aprobarReserva(id, token) {
  void token
  const data = await httpClient.request(`/reservas/${id}/aprobar`, { method: 'PATCH' })
  if (data.code < 0) throw new Error(data.mensaje || 'Error al aprobar la reserva')
  return data
}

// Denegar una reserva con motivo (roles: ADMIN, DIRECTOR, PRECEPTOR)
export async function denegarReserva(id, motivo, token) {
  void token
  const data = await httpClient.request(`/reservas/${id}/denegar`, { method: 'PATCH', body: { motivo } })
  if (data.code < 0) throw new Error(data.mensaje || 'Error al denegar la reserva')
  return data
}

