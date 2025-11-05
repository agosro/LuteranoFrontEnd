// src/Services/MesaExamenDocenteService.js
const API_URL = 'http://localhost:8080';

const authJson = (token) => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`,
});

// GET /mesa-examen/{mesaExamenId}/docentes/disponibles
export const listarDocentesDisponibles = async (token, mesaId) => {
  const res = await fetch(`${API_URL}/mesa-examen/${mesaId}/docentes/disponibles`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok || (data && data.code < 0)) {
    throw new Error(data?.mensaje || 'Error al listar docentes disponibles');
  }
  // Tolerante al shape: devolver array de docentes simples {id, nombre, apellido}
  // Backend shape: DocentesDisponiblesResponse { docentes: DocenteDisponibleDto[] }
  // DocenteDisponibleDto: { docenteId, apellido, nombre, nombreCompleto, daLaMateria, nombreMateria, tieneConflictoHorario, detalleConflicto }
  const arr = Array.isArray(data?.docentes) ? data.docentes : (Array.isArray(data) ? data : []);
  return arr.map(d => ({
    id: Number(d.docenteId),
    docenteId: Number(d.docenteId),
    apellido: d.apellido,
    nombre: d.nombre,
    nombreCompleto: d.nombreCompleto,
    daLaMateria: !!d.daLaMateria,
    nombreMateria: d.nombreMateria,
    tieneConflictoHorario: !!d.tieneConflictoHorario,
    detalleConflicto: d.detalleConflicto,
  }));
};

// GET /mesa-examen/{mesaExamenId}/docentes
export const listarDocentesAsignados = async (token, mesaId) => {
  const res = await fetch(`${API_URL}/mesa-examen/${mesaId}/docentes`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok || (data && data.code < 0)) {
    throw new Error(data?.mensaje || 'Error al listar docentes asignados');
  }
  // Backend shape: MesaExamenDocentesResponse { docentes: MesaExamenDocenteDto[] }
  // MesaExamenDocenteDto: { id, docenteId, apellidoDocente, nombreDocente, nombreCompleto, esDocenteMateria }
  const arr = Array.isArray(data?.docentes) ? data.docentes : (Array.isArray(data) ? data : []);
  return arr.map(d => ({
    id: Number(d.docenteId),        // usamos docenteId como id lógico para el front
    docenteId: Number(d.docenteId),
    apellido: d.apellidoDocente,
    nombre: d.nombreDocente,
    nombreCompleto: d.nombreCompleto,
    esDocenteMateria: !!d.esDocenteMateria,
  }));
};

// POST /mesa-examen/{mesaExamenId}/docentes/asignar  Body: { docenteIds: number[] }
export const asignarDocentes = async (token, mesaId, docenteIds) => {
  const body = { docenteIds };
  const res = await fetch(`${API_URL}/mesa-examen/${mesaId}/docentes/asignar`, {
    method: 'POST',
    headers: authJson(token),
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok || (data && data.code < 0)) {
    throw new Error(data?.mensaje || 'Error al asignar docentes');
  }
  return data;
};

// PUT /mesa-examen/{mesaExamenId}/docentes/modificar?docenteActualId=&nuevoDocenteId=
export const modificarDocente = async (token, mesaId, docenteActualId, nuevoDocenteId) => {
  const params = new URLSearchParams({ docenteActualId: String(docenteActualId), nuevoDocenteId: String(nuevoDocenteId) });
  const res = await fetch(`${API_URL}/mesa-examen/${mesaId}/docentes/modificar?${params.toString()}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok || (data && data.code < 0)) {
    throw new Error(data?.mensaje || 'Error al modificar docente');
  }
  return data;
};
