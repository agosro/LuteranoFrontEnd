import ActionButtons from "../Components/Botones/ActionButtons";
import ExportarCSV from "./Botones/ExportarCSV";
import Paginacion from "./Botones/Paginacion";
import OrdenableHeader from "./Botones/OrdenarColumnas";
import { useState, useMemo} from "react";
import BackButton from "./Botones/BackButton";
import Breadcrumbs from "./Botones/Breadcrumbs";
import { FaInbox } from "react-icons/fa"; 
import './tabla.css';

export default function TablaGenerica({
  titulo,
  columnas,
  datos = [],
  onView,
  onEdit,
  onDelete,
  botonCrear,
  extraButtons,
  loading = false,
  leftControls, // nuevo: render prop para insertar controles a la izquierda
}) {
  // filtros por columna
  const [filtrosColumnas, setFiltrosColumnas] = useState(() => (
    columnas.reduce((acc, c) => ({ ...acc, [c.key]: "" }), { id: "" })
  ));
  const [paginaActual, setPaginaActual] = useState(1);
  const [itemsPorPagina, setItemsPorPagina] = useState(10);

  // Normalizar datos para evitar errores si llega algo distinto a array
  const safeDatos = useMemo(() => (Array.isArray(datos) ? datos : []), [datos])

  // Filtrar datos (solo filtros por columna)
  const datosFiltrados = useMemo(() => {
  return safeDatos.filter((item) => {
    // filtros por columna (AND)
    for (const [k, fv] of Object.entries(filtrosColumnas)) {
      if (!fv) continue;

      let val;

      // 🔹 Casos especiales
      if (k === "nombreApellido") {
        // Concatenar nombre + apellido para el filtro
        val = `${item.nombre ?? ""} ${item.apellido ?? ""}`;
      } else if (k === "id") {
        val = item.id;
      } else {
        val = item[k];
      }

      const txt = (val ?? "").toString().toLowerCase();
      if (!txt.includes(fv.toLowerCase())) return false;
    }

    return true;
  });
}, [safeDatos, filtrosColumnas]);

  // Paginación
  const totalPaginas = Math.ceil(datosFiltrados.length / itemsPorPagina);
  const datosPaginados = datosFiltrados.slice(
    (paginaActual - 1) * itemsPorPagina,
    paginaActual * itemsPorPagina
  );

  const handleFiltroColumna = (key, value) => {
    setFiltrosColumnas((prev) => ({ ...prev, [key]: value }));
    setPaginaActual(1);
  };

  return (
    <div className="container mt-4" style={{ position: "relative" }}>
      
      {/* 🔹 Encabezado */}
      <div className="mb-3">
        {/* Breadcrumbs + volver */}
        <div className="d-flex flex-column align-items-start ">
          <Breadcrumbs />
          <BackButton />
        </div>

        {/* Título + subtítulo centrados */}
        <div className="text-center ">
          <h2 className="tabla-titulo m-0">{titulo}</h2>
          <p className="text-muted tabla-subtitulo m-1">
            Aquí puedes ver y administrar todos los {titulo.toLowerCase()} del sistema.
          </p>
        </div>
      </div>

      {/* 🔹 Card de tabla */}
      <div className="tabla-visual-externa">
        
        {/* Controles superiores */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="d-flex align-items-center gap-2">
            {leftControls && (
              <div className="me-2 d-flex align-items-center">
                {leftControls()}
              </div>
            )}
          </div>

          <div className="d-flex gap-2 align-items-center">
            <div className="d-flex align-items-center me-2">
              <span className="me-2 text-muted">Mostrar</span>
              <select
                className="form-select form-select-sm"
                style={{ width: 80 }}
                value={itemsPorPagina}
                onChange={(e) => {
                  setItemsPorPagina(Number(e.target.value));
                  setPaginaActual(1);
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
            {botonCrear}
            <ExportarCSV 
              datos={datosFiltrados} 
              columnas={columnas} 
              nombreArchivo={`${titulo}.csv`} 
            />
          </div>
        </div>

        {/* Barra de filtros por columna */}
        <div className="card card-body mb-3" style={{ background: '#fff' }}>
          <div className="row g-2">
            <div className="col-2">
              <input
                className="form-control form-control-sm"
                placeholder="Filtrar ID"
                value={filtrosColumnas.id}
                onChange={(e) => handleFiltroColumna('id', e.target.value)}
              />
            </div>
            {columnas.map((col) => (
              <div className="col" key={`filter-${col.key}`}>
                <input
                  className="form-control form-control-sm"
                  placeholder={`Filtrar ${col.label}`}
                  value={filtrosColumnas[col.key]}
                  onChange={(e) => handleFiltroColumna(col.key, e.target.value)}
                />
              </div>
            ))}
            <div className="col-auto d-flex align-items-center">
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setFiltrosColumnas(columnas.reduce((acc, c) => ({ ...acc, [c.key]: '' }), { id: '' }))}
              >
                Limpiar filtros
              </button>
            </div>
          </div>
        </div>

        {/* Tabla o loader */}
        {loading ? (
          <div className="d-flex justify-content-center align-items-center py-5">
            <div className="spinner-border text-primary me-2" role="status" aria-hidden="true"></div>
            <span className="text-muted">Cargando {titulo.toLowerCase()}...</span>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-bordered table-hover table-striped">
              <thead>
                <tr>
                  <OrdenableHeader columnas={columnas} />
                </tr>
              </thead>
              <tbody>
                {datosPaginados.length === 0 ? (
                  <tr>
                    <td colSpan={columnas.length + 2} className="text-center text-muted p-4">
                      <FaInbox size={32} className="mb-2" />
                      <div>No se encontraron registros de {titulo.toLowerCase()}.</div>
                    </td>
                  </tr>
                ) : (
                  datosPaginados.map((item, index) => (
                    <tr key={`${item.id}-${index}`}>
                      <td>{String(item.id)}</td>
                      {columnas.map((col) => {
                        const content = col.render ? col.render(item) : item[col.key];
                        return (
                          <td key={col.key}>
                            {content}
                          </td>
                        );
                      })}
                      <td className="text-center">
                        <ActionButtons
                          onView={onView ? () => onView(item) : null}
                          onEdit={onEdit ? () => onEdit(item) : null}
                          onDelete={onDelete ? () => onDelete(item) : null}
                          extraButtons={extraButtons ? extraButtons(item) : []}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {!loading && (
          <Paginacion
            paginaActual={paginaActual}
            totalPaginas={totalPaginas}
            onPaginaChange={(pagina) => setPaginaActual(pagina)}
          />
        )}
      </div>
    </div>
  );
}
