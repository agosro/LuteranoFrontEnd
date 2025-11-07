// src/Services/MesaExamenDocenteService.js
import { httpClient } from './httpClient'

// GET /mesa-examen/{mesaExamenId}/docentes/disponibles
export const listarDocentesDisponibles = async (token, mesaId) => {
  void token
  const data = await httpClient.get(`/api/mesa-examen/${mesaId}/docentes/disponibles`)
  if (data && data.code < 0) throw new Error(data.mensaje || 'Error al listar docentes disponibles')
  const arr = Array.isArray(data?.docentes) ? data.docentes : (Array.isArray(data) ? data : [])
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
  }))
};

// GET /mesa-examen/{mesaExamenId}/docentes
export const listarDocentesAsignados = async (token, mesaId) => {
  void token
  const data = await httpClient.get(`/api/mesa-examen/${mesaId}/docentes`)
  if (data && data.code < 0) throw new Error(data.mensaje || 'Error al listar docentes asignados')
  const arr = Array.isArray(data?.docentes) ? data.docentes : (Array.isArray(data) ? data : [])
  return arr.map(d => ({
    id: Number(d.docenteId),
    docenteId: Number(d.docenteId),
    apellido: d.apellidoDocente,
    nombre: d.nombreDocente,
    nombreCompleto: d.nombreCompleto,
    esDocenteMateria: !!d.esDocenteMateria,
  }))
};

// POST /mesa-examen/{mesaExamenId}/docentes/asignar  Body: { docenteIds: number[] }
export const asignarDocentes = async (token, mesaId, docenteIds) => {
  void token
  const data = await httpClient.post(`/api/mesa-examen/${mesaId}/docentes/asignar`, { docenteIds })
  if (data && data.code < 0) throw new Error(data.mensaje || 'Error al asignar docentes')
  return data
};

// PUT /mesa-examen/{mesaExamenId}/docentes/modificar?docenteActualId=&nuevoDocenteId=
export const modificarDocente = async (token, mesaId, docenteActualId, nuevoDocenteId) => {
  const params = new URLSearchParams({ docenteActualId: String(docenteActualId), nuevoDocenteId: String(nuevoDocenteId) })
  void token
  const data = await httpClient.put(`/api/mesa-examen/${mesaId}/docentes/modificar?${params.toString()}`)
  if (data && data.code < 0) throw new Error(data.mensaje || 'Error al modificar docente')
  return data
};
