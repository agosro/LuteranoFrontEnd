import { httpClient } from './httpClient'

// Crear/solicitar una reserva (docente autenticado)
export async function solicitarReserva(token, payload) {
  void token
  const data = await httpClient.post('/api/reservas/solicitar', payload)
  if (data.code < 0) throw new Error(data.mensaje || 'Error al solicitar la reserva')
  return data
}

// Cancelar reserva por id (docente dueño de la reserva)
export async function cancelarReserva(id, token) {
  void token
  const data = await httpClient.request(`/api/reservas/${id}/cancelar`, { method: 'PATCH' })
  if (data.code < 0) throw new Error(data.mensaje || 'Error al cancelar la reserva')
  return data
}

// Listado general (admin/director/preceptor) o para filtros (opcional)
export async function listarReservas(token) {
  void token
  const data = await httpClient.get('/api/reservas/list-reservas')
  if (data.code < 0) throw new Error(data.mensaje || 'Error al obtener reservas')
  return data
}

// Listar reservas con filtros (según backend actual: GET con body)
export async function obtenerReservas(token, filtros = {}) {
  void token
  // Mantiene método GET con body según backend actual
  const data = await httpClient.request('/api/reservas/filtros', { method: 'GET', body: filtros })
  if (data.code < 0) throw new Error(data.mensaje || 'Error al obtener reservas')
  return data
}

// Aprobar una reserva (roles: ADMIN, DIRECTOR, PRECEPTOR)
export async function aprobarReserva(id, token) {
  void token
  const data = await httpClient.request(`/api/reservas/${id}/aprobar`, { method: 'PATCH' })
  if (data.code < 0) throw new Error(data.mensaje || 'Error al aprobar la reserva')
  return data
}

// Denegar una reserva con motivo (roles: ADMIN, DIRECTOR, PRECEPTOR)
export async function denegarReserva(id, motivo, token) {
  void token
  const data = await httpClient.request(`/api/reservas/${id}/denegar`, { method: 'PATCH', body: { motivo } })
  if (data.code < 0) throw new Error(data.mensaje || 'Error al denegar la reserva')
  return data
}

