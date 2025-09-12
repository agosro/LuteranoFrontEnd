import { useEffect, useState, useCallback } from "react";
import Select from "react-select";
import { Modal, Button } from "react-bootstrap";
import { toast } from "react-toastify";

/**
 * Modal genérico de selección simple.
 *
 * Props:
 * - show: boolean → controla visibilidad
 * - onClose: función → cierra modal
 * - titulo: string → título del modal
 * - entidad: objeto → entidad actual con su asignación { id, ... }
 * - campoAsignado: string → nombre del campo (ej: "docente", "preceptor")
 * - obtenerOpciones: función async (token) → lista [{value,label}]
 * - onAsignar: función async (token, idSeleccionado, entidadId) → asigna
 * - onDesasignar: función async (token, entidadId) → desasigna
 * - token: string → JWT
 * - onActualizar: función → refresca lista
 */
export default function ModalSeleccionSimple({
  show,
  onClose,
  titulo,
  entidad,
  campoAsignado,
  obtenerOpciones,
  onAsignar,
  onDesasignar,
  token,
  onActualizar,
}) {
  const [opciones, setOpciones] = useState([]);
  const [seleccionado, setSeleccionado] = useState(null);
  const [loading, setLoading] = useState(false);

  // cargar opciones
  const cargarOpciones = useCallback(async () => {
    setLoading(true);
    try {
      const data = await obtenerOpciones(token);
      setOpciones(data);

      if (entidad?.[campoAsignado]) {
        setSeleccionado({
          value: entidad[campoAsignado].id,
          label:
            entidad[campoAsignado].nombre
              ? `${entidad[campoAsignado].nombre} ${entidad[campoAsignado].apellido || ""}`.trim()
              : entidad[campoAsignado].label || entidad[campoAsignado].descripcion || entidad[campoAsignado].id,
        });
      } else {
        setSeleccionado(null);
      }
    } catch (error) {
      toast.error("Error cargando opciones: " + error.message);
    } finally {
      setLoading(false);
    }
  }, [obtenerOpciones, token, entidad, campoAsignado]);

  useEffect(() => {
    if (show) cargarOpciones();
  }, [show, cargarOpciones]);

  const handleGuardar = async () => {
    try {
      if (!entidad) return;

      // si deseleccionás algo que ya tenía
      if (!seleccionado && entidad[campoAsignado]) {
        await onDesasignar(token, entidad.id);
        toast.success("Desasignado correctamente");
      }

      // si seleccionás algo distinto
      if (seleccionado && seleccionado.value !== entidad[campoAsignado]?.id) {
        await onAsignar(token, seleccionado.value, entidad.id);
        toast.success("Asignado correctamente");
      }

      onActualizar();
      onClose();
    } catch (error) {
      toast.error("Error al guardar: " + error.message);
    }
  };

  return (
    <Modal show={show} onHide={onClose} size="md">
      <Modal.Header closeButton>
        <Modal.Title>{titulo}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {loading ? (
          <p>Cargando opciones...</p>
        ) : (
          <Select
            options={opciones}
            value={seleccionado}
            onChange={setSeleccionado}
            placeholder="Selecciona una opción..."
            isClearable
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