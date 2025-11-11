import { useState, useCallback, useEffect, useMemo } from 'react';
import TablaGenerica from '../Components/TablaLista';
import ModalVerEntidad from '../Components/Modals/ModalVerEntidad';
import ModalEditarEntidad from '../Components/Modals/ModalEditarEntidad';
import ModalCrearEntidad from '../Components/Modals/ModalCrear';
import ConfirmarEliminar from '../Components/Modals/ConfirmarEliminar';
import BotonCrear from '../Components/Botones/BotonCrear';
import { useAuth } from '../Context/AuthContext';
import { toast } from 'react-toastify';
import { FaUserTie } from 'react-icons/fa';

import {
  listarMaterias,
  crearMateria,
  actualizarMateria,
  eliminarMateria
} from '../Services/MateriaService';

import { listarCursos } from '../Services/CursoService';
import { camposMateria } from '../Entidades/camposMateria';

import ModalSeleccionSimple from '../Components/Modals/ModalSeleccionSimple';
import { listarDocentes } from '../Services/DocenteService';
import { asignarDocente, desasignarDocente, listarCursosDeMateria } from '../Services/MateriaCursoService';
import { getTituloCurso } from "../utils/cursos";

export default function ListaMaterias() {
  const [materias, setMaterias] = useState([]);
  const [loading, setLoading] = useState(true);

  const [materiaSeleccionada, setMateriaSeleccionada] = useState(null);
  const [modalVerShow, setModalVerShow] = useState(false);
  const [modalEditarShow, setModalEditarShow] = useState(false);
  const [modalCrearShow, setModalCrearShow] = useState(false);
  const [mostrarModalEliminar, setMostrarModalEliminar] = useState(false);

  const { user } = useAuth();
  const token = user?.token;

  // Filtro por nivel
  const [filtroNivel, setFiltroNivel] = useState('');
  const opcionesNivel = [
    { value: '', label: 'Todos los niveles' },
    { value: 'BASICO', label: 'Básico' },
    { value: 'ORIENTADO', label: 'Orientado' },
  ];

  // Filtro por curso (select)
  const [filtroCurso, setFiltroCurso] = useState('');
  const opcionesCurso = useMemo(() => {
    const nombres = Array.from(new Set((materias || []).map(m => m.cursoNombre || 'Sin curso')));
    const opts = nombres
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
      .map(n => ({ value: n, label: n }));
    return [{ value: '', label: 'Todos los cursos' }, ...opts];
  }, [materias]);

  // Orden
  const [orden, setOrden] = useState('RECIENTES'); // RECIENTES | ANTIGUOS | AZ | ZA

  const [formDataCrear, setFormDataCrear] = useState({
    nombreMateria: "",
    descripcion: "",
    nivel: "",
  });
  const handleInputChangeCrear = (name, value) => {
    setFormDataCrear(prev => ({ ...prev, [name]: value }));
  };

  const [formDataEditar, setFormDataEditar] = useState({});
  const handleInputChangeEditar = (name, value) => {
    setFormDataEditar(prev => ({ ...prev, [name]: value }));
  };

  // Modal asignar docente
  const [modalAsignarDocenteShow, setModalAsignarDocenteShow] = useState(false);
  const [materiaParaAsignar, setMateriaParaAsignar] = useState(null);

  const abrirModalAsignarDocente = (materia) => {
    if (!materia?.cursoId) {
      toast.warn("Para asignar un docente, primero asigná la materia a un curso.");
      return;
    }
    setMateriaParaAsignar(materia);
    setModalAsignarDocenteShow(true);
  };
  const cerrarModalAsignarDocente = () => {
    setMateriaParaAsignar(null);
    setModalAsignarDocenteShow(false);
  };

  // 🆕 Cargar materias duplicadas por curso
  const cargarMaterias = useCallback(async (silent = false) => {
    if (!token) return;
    if (!silent) setLoading(true);
    try {
      const [materiasData, cursosData] = await Promise.all([
        listarMaterias(token),
        listarCursos(token),
      ]);

      const materiasConCurso = (
        await Promise.all(
          materiasData.map(async (m) => {
            try {
              const cursosDeMateria = await listarCursosDeMateria(token, m.id);

              if (Array.isArray(cursosDeMateria) && cursosDeMateria.length > 0) {
                return cursosDeMateria.map((mc) => {
                  const cursoEncontrado = cursosData.find(c => c.id === mc.cursoId);
                  const cursoNombre = cursoEncontrado
                    ? getTituloCurso(cursoEncontrado)
                    : `Curso ${mc.cursoId}`;

                  // Puede venir 'docente' (objeto) o 'docentes' (array normalizado)
                  const docentes = Array.isArray(mc.docentes) && mc.docentes.length
                    ? mc.docentes
                    : (mc.docente ? [mc.docente] : []);
                  const docenteNombre = docentes.length
                    ? docentes.map(d => `${d.nombre} ${d.apellido}`).join(", ")
                    : "Sin docente";

                  return {
                    ...m,
                    cursoId: mc.cursoId,
                    cursoNombre,
                    docente: mc.docente || null,
                    docentes,
                    docenteNombre,
                  };
                });
              }

              // sin cursos
              return [{
                ...m,
                cursoId: null,
                cursoNombre: "Sin curso",
                docente: null,
                docenteNombre: "Sin docente"
              }];
            } catch (error) {
              console.error(`Error cargando cursos de la materia ${m.id}:`, error);
              return [{
                ...m,
                cursoId: null,
                cursoNombre: "Sin curso",
                docente: null,
                docenteNombre: "Sin docente"
              }];
            }
          })
        )
      ).flat();

      setMaterias(materiasConCurso);
    } catch (error) {
      toast.error("Error cargando materias: " + error.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    cargarMaterias();
  }, [cargarMaterias]);

  // CRUD materias
  const handleCreate = async (nuevaMateria) => {
    try {
      const creadoResponse = await crearMateria(token, nuevaMateria);
      toast.success(creadoResponse.mensaje || 'Materia creada con éxito');
      setModalCrearShow(false);
      setFormDataCrear({ nombreMateria: "", descripcion: "", nivel: "" });
      // refresco silencioso para evitar que "se reinicie la página"
      cargarMaterias(true);
    } catch (error) {
      toast.error(error.message || 'Error creando materia');
    }
  };

  const handleUpdate = async (materiaEditada) => {
    try {
      const editResponse = await actualizarMateria(token, materiaEditada);
      toast.success(editResponse.mensaje || 'Materia actualizada con éxito');
      setModalEditarShow(false);
      setMateriaSeleccionada(null);
      // refresco silencioso
      cargarMaterias(true);
    } catch (error) {
      toast.error(error.message || 'Error al actualizar materia');
    }
  };

  const handleDeleteClick = (materia) => {
    setMateriaSeleccionada(materia);
    setMostrarModalEliminar(true);
  };

  const confirmarEliminar = async () => {
    try {
      await eliminarMateria(token, materiaSeleccionada.id);
      setMaterias(prev => prev.filter(m => m.id !== materiaSeleccionada.id));
      toast.success('Materia eliminada con éxito');
    } catch (error) {
      console.error(error);
      toast.error('Error al eliminar materia');
    } finally {
      setMostrarModalEliminar(false);
    }
  };

  const handleView = (materia) => {
    setMateriaSeleccionada(materia);
    setModalVerShow(true);
  };

  const handleEdit = (materia) => {
    setMateriaSeleccionada(materia);
    setFormDataEditar({
      id: materia.id,
      nombreMateria: materia.nombreMateria || '',
      descripcion: materia.descripcion || '',
      nivel: materia.nivel || ''
    });
    setModalEditarShow(true);
  };
 

  // columnas ahora simples
  const columnasMaterias = [
    { key: 'nombreMateria', label: 'Materia' },
    { key: 'descripcion', label: 'Descripción' },
    { key: 'nivel', label: 'Nivel', render: (m) => m.nivel ?? 'Sin nivel' },
    { key: 'cursoNombre', label: 'Curso', render: (m) => m.cursoNombre },
    { key: 'docente', label: 'Docente(s)', render: (m) => m.docenteNombre }
  ];

  const materiasFiltradas = useMemo(() => {
    let base = Array.isArray(materias) ? materias : [];
    if (filtroNivel) {
      base = base.filter(m => (m.nivel || '').toUpperCase() === filtroNivel);
    }
    if (filtroCurso) {
      base = base.filter(m => (m.cursoNombre || 'Sin curso') === filtroCurso);
    }

    // Ordenar
    const getClaveFecha = (m) => m.createdAt || m.fechaCreacion || m.fecha || m.created_on || m.creationDate || null;
    const getTime = (m) => {
      const f = getClaveFecha(m);
      if (f) {
        const t = Date.parse(f);
        if (!Number.isNaN(t)) return t;
      }
      // fallback: usa id numérico si existe
      return typeof m.id === 'number' ? m.id : 0;
    };

    const byNombre = (a, b) => (a.nombreMateria || '').localeCompare(b.nombreMateria || '', 'es', { sensitivity: 'base' });
    const byFechaAsc = (a, b) => getTime(a) - getTime(b);
    const byFechaDesc = (a, b) => getTime(b) - getTime(a);

    const ordenada = [...base];
    switch (orden) {
      case 'AZ':
        ordenada.sort(byNombre);
        break;
      case 'ZA':
        ordenada.sort((a, b) => -byNombre(a, b));
        break;
      case 'ANTIGUOS':
        ordenada.sort(byFechaAsc);
        break;
      case 'RECIENTES':
      default:
        ordenada.sort(byFechaDesc);
        break;
    }
    return ordenada;
  }, [materias, filtroNivel, filtroCurso, orden]);

  return (
    <>
      <TablaGenerica
        titulo="Materias"
        columnas={columnasMaterias}
        datos={materiasFiltradas}
        loading={loading}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
        camposFiltrado={['nombreMateria', 'descripcion', 'cursoNombre', 'docenteNombre']}
        botonCrear={<BotonCrear texto="Crear materia" onClick={() => setModalCrearShow(true)} />}
        placeholderBuscador="Buscar por nombre, descripción o curso"
  hideIdFilter={true}
  omitColumnFilters={['nombreMateria','descripcion','docente','nivel','cursoNombre']}
  showColumnFiltersBar={false}
        leftControls={() => (
          <div className="d-flex align-items-center gap-2 flex-wrap">
            {/* Nivel */}
            <div className="d-flex align-items-center gap-2">
              <select
                className="form-select form-select-sm"
                style={{ minWidth: 160 }}
                value={filtroNivel}
                onChange={(e) => setFiltroNivel(e.target.value)}
              >
                {opcionesNivel.map(op => (
                  <option key={op.value || 'all'} value={op.value}>{op.label}</option>
                ))}
              </select>
              {filtroNivel && (
                <button
                  type="button"
                  className="btn btn-sm btn-link text-decoration-none"
                  style={{ padding: '0 4px' }}
                  onClick={() => setFiltroNivel('')}
                >
                  Limpiar
                </button>
              )}
            </div>

            {/* Curso */}
            <div className="d-flex align-items-center gap-2">
              <select
                className="form-select form-select-sm"
                style={{ minWidth: 180 }}
                value={filtroCurso}
                onChange={(e) => setFiltroCurso(e.target.value)}
              >
                {opcionesCurso.map(op => (
                  <option key={op.value || 'all'} value={op.value}>{op.label}</option>
                ))}
              </select>
              {filtroCurso && (
                <button
                  type="button"
                  className="btn btn-sm btn-link text-decoration-none"
                  style={{ padding: '0 4px' }}
                  onClick={() => setFiltroCurso('')}
                >
                  Limpiar
                </button>
              )}
            </div>

            {/* Orden */}
            <div className="d-flex align-items-center gap-2">
              <select
                className="form-select form-select-sm"
                style={{ minWidth: 180 }}
                value={orden}
                onChange={(e) => setOrden(e.target.value)}
              >
                <option value="RECIENTES">Más recientes</option>
                <option value="ANTIGUOS">Más antiguos</option>
                <option value="AZ">Alfabético (A-Z)</option>
                <option value="ZA">Alfabético (Z-A)</option>
              </select>
            </div>
          </div>
        )}
        extraButtons={(materia) => {
          const puedeAsignar = !!materia.cursoId;
          const btn = {
            icon: <FaUserTie />,
            onClick: () => abrirModalAsignarDocente(materia),
            title: puedeAsignar ? "Asignar Docente" : "Asignar a un curso para habilitar",
            disabled: !puedeAsignar,
            className: !puedeAsignar ? "btn-outline-secondary" : undefined,
          };
          return [btn];
        }}
      />

      <ModalVerEntidad
        show={modalVerShow}
        onClose={() => setModalVerShow(false)}
        datos={materiaSeleccionada}
        campos={camposMateria(true).filter(c => c.name !== 'cursoNombre' && c.name !== 'docenteNombre')}
        titulo="Detalle de la Materia"
        detallePathBase="materias"
      />

      <ConfirmarEliminar
        show={mostrarModalEliminar}
        onClose={() => setMostrarModalEliminar(false)}
        onConfirm={confirmarEliminar}
        item={materiaSeleccionada}
        tipo="materia"
      />

      {materiaSeleccionada && (
        <ModalEditarEntidad
          show={modalEditarShow}
          onClose={() => setModalEditarShow(false)}
          datosIniciales={materiaSeleccionada}
          formData={formDataEditar}
          campos={camposMateria(false)}
          onInputChange={handleInputChangeEditar}
          onSubmit={handleUpdate}
        />
      )}

      <ModalCrearEntidad
        show={modalCrearShow}
        onClose={() => setModalCrearShow(false)}
        campos={camposMateria(false)}
        onSubmit={handleCreate}
        formData={formDataCrear}
        onInputChange={handleInputChangeCrear}
        titulo="Crear Materia"
      />

      {/* Modal Asignar Docente */}
      <ModalSeleccionSimple
        show={modalAsignarDocenteShow}
        onClose={cerrarModalAsignarDocente}
        titulo={`Asignar docente a ${materiaParaAsignar?.nombreMateria} (${materiaParaAsignar?.cursoNombre})`}
        entidad={materiaParaAsignar}
        campoAsignado="docente"
        obtenerOpciones={async (token) => {
          const data = await listarDocentes(token);
          return data.map(d => ({ value: d.id, label: `${d.nombre} ${d.apellido}` }));
        }}
        onAsignar={(token, docenteId, materiaId) =>
          asignarDocente(token, materiaId, materiaParaAsignar.cursoId, docenteId)
        }
        onDesasignar={(token, materiaId) =>
          desasignarDocente(token, materiaId, materiaParaAsignar.cursoId)
        }
        token={token}
        onActualizar={cargarMaterias}
      />
    </>
  );
}