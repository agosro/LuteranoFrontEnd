const API_URL = "http://localhost:8080";

// Listar alumnos
export const listarAlumnos = async (token) => {
  try {
    const response = await fetch(`${API_URL}/alumno/list`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) throw new Error(data?.mensaje || `Error ${response.status}`);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error al listar alumnos:", error);
    throw error;
  }
};

// Crear alumno
export const crearAlumno = async (token, alumno) => {
  try {
    const response = await fetch(`${API_URL}/alumno/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(alumno),
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) throw new Error(data?.mensaje || `Error ${response.status}`);
    return data;
  } catch (error) {
    console.error("Error al crear alumno:", error);
    throw error;
  }
};

// Editar alumno
export const editarAlumno = async (token, alumno) => {
  try {
    const response = await fetch(`${API_URL}/alumno/update`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(alumno),
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) throw new Error(data?.mensaje || `Error ${response.status}`);
    return data;
  } catch (error) {
    console.error("Error al editar alumno:", error);
    throw error;
  }
};

// Eliminar alumno
export const eliminarAlumno = async (token, id) => {
  try {
    const response = await fetch(`${API_URL}/alumno/delete/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) throw new Error(data?.mensaje || `Error ${response.status}`);
    return data;
  } catch (error) {
    console.error("Error al eliminar alumno:", error);
    throw error;
  }
};

// Listar alumnos con filtros dinámicos
export const listarAlumnosConFiltros = async (token, filtros) => {
  try {
    // Limpio los filtros para sacar undefined, null y strings vacíos
    const filtrosLimpios = Object.fromEntries(
      Object.entries(filtros).filter(([, v]) => v !== undefined && v !== null && v !== "")
    );

    const response = await fetch(`${API_URL}/alumno/filtros`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(filtrosLimpios),
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) throw new Error(data?.mensaje || `Error ${response.status}`);
    return Array.isArray(data?.alumnoDtos) ? data.alumnoDtos : [];
  } catch (error) {
    console.error("Error al listar alumnos con filtros:", error);
    throw error;
  }
};

export const asignarCursoAlumno = async (token, request) => {
	try {
		const resp = await fetch(`${API_URL}/alumno/asignarCursoAlumno`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(request),
		});

		const text = await resp.text();
		const data = text ? JSON.parse(text) : null;

		if (!resp.ok) {
			const base = data?.mensaje || `Error ${resp.status}`;
			// Mensaje más claro para 403
			if (resp.status === 403) {
				throw new Error(`${base}: no autorizado para asignar curso (403)`);
			}
			throw new Error(base);
		}
		// Backend respondió AlumnoResponse
		return data; // { code, mensaje, alumnoDto? }
	} catch (error) {
		console.error('Error al asignar curso a alumno:', error);
		throw error;
	}
};