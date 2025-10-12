// src/Services/MateriaCursoService.js
const API_URL = "http://localhost:8080"; // Cambiá si usás otro host/puerto

// Asignar materias a un curso
export const asignarMateriasACurso = async (token, cursoId, materiaIds) => {
  try {
    const response = await fetch(`${API_URL}/materiasCurso/asignarMaterias/${cursoId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(materiaIds),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.mensaje || data.manesaje || "Error al asignar materias");
    return data;
  } catch (error) {
    console.error("Error en asignarMateriasACurso:", error);
    throw error;
  }
};

// Quitar materias de un curso
export const quitarMateriasDeCurso = async (token, cursoId, materiaIds) => {
  try {
    const response = await fetch(`${API_URL}/materiasCurso/quitarMaterias/${cursoId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(materiaIds),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.mensaje || "Error al quitar materias");
    return data;
  } catch (error) {
    console.error("Error en quitarMateriasDeCurso:", error);
    throw error;
  }
};

// Listar materias de un curso
export const listarMateriasDeCurso = async (token, cursoId) => {
  try {
    const response = await fetch(
      `${API_URL}/materiasCurso/listarMateriasDeCurso/${cursoId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok)
      throw new Error(data.mensaje || "Error al listar materias de curso");

    const lista = Array.isArray(data.materiaCursoDtoLis)
      ? data.materiaCursoDtoLis
      : [];

    // 🧠 Normalizar: exponer siempre ambos IDs (materiaId y materiaCursoId) pero el front SOLO usará materiaId para horarios.
    // Mantenemos un alias id (igual a materiaId) para no romper componentes antiguos.
    return lista.map((m) => {
      const materiaId = m.materia?.id ?? null;
      const materiaCursoId = m.id ?? m.materiaCursoId ?? null;
      return {
        id: materiaId, // alias legacy
        materiaId,
        materiaCursoId,
        nombreMateria: m.materia?.nombreMateria || m.nombreMateria || "Sin nombre",
        nivel: m.materia?.nivel || m.nivel || "No especificado",
        docente: m.docente
          ? {
              id: m.docente.id,
              nombre: m.docente.nombre,
              apellido: m.docente.apellido,
            }
          : null,
        cursoId: m.cursoId,
      };
    });
  } catch (error) {
    console.error("Error en listarMateriasDeCurso:", error);
    throw error;
  }
};

// Listar cursos de una materia
export const listarCursosDeMateria = async (token, materiaId) => {
  try {
    const response = await fetch(`${API_URL}/materiasCurso/listarCursosDeMateria/${materiaId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.mensaje || "Error al listar cursos de materia");

    const lista = Array.isArray(data.materiaCursoDtoLis)
      ? data.materiaCursoDtoLis
      : [];

    // Normalizar forma de salida para el front
    // Queremos asegurar: cursoId y (docente | docentes[])
    return lista.map((mc) => {
      const cursoId = mc.cursoId ?? mc.curso?.id ?? null;
      // Algunos backends devuelven 'docente', otros 'docentes' (array)
      const docentesArr = Array.isArray(mc.docentes) ? mc.docentes : (mc.docente ? [mc.docente] : []);
      const docente = docentesArr[0] || null; // compatibilidad con código existente

      return {
        ...mc,
        cursoId,
        docente,
        docentes: docentesArr.length ? docentesArr.map(d => ({ id: d.id, nombre: d.nombre, apellido: d.apellido })) : [],
      };
    });
  } catch (error) {
    console.error("Error en listarCursosDeMateria:", error);
    throw error;
  }
};

// Asignar docente a una materia de un curso
export const asignarDocente = async (token, materiaId, cursoId, docenteId) => {
  try {
    const response = await fetch(
      `${API_URL}/materiasCurso/asignarDocente/${materiaId}/${cursoId}/${docenteId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();
    if (!response.ok) throw new Error(data.mensaje || data.manesaje || "Error al asignar docente");
    return data;
  } catch (error) {
    console.error("Error en asignarDocente:", error);
    throw error;
  }
};

// Desasignar docente de una materia de un curso
export const desasignarDocente = async (token, materiaId, cursoId) => {
  try {
    const response = await fetch(
      `${API_URL}/materiasCurso/desasignarDocente/${materiaId}/${cursoId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();
    if (!response.ok) throw new Error(data.mensaje || data.manesaje || "Error al desasignar docente");
    return data;
  } catch (error) {
    console.error("Error en desasignarDocente:", error);
    throw error;
  }
};