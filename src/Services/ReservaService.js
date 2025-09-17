const API_URL = "http://localhost:8080";

// Listar reservas de un usuario (docente, preceptor, etc.)
export async function listarMisReservas(userId, token) {
  const res = await fetch(`${API_URL}/mis-reservas/${userId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error("Error al obtener reservas");
  return await res.json();
}

// Cancelar reserva por id
export async function cancelarReserva(id, token) {
  const res = await fetch(`${API_URL}/cancelar/${id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error("Error al cancelar la reserva");
  return await res.json();
}
