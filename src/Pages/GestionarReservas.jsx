import React, { useEffect, useMemo, useState } from "react";
import { Table, Button, Badge, Spinner, Form, Modal } from "react-bootstrap";
import { isoToDisplay } from "../utils/fechas";
import { useAuth } from "../Context/AuthContext";
import { listarReservas, aprobarReserva, denegarReserva } from "../Services/ReservaService";
import { listarEspaciosAulicos } from "../Services/EspacioAulicoService";
import { listarCursos } from "../Services/CursoService";
import { toast } from "react-toastify";
import Breadcrumbs from "../Components/Botones/Breadcrumbs";
import BackButton from "../Components/Botones/BackButton";

export default function GestionarReservas() {
  const { user } = useAuth();
  const token = user?.token;

  const [cargando, setCargando] = useState(true);
  const [reservas, setReservas] = useState([]);
  const [espaciosMap, setEspaciosMap] = useState({});
  const [cursosMap, setCursosMap] = useState({});
  const [filtroEstado, setFiltroEstado] = useState("TODOS");
  const [showModalDenegar, setShowModalDenegar] = useState(false);
  const [motivoDenegacion, setMotivoDenegacion] = useState("");
  const [reservaSeleccionada, setReservaSeleccionada] = useState(null);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [resList, espaciosList, cursosList] = await Promise.all([
        listarReservas(token),
        listarEspaciosAulicos(token).catch(() => []),
        listarCursos(token).catch(() => []),
      ]);
      setReservas(Array.isArray(resList?.reservaEspacioDtos) ? resList.reservaEspacioDtos : []);
      const emap = (espaciosList || []).reduce((acc, e) => { acc[e.id] = e; return acc; }, {});
      const cmap = (cursosList || []).reduce((acc, c) => { acc[c.id] = c; return acc; }, {});
      setEspaciosMap(emap);
      setCursosMap(cmap);
    } catch (e) {
      toast.error(e?.message || "Error cargando reservas");
      setReservas([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { if (token) cargarDatos(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const reservasFiltradas = useMemo(() => {
    if (filtroEstado === "TODOS") return reservas;
    return reservas.filter(r => String(r.estado) === String(filtroEstado));
  }, [reservas, filtroEstado]);

  const renderEstado = (estado) => {
    switch (estado) {
      case "APROBADA":
        return <Badge bg="success">Aprobada</Badge>;
      case "PENDIENTE":
        return <Badge bg="warning">Pendiente</Badge>;
      case "DENEGADA":
        return <Badge bg="danger">Denegada</Badge>;
      default:
        return <Badge bg="secondary">{estado}</Badge>;
    }
  };

  const handleAprobar = async (id) => {
    try {
      await aprobarReserva(id, token);
      toast.success("Reserva aprobada");
      setReservas(prev => prev.map(r => r.id === id ? { ...r, estado: "APROBADA" } : r));
    } catch (e) {
      toast.error(e?.message || "No se pudo aprobar");
    }
  };

  const handleDenegarClick = (id) => {
    setReservaSeleccionada(id);
    setMotivoDenegacion("");
    setShowModalDenegar(true);
  };

  const handleConfirmarDenegacion = async () => {
    if (!motivoDenegacion.trim()) {
      toast.info("Debés ingresar un motivo");
      return;
    }
    try {
      await denegarReserva(reservaSeleccionada, motivoDenegacion.trim(), token);
      toast.success("Reserva denegada");
      setReservas(prev => prev.map(r => r.id === reservaSeleccionada ? { ...r, estado: "DENEGADA", motivoDenegacion: motivoDenegacion.trim() } : r));
      setShowModalDenegar(false);
      setReservaSeleccionada(null);
      setMotivoDenegacion("");
    } catch (e) {
      toast.error(e?.message || "No se pudo denegar");
    }
  };

  return (
    <div className="container mt-4">
      <Breadcrumbs />
      <BackButton />

      <div className="card mt-3">
        <div className="card-body">
          <div className="d-flex align-items-center justify-content-between">
            <h3 className="mb-0">Gestionar Reservas</h3>
            <div className="d-flex align-items-center gap-2">
              <Form.Select size="sm" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                <option value="TODOS">Todos</option>
                <option value="PENDIENTE">Pendientes</option>
                <option value="APROBADA">Aprobadas</option>
                <option value="DENEGADA">Denegadas</option>
              </Form.Select>
              <Button size="sm" variant="outline-secondary" onClick={cargarDatos} disabled={cargando}>
                {cargando ? <Spinner size="sm" /> : "Refrescar"}
              </Button>
            </div>
          </div>

          {cargando ? (
            <div className="mt-3 text-muted">Cargando reservas...</div>
          ) : reservasFiltradas.length === 0 ? (
            <p className="mt-3">No hay reservas registradas.</p>
          ) : (
            <Table striped bordered hover className="mt-3">
              <thead>
                <tr>
                  <th>Reserva</th>
                  <th>Curso</th>
                  <th>Espacio</th>
                  <th>Fecha</th>
                  <th>Módulo</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {reservasFiltradas.map((r) => {
                  const espacio = espaciosMap[r.espacioAulicoId];
                  const curso = cursosMap[r.cursoId];
                  const cursoLabel = curso ? `${curso.anio ?? ''}°${curso.division ?? ''}` : r.cursoId;
                  const moduloLabel = r.modulo ? `${r.modulo.orden} (${r.modulo.desde} - ${r.modulo.hasta})` : r.moduloId || "";
                  return (
                    <tr key={r.id}>
                      <td>#{r.id}</td>
                      <td>{cursoLabel}</td>
                      <td>{espacio?.nombre || r.espacioAulicoId}</td>
                      <td>{isoToDisplay(r.fecha)}</td>
                      <td>{moduloLabel}</td>
                      <td>{renderEstado(r.estado)}</td>
                      <td>
                        {String(r.estado) === "PENDIENTE" ? (
                          <div className="d-flex gap-2">
                            <Button variant="success" size="sm" onClick={() => handleAprobar(r.id)}>Aprobar</Button>
                            <Button variant="danger" size="sm" onClick={() => handleDenegarClick(r.id)}>Denegar</Button>
                          </div>
                        ) : (
                          <span className="text-muted">Sin acciones</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </div>
      </div>

      <Modal show={showModalDenegar} onHide={() => setShowModalDenegar(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Denegar Reserva</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Motivo de la denegación</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder="Ingresá el motivo por el cual deniega esta reserva..."
              value={motivoDenegacion}
              onChange={(e) => setMotivoDenegacion(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModalDenegar(false)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleConfirmarDenegacion} disabled={!motivoDenegacion.trim()}>
            Denegar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
