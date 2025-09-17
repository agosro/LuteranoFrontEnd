import React, { useState } from "react";
import { Button, Modal, Form, Table } from "react-bootstrap";

const dias = ["Lunes 23", "Martes 24", "Miércoles 25", "Jueves 26", "Viernes 27"];
const horas = ["08:00", "09:00", "10:00", "11:00", "12:00"];

// Mock de disponibilidad
const disponibilidadMock = {
  "Lunes 23": { "08:00": "Libre", "09:00": "Reservado", "10:00": "Libre", "11:00": "Libre", "12:00": "Reservado" },
  "Martes 24": { "08:00": "Reservado", "09:00": "Libre", "10:00": "Libre", "11:00": "Libre", "12:00": "Libre" },
  "Miércoles 25": { "08:00": "Libre", "09:00": "Libre", "10:00": "Reservado", "11:00": "Libre", "12:00": "Reservado" },
  "Jueves 26": { "08:00": "Libre", "09:00": "Libre", "10:00": "Reservado", "11:00": "Libre", "12:00": "Libre" },
  "Viernes 27": { "08:00": "Libre", "09:00": "Libre", "10:00": "Reservado", "11:00": "Libre", "12:00": "Reservado" },
};

export default function ReservarEspacio() {
  const [show, setShow] = useState(false);
  const [reserva, setReserva] = useState({ fecha: "", hora: "", motivo: "" });

  const handleShow = (dia, hora) => {
    setReserva({ fecha: dia, hora, motivo: "" });
    setShow(true);
  };

  const handleClose = () => setShow(false);

  const handleConfirm = () => {
    console.log("Reserva confirmada:", reserva);
    alert(`Reserva confirmada para ${reserva.fecha} a las ${reserva.hora}`);
    setShow(false);
  };

  return (
    <div className="container mt-4">
      <h3 className="mb-3">Reservar Espacio Áulico</h3>
      <div className="d-flex justify-content-between mb-3">
        <Button variant="success">⟵ Semana Anterior</Button>
        <Button variant="success">Semana Siguiente ⟶</Button>
      </div>

      <Table bordered hover>
        <thead>
          <tr>
            <th>Hora</th>
            {dias.map((dia) => (
              <th key={dia}>{dia}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {horas.map((hora) => (
            <tr key={hora}>
              <td><strong>{hora}</strong></td>
              {dias.map((dia) => {
                const estado = disponibilidadMock[dia][hora];
                const libre = estado === "Libre";
                return (
                  <td
                    key={dia + hora}
                    className={libre ? "bg-success text-white" : "bg-danger text-white"}
                    style={{ cursor: libre ? "pointer" : "not-allowed" }}
                    onClick={() => libre && handleShow(dia, hora)}
                  >
                    {estado}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </Table>

      {/* Modal de confirmación */}
      <Modal show={show} onHide={handleClose} centered>
        <Modal.Header closeButton>
          <Modal.Title>Reservar espacio</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Fecha</Form.Label>
              <Form.Control type="text" value={reserva.fecha} disabled />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Hora</Form.Label>
              <Form.Control type="text" value={reserva.hora} disabled />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Curso/Motivo</Form.Label>
              <Form.Control
                type="text"
                placeholder="Ej: 5to A - Matemática"
                value={reserva.motivo}
                onChange={(e) => setReserva({ ...reserva, motivo: e.target.value })}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Cancelar
          </Button>
          <Button variant="success" onClick={handleConfirm}>
            Confirmar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
