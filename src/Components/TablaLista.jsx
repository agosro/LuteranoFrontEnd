import ActionButtons from "../Components/Botones/ActionButtons";
import Buscador from "./Botones/Buscador";
import ConfirmarEliminar from "./Botones/ConfirmarEliminar";
import BotonCrear from "./Botones/BotonCrear";
import ExportarCSV from "./Botones/ExportarCSV";
import Paginacion from "./Botones/Paginacion";
import OrdenableHeader from "./Botones/OrdenarColumnas";
import { useState, useMemo} from "react";

export default function TablaGenerica({
  titulo,
  columnas,
  datos,
  onView,
  onEdit,
  onDelete,
  onCreate,
  textoCrear,
}) {
  const [busqueda, setBusqueda] = useState('');
  const [modalShow, setModalShow] = useState(false);
  const [itemSeleccionado, setItemSeleccionado] = useState(null);
  const [orden, setOrden] = useState({ columna: null, asc: true });
  const [paginaActual, setPaginaActual] = useState(1);
  const itemsPorPagina = 10;

  // Filtrar datos
  const datosFiltrados = useMemo(() => {
    return datos.filter((item) => {
      const nombreCompleto = `${item.nombre || ''} ${item.apellido || ''}`.toLowerCase();
      const dni = (item.dni || '').toString();
      return (
        nombreCompleto.includes(busqueda.toLowerCase()) ||
        dni.includes(busqueda)
      );
    });
  }, [datos, busqueda]);

  // Ordenar datos
  const datosOrdenados = useMemo(() => {
    if (!orden.columna) return datosFiltrados;
    return [...datosFiltrados].sort((a, b) => {
      const valA = a[orden.columna];
      const valB = b[orden.columna];
      if (valA == null) return 1;
      if (valB == null) return -1;
      if (typeof valA === 'string') {
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

  const handleDeleteClick = (item) => {
    setItemSeleccionado(item);
    setModalShow(true);
  };

  const confirmarEliminar = () => {
    onDelete(itemSeleccionado);
    setModalShow(false);
    setItemSeleccionado(null);
  };

  const handleOrdenar = (key) => {
    if (orden.columna === key) {
      setOrden({ columna: key, asc: !orden.asc });
    } else {
      setOrden({ columna: key, asc: true });
    }
    setPaginaActual(1);
  };

  return (
    <div className="container mt-4" style={{ position: 'relative' }}>
      <h2>{titulo}</h2>

      <div className="d-flex justify-content-between align-items-center mb-3">
        <div style={{ width: '300px' }}>
          <Buscador
            valor={busqueda}
            onCambio={setBusqueda}
            placeholder="Buscar por nombre o DNI..."
          />
        </div>

        <div className="d-flex gap-2 align-items-center">
          {onCreate && (
            <BotonCrear texto={textoCrear || 'Crear registro'} onClick={onCreate} />
          )}
          <ExportarCSV datos={datosOrdenados} columnas={columnas} nombreArchivo={`${titulo}.csv`} />
        </div>
      </div>

      <table className="table table-bordered table-hover">
        <thead>
          <tr>
            <OrdenableHeader columnas={columnas} orden={orden} onOrdenar={handleOrdenar} />
          </tr>
        </thead>
        <tbody>
          {datosPaginados.length === 0 ? (
            <tr>
              <td colSpan={columnas.length + 2} className="text-center">
                No hay registros.
              </td>
            </tr>
          ) : (
            datosPaginados.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                {columnas.map((col) => (
                  <td key={col.key}>
                    {col.render ? col.render(item) : item[col.key]}
                  </td>
                ))}
                <td className="text-center">
                  <ActionButtons
                    onView={() => onView(item)}
                    onEdit={() => onEdit(item)}
                    onDelete={() => handleDeleteClick(item)}
                  />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <Paginacion
        paginaActual={paginaActual}
        totalPaginas={totalPaginas}
        onPaginaChange={(pagina) => setPaginaActual(pagina)}
      />

      <ConfirmarEliminar
        show={modalShow}
        onClose={() => setModalShow(false)}
        onConfirm={confirmarEliminar}
        entidad="registro"
        nombre={itemSeleccionado ? `${itemSeleccionado.nombre || itemSeleccionado.email || ''}` : ''}
      />
    </div>
  );
}