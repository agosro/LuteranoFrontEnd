// src/Services/TurnoExamenService.js
const API_URL = 'http://localhost:8080';

export const listarTurnos = async (token, anio) => {
  const url = anio ? `${API_URL}/turnos?anio=${anio}` : `${API_URL}/turnos`;
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.mensaje || 'Error al listar turnos');
  const arr = Array.isArray(data.turnos) ? data.turnos : [];
  return arr.map(t => ({
    id: t.id,
    nombre: t.nombre,
    anio: t.anio,
    fechaInicio: t.fechaInicio,
    fechaFin: t.fechaFin,
    activo: !!t.activo
  }));
};

export const crearTurno = async (token, payload) => {
  const res = await fetch(`${API_URL}/turnos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok || data.code < 0) throw new Error(data.mensaje || 'Error al crear turno');
  return data.turno;
};

export const actualizarTurno = async (token, id, payload) => {
  const res = await fetch(`${API_URL}/turnos/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok || data.code < 0) throw new Error(data.mensaje || 'Error al actualizar turno');
  return data.turno;
};

export const eliminarTurno = async (token, id) => {
  const res = await fetch(`${API_URL}/turnos/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const data = await res.json();
  if (!res.ok || data.code < 0) throw new Error(data.mensaje || 'Error al eliminar turno');
  return true;
};
