import ActionButtons from "../Components/Botones/ActionButtons";
import Buscador from "./Botones/Buscador";
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
  datos,
  onView,
  onEdit,
  onDelete,
  botonCrear,
  placeholderBuscador,
  camposFiltrado = [] ,
  extraButtons,
}) {
  const [busqueda, setBusqueda] = useState("");
  const [orden, setOrden] = useState({ columna: null, asc: true });
  const [paginaActual, setPaginaActual] = useState(1);
  const itemsPorPagina = 10;

  // Filtrar datos
  const datosFiltrados = useMemo(() => {
    const termino = busqueda.toLowerCase();
    return datos.filter((item) =>
      camposFiltrado.some((campo) => 
        (item[campo]?.toString().toLowerCase() || "").includes(termino)
      )
    );
  }, [datos, busqueda, camposFiltrado]);

  // Ordenar datos
  const datosOrdenados = useMemo(() => {
    if (!orden.columna) return datosFiltrados;
    return [...datosFiltrados].sort((a, b) => {
      const valA = a[orden.columna];
      const valB = b[orden.columna];
      if (valA == null) return 1;
      if (valB == null) return -1;
      if (typeof valA === "string") {
        return orden.asc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return orden.asc ? valA - valB : valB - valA;
    });
  }, [datosFiltrados, orden]);

  // Paginación
  const totalPaginas = Math.ceil(datosOrdenados.length / itemsPorPagina);
  const datosPaginados = datosOrdenados.slice(
    (paginaActual - 1) * itemsPorPagina,
    paginaActual * itemsPorPagina
  );

  const handleOrdenar = (key) => {
    if (orden.columna === key) {
      setOrden({ columna: key, asc: !orden.asc });
    } else {
      setOrden({ columna: key, asc: true });
    }
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
        
        {/* Buscador y botones */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div style={{ width: "300px" }}>
            <Buscador valor={busqueda} onCambio={setBusqueda} placeholder={placeholderBuscador} />
          </div>

          <div className="d-flex gap-2 align-items-center">
            {botonCrear}
            <ExportarCSV 
              datos={datosOrdenados} 
              columnas={columnas} 
              nombreArchivo={`${titulo}.csv`} 
            />
          </div>
        </div>

        {/* Tabla responsiva */}
        <div className="table-responsive">
          <table className="table table-bordered table-hover">
            <thead>
              <tr>
                <OrdenableHeader columnas={columnas} orden={orden} onOrdenar={handleOrdenar} />
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
                    <td>{item.id}</td>
                    {columnas.map((col) => (
                      <td key={col.key}>{col.render ? col.render(item) : item[col.key]}</td>
                    ))}
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

        {/* Paginación */}
        <Paginacion
          paginaActual={paginaActual}
          totalPaginas={totalPaginas}
          onPaginaChange={(pagina) => setPaginaActual(pagina)}
        />
      </div>
    </div>
  );
}
