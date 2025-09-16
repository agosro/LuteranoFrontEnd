import React, { useState } from "react";
import { Table, Button, Badge } from "react-bootstrap";

export default function MisReservas() {
  // 🔹 Datos de ejemplo (mock)
  const [reservas, setReservas] = useState([
    {
      id: 1,
      espacio: { nombre: "Aula 101" },
      fecha: "2025-09-20",
      hora: "08:00",
      estado: "APROBADA",
    },
    {
      id: 2,
      espacio: { nombre: "Laboratorio de Informática" },
      fecha: "2025-09-22",
      hora: "10:00",
      estado: "PENDIENTE",
    },
    {
      id: 3,
      espacio: { nombre: "Gimnasio" },
      fecha: "2025-09-23",
      hora: "12:00",
      estado: "DENEGADA",
    },
  ]);

  // 🔹 Acción de cancelar (solo modifica el mock en memoria)
  const handleCancelar = (id) => {
    if (!window.confirm("¿Seguro que quieres cancelar esta reserva?")) return;
    setReservas((prev) =>
      prev.map((reserva) =>
        reserva.id === id ? { ...reserva, estado: "CANCELADA" } : reserva
      )
    );
  };

  const renderEstado = (estado) => {
    switch (estado) {
      case "APROBADA":
        return <Badge bg="success">Aprobada</Badge>;
      case "PENDIENTE":
        return <Badge bg="warning">Pendiente</Badge>;
      case "DENEGADA":
        return <Badge bg="danger">Denegada</Badge>;
      case "CANCELADA":
        return <Badge bg="secondary">Cancelada</Badge>;
      default:
        return <Badge bg="dark">{estado}</Badge>;
    }
  };

  return (
    <div className="container mt-4">
      <h2>Mis Reservas</h2>
      {reservas.length === 0 ? (
        <p>No tenés reservas realizadas.</p>
      ) : (
        <Table striped bordered hover className="mt-3">
          <thead>
            <tr>
              <th>Espacio</th>
              <th>Fecha</th>
              <th>Hora</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {reservas.map((reserva) => (
              <tr key={reserva.id}>
                <td>{reserva.espacio.nombre}</td>
                <td>{reserva.fecha}</td>
                <td>{reserva.hora}</td>
                <td>{renderEstado(reserva.estado)}</td>
                <td>
                  {reserva.estado === "PENDIENTE" ? (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleCancelar(reserva.id)}
                    >
                      Cancelar
                    </Button>
                  ) : (
                    <span className="text-muted">Sin acciones</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
