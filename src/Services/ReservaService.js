const API_URL = "http://localhost:8080";

// Crear/solicitar una reserva (docente autenticado)
export async function solicitarReserva(token, payload) {
  const res = await fetch(`${API_URL}/reservas/solicitar`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.code < 0) {
    throw new Error(data.mensaje || "Error al solicitar la reserva");
  }
  return data; // { reservaEspacioDto, code, mensaje }
}

// Cancelar reserva por id (docente dueño de la reserva)
export async function cancelarReserva(id, token) {
  const res = await fetch(`${API_URL}/reservas/${id}/cancelar`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.code < 0) {
    throw new Error(data.mensaje || "Error al cancelar la reserva");
  }
  return data;
}

// Listado general (admin/director/preceptor) o para filtros (opcional)
export async function listarReservas(token) {
  const res = await fetch(`${API_URL}/reservas/list-reservas`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.code < 0) {
    throw new Error(data.mensaje || "Error al obtener reservas");
  }
  return data; // { reservaEspacioDtos, code, mensaje }
}

// Listar reservas con filtros (según backend actual: GET con body)
export async function obtenerReservas(token, filtros = {}) {
  const res = await fetch(`${API_URL}/reservas/filtros`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(filtros),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.code < 0) {
    throw new Error(data.mensaje || "Error al obtener reservas");
  }
  return data; // { reservaEspacioDtos, code, mensaje }
}

// Aprobar una reserva (roles: ADMIN, DIRECTOR, PRECEPTOR)
export async function aprobarReserva(id, token) {
  const res = await fetch(`${API_URL}/reservas/${id}/aprobar`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.code < 0) {
    throw new Error(data.mensaje || "Error al aprobar la reserva");
  }
  return data; // { reservaEspacioDto, code, mensaje }
}

// Denegar una reserva con motivo (roles: ADMIN, DIRECTOR, PRECEPTOR)
export async function denegarReserva(id, motivo, token) {
  const res = await fetch(`${API_URL}/reservas/${id}/denegar`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ motivo }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.code < 0) {
    throw new Error(data.mensaje || "Error al denegar la reserva");
  }
  return data; // { reservaEspacioDto, code, mensaje }
}

