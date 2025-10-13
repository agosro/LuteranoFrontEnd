import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../Context/AuthContext';
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

// Campo de formulario Bootstrap
function FormGroupSelect({ label, value, onChange, options, placeholder = 'Seleccione...' }) {
	const id = `select-${label?.toLowerCase()?.replace(/\s+/g, '-') || 'field'}`;
	return (
		<div className="mb-3">
			{label && <label className="form-label" htmlFor={id}>{label}</label>}
			<select id={id} className="form-select" value={value || ''} onChange={(e) => onChange(e.target.value)}>
				<option value="">{placeholder}</option>
				{options.map((opt) => (
					<option key={opt.value} value={opt.value}>
						{opt.label}
					</option>
				))}
			</select>
		</div>
	);
}

// Fila de alumno con selector de estado y observación
function FilaAlumno({
	alumno,
	presenteMarcado,
	estadoActual,
	observacionActual,
	onTogglePresente,
	onEditar,
	disabled,
}) {
	const nombre = `${alumno.apellido ?? ''} ${alumno.nombre ?? ''}`.trim();

	const badgeClass = (estado) => {
		switch (estado) {
			case 'PRESENTE':
				return 'badge text-bg-success';
			case 'AUSENTE':
				return 'badge text-bg-secondary';
			case 'TARDE':
				return 'badge text-bg-warning text-dark';
			case 'JUSTIFICADO':
				return 'badge text-bg-info text-dark';
			default:
				return 'badge text-bg-light text-dark';
		}
	};

	return (
		<tr>
			<td className="py-2">{alumno.dni || '-'}</td>
			<td className="py-2">{nombre}</td>
			<td className="py-2 text-center">
				<input
					className="form-check-input"
					type="checkbox"
					checked={!!presenteMarcado}
					onChange={onTogglePresente}
				/>
			</td>
			<td className="py-2">
				<span className={badgeClass(estadoActual)}>{estadoActual || '—'}</span>
			</td>
			<td className="py-2" style={{ minWidth: 240 }}>
				{observacionActual ? (
					<span
						title={observacionActual}
						style={{ maxWidth: 320, display: 'inline-block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
					>
						{observacionActual}
					</span>
				) : (
					<span className="text-muted">—</span>
				)}
			</td>
			<td className="py-2">
				<button className="btn btn-sm btn-outline-secondary" onClick={onEditar} disabled={disabled}>
					Editar
				</button>
			</td>
		</tr>
	);
}

export default function AsistenciaAlumnos() {
	const { user } = useAuth();
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
		(async () => {
			try {
				setCargando(true);
				// 1) alumnos del curso (historial vigente)
				const alumnosCurso = await listarAlumnosPorCurso(token, Number(cursoId));
				const alumnosOrdenados = [...alumnosCurso].sort((a, b) => (a.apellido || '').localeCompare(b.apellido || ''));
				setAlumnos(alumnosOrdenados);

				// 2) asistencia existente
				const items = await listarAsistenciaCursoPorFecha(token, Number(cursoId), fecha);
				// Mapear a { alumnoId: { estado, observacion } }
				const map = {};
				for (const it of items) {
					if (it.alumnoId) {
						map[it.alumnoId] = { estado: it.estado || '', observacion: it.observacion || '' };
					}
				}
				setAsistencia(map);
				// pre-chequear presentes actuales
				const presentesSet = new Set(items.filter((x) => x.estado === 'PRESENTE').map((x) => x.alumnoId));
				setPresentes(presentesSet);
			} catch (e) {
				toast.error(e.message || 'Error al cargar asistencia');
			} finally {
				setCargando(false);
			}
		})();
	}, [token, cursoId, fecha]);

	// Checkbox presente
	const handleTogglePresente = (alumnoId) => {
		setPresentes((prev) => {
			const nuevo = new Set(prev);
			if (nuevo.has(alumnoId)) nuevo.delete(alumnoId); else nuevo.add(alumnoId);
			return nuevo;
		});
	};

	// Abrir modal de edición puntual (Tarde/Justificado + observación)
	const abrirModalEditar = (alumno) => {
		const actual = asistencia[alumno.id] || { estado: '', observacion: '' };
		setModalEdit({
			open: true,
			alumno,
			estado: actual.estado === 'TARDE' || actual.estado === 'JUSTIFICADO' ? actual.estado : 'TARDE',
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
			try {
			setCargando(true);

			// Política: solo se marcan PRESENTES; el resto queda AUSENTE automáticamente
			const presentesIds = Array.from(presentes);
			const overrides = {}; // sin overrides en toma rápida

				// Confirmación: si no hay ningún estado seleccionado, se marcarán todos AUSENTES
				const totalSeleccionados = presentesIds.length + Object.keys(overrides).length;
				if (totalSeleccionados === 0) {
					const confirmar = window.confirm('No seleccionaste ningún estado. Se marcarán todos como AUSENTE. ¿Deseás continuar?');
					if (!confirmar) {
						setCargando(false);
						return;
					}
				}

			const payload = {
				cursoId: Number(cursoId),
				fecha,
				presentesIds,
				overridesPorAlumnoId: overrides,
			};

			const resp = await registrarAsistenciaCurso(token, payload);
			if (resp?.code && resp.code < 0) throw new Error(resp.mensaje || 'Error al registrar asistencia');
			toast.success('Asistencia guardada');
			// refrescar estados actuales
			const items = await listarAsistenciaCursoPorFecha(token, Number(cursoId), fecha);
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
			};
			for (const al of alumnos) {
				const est = asistencia[al.id]?.estado || '';
				if (!est) counts.SIN_SELECCION += 1;
				else if (counts[est] !== undefined) counts[est] += 1;
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

				{/* Filtros */}
				<div className="card mb-3">
					<div className="card-body">
						<div className="row g-3 align-items-end">
							<div className="col-sm-4">
								<FormGroupSelect
									label="Curso"
									value={cursoId}
									onChange={setCursoId}
									options={cursoOptions}
									placeholder="Seleccione un curso"
								/>
							</div>
							<div className="col-sm-3">
								<div className="mb-3">
									<label className="form-label">Fecha</label>
									<input type="date" className="form-control" value={fecha} onChange={(e) => setFecha(e.target.value)} />
								</div>
							</div>
							<div className="col-sm-5">
								<div className="d-flex gap-2 justify-content-sm-end align-items-end flex-wrap">
									<button className="btn btn-outline-success" onClick={marcarTodosPresentes} disabled={!alumnos.length}>
										Marcar todos PRESENTES
									</button>
									<button className="btn btn-outline-secondary" onClick={limpiarSeleccion} disabled={!alumnos.length}>
										Limpiar selección
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Contadores */}
				<div className="row g-2 mb-3">
					<div className="col-auto"><span className="badge text-bg-secondary">Total: {contadores.TOTAL}</span></div>
					<div className="col-auto"><span className="badge text-bg-success">Presentes: {contadores.PRESENTE}</span></div>
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
						<div className="table-responsive">
							<table className="table table-hover align-middle mb-0">
								<thead className="table-light">
									<tr>
															<th>DNI</th>
															<th>Alumno</th>
															<th className="text-center" style={{ width: 110 }}>Presente</th>
															<th>Estado actual</th>
															<th>Observación</th>
															<th>Acciones</th>
									</tr>
								</thead>
								<tbody>
									{alumnos.length === 0 && (
										<tr>
											<td colSpan={6} className="text-center text-muted py-3">
												{cursoId ? 'No hay alumnos en el curso' : 'Seleccione un curso y una fecha'}
											</td>
										</tr>
									)}
													{alumnos.map((al) => (
														<FilaAlumno
															key={al.id}
															alumno={al}
															presenteMarcado={presentes.has(al.id)}
															estadoActual={asistencia[al.id]?.estado || ''}
															observacionActual={asistencia[al.id]?.observacion || ''}
															onTogglePresente={() => handleTogglePresente(al.id)}
															onEditar={() => abrirModalEditar(al)}
															disabled={cargando}
														/>
													))}
								</tbody>
							</table>
						</div>
					</div>
				</div>

				{/* Modal edición puntual */}
				{modalEdit.open && (
					<div className="modal d-block" tabIndex="-1" role="dialog" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
						<div className="modal-dialog" role="document">
							<div className="modal-content">
								<div className="modal-header">
									<h5 className="modal-title">Editar asistencia</h5>
									<button type="button" className="btn-close" aria-label="Close" onClick={cerrarModalEditar}></button>
								</div>
								<div className="modal-body">
									<p className="mb-2"><strong>Alumno:</strong> {modalEdit.alumno?.apellido} {modalEdit.alumno?.nombre}</p>
									<div className="mb-3">
										<label className="form-label">Estado</label>
										<select className="form-select" value={modalEdit.estado} onChange={(e) => setModalEdit((m) => ({ ...m, estado: e.target.value }))}>
											<option value="TARDE">Tarde</option>
											<option value="JUSTIFICADO">Justificado</option>
										</select>
									</div>
									<div className="mb-3">
										<label className="form-label">Observación</label>
										<textarea className="form-control" rows={3} value={modalEdit.observacion} onChange={(e) => setModalEdit((m) => ({ ...m, observacion: e.target.value }))} />
									</div>
								</div>
								<div className="modal-footer">
									<button type="button" className="btn btn-secondary" onClick={cerrarModalEditar}>Cancelar</button>
									<button type="button" className="btn btn-primary" onClick={guardarEdicionModal} disabled={cargando}>
										{cargando ? <span className="spinner-border spinner-border-sm me-2" /> : null}
										Guardar
									</button>
								</div>
							</div>
						</div>
					</div>
				)}

						{/* Aclaración */}
						<div className="mt-2 text-muted">
							⚠️ Los alumnos sin estado se guardarán como Ausentes.
						</div>
			</div>
	);
}
