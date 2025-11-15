import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../Context/AuthContext';
import { useCicloLectivo } from '../Context/CicloLectivoContext.jsx';
import Breadcrumbs from '../Components/Botones/Breadcrumbs';
import BackButton from '../Components/Botones/BackButton';
import { listarCursos, listarCursosPorPreceptor } from '../Services/CursoService';
import { listarAlumnosPorCurso } from '../Services/HistorialCursoService';
import {
	listarAsistenciaCursoPorFecha,
	registrarAsistenciaCurso,
	actualizarAsistenciaAlumno,
} from '../Services/AsistenciaAlumnoService';
import { toast } from 'react-toastify';
import FiltrosAsistencia from '../Components/Asistencia/FiltrosAsistencia';
import TablaAsistencia from '../Components/Asistencia/TablaAsistencia';
import ModalEditarAsistencia from '../Components/Asistencia/ModalEditarAsistencia';
import ConfirmarAccion from '../Components/Modals/ConfirmarAccion';


export default function AsistenciaAlumnos() {
	const { user } = useAuth();
	const { cicloLectivo } = useCicloLectivo();
	const token = user?.token;

	// Si el user tiene preceptorId, listar solo sus cursos; si es admin, todos
	const preceptorId = user?.preceptorId || null;

	const [cursos, setCursos] = useState([]);
	const [cursoId, setCursoId] = useState('');
	const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));

	const [alumnos, setAlumnos] = useState([]); // lista base de alumnos del curso
	const [asistencia, setAsistencia] = useState({}); // estado actual del día: { [alumnoId]: { estado, observacion } }
	const [presentes, setPresentes] = useState(new Set()); // ids marcados como presente para el guardado masivo
	const [modalEdit, setModalEdit] = useState({ open: false, alumno: null, estado: 'TARDE', observacion: '' });
	const [cargando, setCargando] = useState(false);
	const [confirmarGuardar, setConfirmarGuardar] = useState({ open: false, mensaje: '' });

	// Cargar cursos
	useEffect(() => {
		if (!token) return;
		(async () => {
			try {
				setCargando(true);
				let cursosData = [];
				if (preceptorId) {
					cursosData = await listarCursosPorPreceptor(token, preceptorId);
				} else {
					cursosData = await listarCursos(token);
				}
				const opts = (cursosData || []).map((c) => ({
					value: c.id,
					label: `${c.anio || ''} ${c.division || ''}`.trim(),
				}));
				setCursos(opts);
			} catch (e) {
				toast.error(e.message || 'Error al cargar cursos');
			} finally {
				setCargando(false);
			}
		})();
	}, [token, preceptorId]);

	// Al seleccionar curso o cambiar fecha, cargar alumnos + asistencia del día
		useEffect(() => {
			if (!token || !cursoId || !fecha) return;
			if (!cicloLectivo?.id) {
				setAlumnos([]);
				setAsistencia({});
				setPresentes(new Set());
				return;
			}
		(async () => {
			try {
				setCargando(true);
				// 1) alumnos del curso (historial vigente)
					const alumnosCurso = await listarAlumnosPorCurso(token, Number(cursoId), Number(cicloLectivo.id));
				const alumnosOrdenados = [...alumnosCurso].sort((a, b) => (a.apellido || '').localeCompare(b.apellido || ''));
				setAlumnos(alumnosOrdenados);

		// 2) asistencia existente
			const items = await listarAsistenciaCursoPorFecha(token, Number(cursoId), fecha, Number(cicloLectivo.id));
				// Mapear a { alumnoId: { estado, observacion } }
				const map = {};
				for (const it of items) {
					if (it.alumnoId) {
						map[it.alumnoId] = { estado: it.estado || '', observacion: it.observacion || '' };
					}
				}
				setAsistencia(map);
				// pre-chequear presentes actuales
				// TARDE también se considera presente
				const presentesSet = new Set(
					items
						.filter((x) => x.estado === 'PRESENTE' || x.estado === 'TARDE')
						.map((x) => x.alumnoId)
				);
				setPresentes(presentesSet);
			} catch (e) {
				toast.error(e.message || 'Error al cargar asistencia');
			} finally {
				setCargando(false);
			}
			})();
		}, [token, cursoId, fecha, cicloLectivo?.id]);

	// Checkbox presente
	const handleTogglePresente = (alumnoId) => {
		setPresentes((prev) => {
			const nuevo = new Set(prev);
			if (nuevo.has(alumnoId)) nuevo.delete(alumnoId); else nuevo.add(alumnoId);
			return nuevo;
		});
	};

	// Abrir modal de edición puntual (Presente/Tarde/Justificado + observación)
	const abrirModalEditar = (alumno) => {
		const actual = asistencia[alumno.id] || { estado: '', observacion: '' };
		// Si tiene estado válido, usarlo; si no, por defecto PRESENTE
		const estadoInicial = actual.estado && ['PRESENTE', 'TARDE', 'JUSTIFICADO'].includes(actual.estado) 
			? actual.estado 
			: 'PRESENTE';
		setModalEdit({
			open: true,
			alumno: { ...alumno, tipo: 'Alumno' },
			estado: estadoInicial,
			observacion: actual.observacion || '',
		});
	};
	const cerrarModalEditar = () => setModalEdit({ open: false, alumno: null, estado: 'TARDE', observacion: '' });

	const guardarEdicionModal = async () => {
		if (!modalEdit.alumno) return;
		try {
			setCargando(true);
			const resp = await actualizarAsistenciaAlumno(token, {
				alumnoId: Number(modalEdit.alumno.id),
				fecha,
				estado: modalEdit.estado,
				observacion: modalEdit.observacion || '',
			});
			if (resp?.code && resp.code < 0) throw new Error(resp.mensaje || 'Error al actualizar');
			// Actualizar en memoria
			setAsistencia((prev) => ({
				...prev,
				[modalEdit.alumno.id]: { estado: modalEdit.estado, observacion: modalEdit.observacion || '' },
			}));
			// Sincronizar checkbox: PRESENTE o TARDE => marcar presente, JUSTIFICADO => no presente
			setPresentes((prev) => {
				const nuevo = new Set(prev);
				if (modalEdit.estado === 'PRESENTE' || modalEdit.estado === 'TARDE') {
					nuevo.add(modalEdit.alumno.id);
				} else if (modalEdit.estado === 'JUSTIFICADO') {
					nuevo.delete(modalEdit.alumno.id);
				}
				return nuevo;
			});
			toast.success('Edición guardada');
			cerrarModalEditar();
		} catch (e) {
			toast.error(e.message || 'No se pudo actualizar');
		} finally {
			setCargando(false);
		}
	};

	// Guardado masivo usando el endpoint /asistencia/alumnos/curso
	const handleGuardarMasivo = async () => {
		if (!token || !cursoId || !fecha) return;

		// Política: solo se marcan PRESENTES; el resto queda AUSENTE automáticamente
		const presentesIds = Array.from(presentes);
		// Preservar estados puntuales TARDE y JUSTIFICADO como overrides
		const overrides = {};
		for (const al of alumnos) {
			const est = asistencia[al.id]?.estado;
			if (est === 'TARDE' || est === 'JUSTIFICADO') {
				overrides[al.id] = est;
			}
		}

		// Confirmación: si no hay ningún estado seleccionado, se marcarán todos AUSENTES
		const totalSeleccionados = presentesIds.length + Object.keys(overrides).length;
		if (totalSeleccionados === 0) {
			setConfirmarGuardar({
				open: true,
				mensaje: 'No seleccionaste ningún estado. Se marcarán todos los alumnos como AUSENTE. ¿Deseás continuar?',
			});
			return;
		}

		await ejecutarGuardoMasivo(presentesIds, overrides);
	};

	const ejecutarGuardoMasivo = async (presentesIds, overrides) => {
		try {
			setCargando(true);
			const payload = {
				cursoId: Number(cursoId),
				fecha,
				presentesIds,
				overridesPorAlumnoId: overrides,
			};

			const resp = await registrarAsistenciaCurso(token, { ...payload, cicloLectivoId: Number(cicloLectivo.id) });
			if (resp?.code && resp.code < 0) throw new Error(resp.mensaje || 'Error al registrar asistencia');
			toast.success('Asistencia guardada');
			// refrescar estados actuales
			const items = await listarAsistenciaCursoPorFecha(token, Number(cursoId), fecha, Number(cicloLectivo.id));
			const map = {};
			for (const it of items) {
				if (it.alumnoId) map[it.alumnoId] = { estado: it.estado || '', observacion: it.observacion || '' };
			}
			setAsistencia(map);
		} catch (e) {
			toast.error(e.message || 'No se pudo guardar asistencia');
		} finally {
			setCargando(false);
		}
	};

	// Acciones rápidas sobre la selección
	const marcarTodosPresentes = () => {
		if (!alumnos.length) return;
		setPresentes(new Set(alumnos.map((a) => a.id)));
	};
	const limpiarSeleccion = () => {
		setPresentes(new Set());
	};

	const cursoOptions = useMemo(() => cursos, [cursos]);



		// Contadores
		const contadores = useMemo(() => {
			const counts = {
				PRESENTE: 0,
				AUSENTE: 0,
				TARDE: 0,
				JUSTIFICADO: 0,
				SIN_SELECCION: 0,
				TOTAL: alumnos.length,
				PRESENTE_INCLUYE_TARDE: 0,
			};
			for (const al of alumnos) {
				const est = asistencia[al.id]?.estado || '';
				if (!est) counts.SIN_SELECCION += 1;
				else if (counts[est] !== undefined) counts[est] += 1;
				if (est === 'PRESENTE' || est === 'TARDE') counts.PRESENTE_INCLUYE_TARDE += 1;
			}
			return counts;
		}, [alumnos, asistencia]);

	return (
			<div className="container py-3">
				<Breadcrumbs />
				<div className="mb-2">
					<BackButton />
				</div>
				<div className="d-flex align-items-center justify-content-center mb-3">
					<h2 className="m-0 text-center">Asistencia de Alumnos</h2>
				</div>
				<p className="text-center text-muted mb-4">
					Registrá la asistencia diaria de los alumnos del curso seleccionado. Los presentes, ausentes, tarde y justificados se guardarán para la fecha elegida.
				</p>

				{/* Filtros */}
				<FiltrosAsistencia
					cursos={cursoOptions}
					cursoId={cursoId}
					setCursoId={setCursoId}
					fecha={fecha}
					setFecha={setFecha}
					onMarcarTodosPresentes={() => marcarTodosPresentes()}
					onLimpiarSeleccion={() => limpiarSeleccion()}
					disableAcciones={!alumnos.length}
				/>

				{/* Contadores */}
				<div className="row g-2 mb-3">
					<div className="col-auto"><span className="badge text-bg-secondary">Total: {contadores.TOTAL}</span></div>
					<div className="col-auto"><span className="badge text-bg-success">Presentes: {contadores.PRESENTE}</span></div>
					<div className="col-auto"><span className="badge text-bg-success">Presentes (incluye TARDE): {contadores.PRESENTE_INCLUYE_TARDE}</span></div>
					<div className="col-auto"><span className="badge text-bg-danger">Ausentes: {contadores.AUSENTE}</span></div>
					<div className="col-auto"><span className="badge text-bg-warning text-dark">Tarde: {contadores.TARDE}</span></div>
					<div className="col-auto"><span className="badge text-bg-primary">Justificados: {contadores.JUSTIFICADO}</span></div>
					<div className="col-auto"><span className="badge text-bg-light text-dark">Sin selección: {contadores.SIN_SELECCION}</span></div>
				</div>

				{/* Tabla y acción principal */}
				<div className="card">
					<div className="card-header d-flex justify-content-between align-items-center">
						<strong>Listado de alumnos</strong>
						<button className="btn btn-primary" onClick={handleGuardarMasivo} disabled={!cursoId || !fecha || cargando}>
							{cargando ? (
								<>
									<span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
									Guardando...
								</>
							) : (
								'Guardar asistencia del curso'
							)}
						</button>
					</div>
					<div className="card-body p-0">
						<TablaAsistencia
							personas={alumnos.map((a) => ({ id: a.id, dni: a.dni, nombre: `${a.apellido ?? ''} ${a.nombre ?? ''}`.trim(), apellido: a.apellido, tipo: 'Alumno' }))}
							asistenciaPorId={asistencia}
							presentes={presentes}
							onTogglePresente={(id) => handleTogglePresente(id)}
							onClickEditar={(p) => abrirModalEditar(p)}
							disabled={cargando}
						/>
					</div>
				</div>

				<ModalEditarAsistencia
					open={modalEdit.open}
					persona={modalEdit.alumno}
					estado={modalEdit.estado}
					observacion={modalEdit.observacion}
					setEstado={(v) => setModalEdit((m) => ({ ...m, estado: v }))}
					setObservacion={(v) => setModalEdit((m) => ({ ...m, observacion: v }))}
					onClose={cerrarModalEditar}
					onSave={guardarEdicionModal}
					cargando={cargando}
				/>

				<ConfirmarAccion
					show={confirmarGuardar.open}
					title="Confirmar guardado sin asistencias"
					message={confirmarGuardar.mensaje}
					confirmText="Guardar de todas formas"
					cancelText="Cancelar"
					confirmBtnClass="btn-warning"
					onConfirm={async () => {
						const presentesIds = Array.from(presentes);
						const overrides = {};
						for (const al of alumnos) {
							const est = asistencia[al.id]?.estado;
							if (est === 'TARDE' || est === 'JUSTIFICADO') {
								overrides[al.id] = est;
							}
						}
						setConfirmarGuardar({ open: false, mensaje: '' });
						await ejecutarGuardoMasivo(presentesIds, overrides);
					}}
					onClose={() => setConfirmarGuardar({ open: false, mensaje: '' })}
					loading={cargando}
				/>

				{/* Aclaración */}
				<div className="mt-2 text-muted">
					⚠️ Los alumnos sin estado se guardarán como Ausentes.
				</div>
		</div>
	);
}
