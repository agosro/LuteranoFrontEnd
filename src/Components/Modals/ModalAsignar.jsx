import { useEffect, useState, useCallback } from "react";
import Select from "react-select";
import { Modal, Button } from "react-bootstrap";
import { toast } from "react-toastify";

/**
 * Modal genérico para asignar / desasignar entidades.
 *
 * Props:
 * - show: boolean → controla si el modal se muestra
 * - onClose: función → cierra el modal
 * - titulo: string → título del modal
 * - entidad: objeto → entidad actual con sus asignaciones (ej: curso, materia)
 * - campoAsignados: string → nombre del campo que contiene los asignados (ej: "docentes", "materias")
 * - obtenerOpciones: función async (token) → trae todas las opciones posibles [{value, label}]
 * - onAsignar: función async (token, ids, entidadId) → asigna nuevos
 * - onDesasignar: función async (token, ids, entidadId) → desasigna
 * - token: string → JWT para llamadas
 * - onActualizar: función → callback para refrescar la lista
 */
export default function ModalAsignacionGenerico({
  show,
  onClose,
  titulo,
  entidad,
  campoAsignados,
  obtenerOpciones,
  onAsignar,
  onDesasignar,
  token,
  onActualizar,
}) {
  const [opciones, setOpciones] = useState([]);
  const [seleccionados, setSeleccionados] = useState([]);
  const [loading, setLoading] = useState(false);

  // Función estable para cargar opciones
  const cargarOpciones = useCallback(async () => {
    setLoading(true);
    try {
      const data = await obtenerOpciones(token);
      setOpciones(data);
    } catch (error) {
      toast.error("Error cargando opciones: " + error.message);
    } finally {
      setLoading(false);
    }
  }, [obtenerOpciones, token]);

  // Cargar opciones y preseleccionados al abrir
  useEffect(() => {
    if (show) {
      cargarOpciones();

      if (entidad?.[campoAsignados]) {
        setSeleccionados(
          entidad[campoAsignados].map((item) => ({
            value: item.id,
            label: item.nombre
              ? `${item.nombre} ${item.apellido || ""}`.trim()
              : item.label || item.descripcion || item.id,
          }))
        );
      } else {
        setSeleccionados([]);
      }
    }
  }, [show, entidad, campoAsignados, cargarOpciones]);

  const handleGuardar = async () => {
    try {
      const actuales = entidad[campoAsignados]?.map((i) => i.id) || [];
      const nuevosIds = seleccionados.map((s) => s.value);

      const aAsignar = nuevosIds.filter((id) => !actuales.includes(id));
      const aDesasignar = actuales.filter((id) => !nuevosIds.includes(id));

      if (aAsignar.length) {
        await onAsignar(token, aAsignar, entidad.id);
      }
      if (aDesasignar.length) {
        await onDesasignar(token, aDesasignar, entidad.id);
      }

      toast.success("Asignación actualizada correctamente");
      onActualizar();
      onClose();
    } catch (error) {
      toast.error("Error al guardar: " + error.message);
    }
  };

  return (
    <Modal show={show} onHide={onClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{titulo}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {loading ? (
          <p>Cargando opciones...</p>
        ) : (
          <Select
            options={opciones}
            isMulti
            value={seleccionados}
            onChange={setSeleccionados}
            placeholder="Selecciona opciones..."
          />
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button variant="success" onClick={handleGuardar}>
          Guardar
        </Button>
      </Modal.Footer>
    </Modal>
  );
}