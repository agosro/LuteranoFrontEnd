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

