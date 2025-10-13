import { useEffect, useState, useCallback } from "react";
import Select from "react-select";
import { Modal, Button } from "react-bootstrap";
import { toast } from "react-toastify";

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
  toastOnSuccess = true,
}) {
  const [opciones, setOpciones] = useState([]);
  const [seleccionado, setSeleccionado] = useState(null);
  const [loading, setLoading] = useState(false);

  // cargar opciones
  const cargarOpciones = useCallback(async () => {
    setLoading(true);
    try {
      const data = await obtenerOpciones(token);
      setOpciones(Array.isArray(data) ? data : []);

      // Preselección determinística
      if (entidad?.[campoAsignado]) {
        const esCurso = campoAsignado.toLowerCase().includes("curso");
        const fuente = entidad[campoAsignado];
        const curso = esCurso ? (fuente?.curso ?? fuente) : null;
        const selectedId = esCurso ? (curso?.id ?? null) : (fuente?.id ?? fuente?.value ?? null);

        if (selectedId != null) {
          const match = (data || []).find((o) => String(o.value) === String(selectedId));
          if (match) {
            setSeleccionado(match);
          } else {
            // Fallback: construir label aproximado
            let labelGenerado;
            if (esCurso && curso) {
              const anio = curso.anio ?? "";
              const division = curso.division ?? "";
              const nivel = curso.nivel ?? "";
              labelGenerado = `${anio}° ${division} - ${nivel}`.trim();
            } else {
              labelGenerado =
                fuente?.nombre
                  ? `${fuente.nombre} ${fuente.apellido || ""}`.trim()
                  : fuente?.label || fuente?.descripcion || String(selectedId);
            }
            setSeleccionado({ value: selectedId, label: labelGenerado });
          }
        } else {
          setSeleccionado(null);
        }
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
        if (toastOnSuccess) toast.success("Desasignado correctamente");
      }

      // si seleccionás algo distinto
      if (seleccionado && String(seleccionado.value) !== String(entidad[campoAsignado]?.id)) {
        await onAsignar(token, seleccionado.value, entidad.id);
        if (toastOnSuccess) toast.success("Asignado correctamente");
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