import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Spinner } from "react-bootstrap";
import { toast } from "react-toastify";
import Select from "react-select";
import { asignarHorario } from "../../Services/HorariosService";

export default function ModalAsignarMateriaAHorario({
  show,
  onClose,
  token,
  cursoId,
  diaSeleccionado,
  modulosLibres,
  moduloPorDefecto,
  materias,
  onHorarioAsignado,
}) {
  const [materiaId, setMateriaId] = useState("");
  const [modulosSeleccionados, setModulosSeleccionados] = useState([]);
  const [loading, setLoading] = useState(false);

  // ✅ Los hooks van siempre antes de cualquier return condicional
  useEffect(() => {
    if (moduloPorDefecto && show) {
      setModulosSeleccionados([
        {
          value: moduloPorDefecto.id,
          label: `Módulo ${moduloPorDefecto.orden} (${moduloPorDefecto.desde} - ${moduloPorDefecto.hasta})`,
        },
      ]);
    }
  }, [moduloPorDefecto, show]);

  // 👇 Ahora sí, el return condicional va después de los hooks
  if (!show) return null;

  const handleAsignar = async () => {
    if (!materiaId || modulosSeleccionados.length === 0) {
      toast.warn("⚠️ Seleccioná una materia y al menos un módulo");
      return;
    }

    setLoading(true);
    try {
      const slots = modulosSeleccionados.map((m) => ({
        dia: diaSeleccionado,
        moduloId: m.value,
      }));

      await asignarHorario(token, cursoId, materiaId, slots);

      // Buscar materia seleccionada (ya normalizada por el service)
      const materiaSeleccionada = materias.find(
        (m) => m.id === parseInt(materiaId)
      );

      const nombreMateria = materiaSeleccionada?.nombreMateria || "Sin nombre";
      const docente = materiaSeleccionada?.docente
        ? `${materiaSeleccionada.docente.nombre} ${materiaSeleccionada.docente.apellido}`
        : "sin docente asignado";

      // 🕒 Rango horario para el toast
      const desde =
        modulosSeleccionados[0]?.label.match(/\(([^)]+)\)/)?.[1]?.split(" - ")[0];
      const hasta =
        modulosSeleccionados[modulosSeleccionados.length - 1]?.label
          .match(/\(([^)]+)\)/)?.[1]
          ?.split(" - ")[1];

      const mensajeHorario =
        modulosSeleccionados.length > 1
          ? `de ${desde} a ${hasta}`
          : `a las ${desde}`;

      toast.success(
        `✅ ${nombreMateria} (${docente}) asignada el ${diaSeleccionado} ${mensajeHorario}`
      );

      onHorarioAsignado(diaSeleccionado, modulosSeleccionados[0].value);
      setMateriaId("");
      setModulosSeleccionados([]);
      onClose();
    } catch (error) {
      console.error("❌ Error al asignar:", error);
      toast.error("Error al asignar horarios");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Opciones de materias (ya normalizadas)
  const materiaOptions = materias.map((m) => ({
    value: m.id,
    label: `${m.nombreMateria}${
      m.docente ? ` – ${m.docente.nombre} ${m.docente.apellido}` : ""
    }`,
  }));

  // 🔹 Opciones de módulos
  const moduloOptions = modulosLibres.map((mod) => ({
    value: mod.id,
    label: `Módulo ${mod.orden} (${mod.desde} - ${mod.hasta})`,
  }));

  return (
    <Modal show={show} onHide={onClose} centered backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Asignar horario</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Día</Form.Label>
            <Form.Control type="text" value={diaSeleccionado} disabled />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Materia</Form.Label>
            <Select
              options={materiaOptions}
              value={
                materiaOptions.find((opt) => opt.value === parseInt(materiaId)) ||
                null
              }
              onChange={(opt) => setMateriaId(opt ? opt.value : "")}
              placeholder="Seleccionar materia..."
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Módulos</Form.Label>
            <Select
              isMulti
              options={moduloOptions}
              value={modulosSeleccionados}
              onChange={setModulosSeleccionados}
              placeholder="Seleccionar uno o más módulos..."
            />
          </Form.Group>
        </Form>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button variant="success" onClick={handleAsignar} disabled={loading}>
          {loading ? (
            <>
              <Spinner size="sm" animation="border" /> Guardando...
            </>
          ) : (
            "Asignar"
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
