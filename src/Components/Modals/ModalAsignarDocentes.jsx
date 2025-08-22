import { useEffect, useState } from "react";
import Select from "react-select";
import { Modal, Button } from "react-bootstrap";
import { toast } from "react-toastify";
import { listarDocentes } from "../../Services/DocenteService";
import { asignarMateriasADocente, desasignarMateriasDeDocente } from "../../Services/DocenteService";

export default function ModalAsignarDocentes({ show, onClose, materia, token, onActualizar }) {
  const [docentes, setDocentes] = useState([]);
  const [seleccionados, setSeleccionados] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (show) {
      cargarDocentes();
      if (materia?.docentes) {
        setSeleccionados(
          materia.docentes.map(d => ({ value: d.id, label: `${d.nombre} ${d.apellido}` }))
        );
      } else {
        setSeleccionados([]);
      }
    }
  }, [show, materia]);

  const cargarDocentes = async () => {
    setLoading(true);
    try {
      const data = await listarDocentes(token); // Todos los docentes
      setDocentes(data.map(d => ({ value: d.id, label: `${d.nombre} ${d.apellido}` })));
    } catch (error) {
      toast.error("Error cargando docentes: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGuardar = async () => {
    try {
      const actuales = materia.docentes.map(d => d.id);
      const nuevosIds = seleccionados.map(s => s.value);

      const aAsignar = nuevosIds.filter(id => !actuales.includes(id));
      const aDesasignar = actuales.filter(id => !nuevosIds.includes(id));

      if (aAsignar.length) {
        await asignarMateriasADocente(token, aAsignar, materia.id);
      }
      if (aDesasignar.length) {
        await desasignarMateriasDeDocente(token, aDesasignar, materia.id);
      }

      toast.success("Docentes actualizados correctamente");
      onActualizar(); // para recargar la lista de materias
      onClose();
    } catch (error) {
      toast.error("Error al actualizar docentes: " + error.message);
    }
  };

  return (
    <Modal show={show} onHide={onClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Asignar docentes a {materia?.nombreMateria}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {loading ? (
          <p>Cargando docentes...</p>
        ) : (
          <Select
            options={docentes}
            isMulti
            value={seleccionados}
            onChange={setSeleccionados}
            placeholder="Selecciona docentes..."
          />
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button variant="success" onClick={handleGuardar}>Guardar</Button>
      </Modal.Footer>
    </Modal>
  );
}