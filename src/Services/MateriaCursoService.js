// src/Services/MateriaCursoService.js
import { httpClient } from './httpClient'

// Asignar materias a un curso
export const asignarMateriasACurso = async (token, cursoId, materiaIds) => {
  void token
  return httpClient.post(`/api/materiasCurso/asignarMaterias/${cursoId}`, materiaIds)
};

// Quitar materias de un curso
export const quitarMateriasDeCurso = async (token, cursoId, materiaIds) => {
  void token
  return httpClient.delete(`/api/materiasCurso/quitarMaterias/${cursoId}`, { body: materiaIds })
};

// Listar materias de un curso
export const listarMateriasDeCurso = async (token, cursoId) => {
  void token
  const data = await httpClient.get(`/api/materiasCurso/listarMateriasDeCurso/${cursoId}`)
  const lista = Array.isArray(data.materiaCursoDtoLis) ? data.materiaCursoDtoLis : []
  return lista.map(m => {
    const materiaId = m.materia?.id ?? null
    const materiaCursoId = m.id ?? m.materiaCursoId ?? null
    return {
      id: materiaId,
      materiaId,
      materiaCursoId,
      nombreMateria: m.materia?.nombreMateria || m.nombreMateria || 'Sin nombre',
      nivel: m.materia?.nivel || m.nivel || 'No especificado',
      docente: m.docente ? { id: m.docente.id, nombre: m.docente.nombre, apellido: m.docente.apellido } : null,
      cursoId: m.cursoId,
    }
  })
};

// Listar cursos de una materia
export const listarCursosDeMateria = async (token, materiaId) => {
  void token
  const data = await httpClient.get(`/api/materiasCurso/listarCursosDeMateria/${materiaId}`)
  const lista = Array.isArray(data.materiaCursoDtoLis) ? data.materiaCursoDtoLis : []
  return lista.map(mc => {
    const cursoId = mc.cursoId ?? mc.curso?.id ?? null
    const docentesArr = Array.isArray(mc.docentes) ? mc.docentes : (mc.docente ? [mc.docente] : [])
    const docente = docentesArr[0] || null
    return {
      ...mc,
      cursoId,
      docente,
      docentes: docentesArr.length ? docentesArr.map(d => ({ id: d.id, nombre: d.nombre, apellido: d.apellido })) : [],
    }
  })
};

// Asignar docente a una materia de un curso
export const asignarDocente = async (token, materiaId, cursoId, docenteId) => {
  void token
  return httpClient.post(`/api/materiasCurso/asignarDocente/${materiaId}/${cursoId}/${docenteId}`)
};

// Desasignar docente de una materia de un curso
export const desasignarDocente = async (token, materiaId, cursoId) => {
  void token
  return httpClient.post(`/api/materiasCurso/desasignarDocente/${materiaId}/${cursoId}`)
};