const API_URL = 'http://localhost:8080';

export const obtenerHistorialActualAlumno = async (token, alumnoId) => {
	try {
		const resp = await fetch(`${API_URL}/historial-curso/alumno/${alumnoId}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		});

		const text = await resp.text();
		const data = text ? JSON.parse(text) : null;

		if (!resp.ok) throw new Error(data?.mensaje || `Error ${resp.status}`);
		// Backend respondió HistorialCursoResponse
		return data; // esperable: { code, mensaje, historialCursoDto }
	} catch (error) {
		console.error('Error al obtener historial actual del alumno:', error);
		throw error;
	}
};

export const listarHistorialAlumnoFiltrado = async (token, alumnoId, { cicloLectivoId, cursoId } = {}) => {
	try {
		const params = new URLSearchParams();
		if (cicloLectivoId) params.append('cicloLectivoId', cicloLectivoId);
		if (cursoId) params.append('cursoId', cursoId);
		const qs = params.toString();

		const url = `${API_URL}/historial-curso/alumno/${alumnoId}/historial-completo${qs ? `?${qs}` : ''}`;
		const resp = await fetch(url, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		});

		const text = await resp.text();
		const data = text ? JSON.parse(text) : null;

		if (!resp.ok) throw new Error(data?.mensaje || `Error ${resp.status}`);
		// Backend respondió HistorialCursoResponseList
		return data; // esperable: { code, mensaje, historialCursoDtos }
	} catch (error) {
		console.error('Error al listar historial del alumno:', error);
		throw error;
	}
};

