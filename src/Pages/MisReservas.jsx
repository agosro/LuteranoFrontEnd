import React, { useEffect, useMemo, useState } from "react";
import { Table, Button, Badge, Spinner } from "react-bootstrap";
import { isoToDisplay } from "../utils/fechas";
import { useAuth } from "../Context/AuthContext";
import { obtenerReservas, cancelarReserva } from "../Services/ReservaService";
import { listarEspaciosAulicos } from "../Services/EspacioAulicoService";
import { listarCursos } from "../Services/CursoService";
import { toast } from "react-toastify";
import Breadcrumbs from "../Components/Botones/Breadcrumbs";
import BackButton from "../Components/Botones/BackButton";
import ConfirmarAccion from "../Components/Modals/ConfirmarAccion";

export default function MisReservas() {
  const { user } = useAuth();
  const token = user?.token;
  const userId = user?.userId; // del AuthContext

  const [cargando, setCargando] = useState(true);
  const [reservas, setReservas] = useState([]);
  const [espaciosMap, setEspaciosMap] = useState({});
  const [cursosMap, setCursosMap] = useState({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [reservaSeleccionada, setReservaSeleccionada] = useState(null);

  const cargarDatos = async () => {
    if (!token || !userId) return;
    setCargando(true);
    try {
      const [resList, espaciosList, cursosList] = await Promise.all([
        obtenerReservas(token, { usuarioId: userId }),
        listarEspaciosAulicos(token).catch(() => []),
        listarCursos(token).catch(() => []),
      ]);
      const mias = Array.isArray(resList?.reservaEspacioDtos)
        ? resList.reservaEspacioDtos
        : [];
      setReservas(mias);

      const emap = (espaciosList || []).reduce((acc, e) => {
        acc[e.id] = e;
        return acc;
      }, {});
      const cmap = (cursosList || []).reduce((acc, c) => {
        acc[c.id] = c;
        return acc;
      }, {});
      setEspaciosMap(emap);
      setCursosMap(cmap);
    } catch (e) {
      console.error(e);
      toast.error(e?.message || "Error cargando mis reservas");
      setReservas([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, userId]);

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

  const solicitarCancelacion = (reserva) => {
    setReservaSeleccionada(reserva);
    setShowConfirm(true);
  };

  const confirmarCancelacion = async () => {
    if (!reservaSeleccionada) return;
    setConfirming(true);
    try {
      await cancelarReserva(reservaSeleccionada.id, token);
      toast.success("Reserva cancelada");
      setReservas((prev) =>
        prev.map((r) => (r.id === reservaSeleccionada.id ? { ...r, estado: "CANCELADA" } : r))
      );
      setShowConfirm(false);
      setReservaSeleccionada(null);
    } catch (e) {
      toast.error(e?.message || "No se pudo cancelar");
    } finally {
      setConfirming(false);
    }
  };

  const reservasOrdenadas = useMemo(() => {
    return [...reservas].sort((a, b) => {
      // Ordenar por fecha DESC (más nuevas/lejanas primero), luego módulo DESC, luego id DESC
      const fa = a.fecha || "";
      const fb = b.fecha || "";
      if (fa !== fb) return fb.localeCompare(fa); // DESC por string YYYY-MM-DD
      const oa = a.modulo?.orden ?? 0;
      const ob = b.modulo?.orden ?? 0;
      if (oa !== ob) return ob - oa; // DESC por módulo
      const ia = Number(a.id) || 0;
      const ib = Number(b.id) || 0;
      return ib - ia; // DESC por id
    });
  }, [reservas]);

  return (
    <div className="container mt-4">
      <Breadcrumbs />
      <BackButton />

      <div className="card mt-3">
        <div className="card-body">
          <div className="d-flex align-items-center justify-content-between">
            <h3 className="mb-0">Mis Reservas</h3>
            <Button size="sm" variant="outline-secondary" onClick={cargarDatos} disabled={cargando}>
              {cargando ? <Spinner size="sm" /> : "Refrescar"}
            </Button>
          </div>

          {cargando ? (
            <div className="mt-3 text-muted">Cargando...</div>
          ) : reservasOrdenadas.length === 0 ? (
            <p className="mt-3">No tenés reservas realizadas.</p>
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
                  <th>Motivo</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {reservasOrdenadas.map((r) => {
                  const espacio = espaciosMap[r.espacioAulicoId];
                  const curso = cursosMap[r.cursoId];
                  const cursoLabel = curso ? `${curso.anio ?? ''}°${curso.division ?? ''}` : r.cursoId;
                  const moduloLabel = r.modulo ? `${r.modulo.orden} (${r.modulo.desde} - ${r.modulo.hasta})` : r.moduloId || "";
                  const motivoCol = r.estado === "DENEGADA" ? (r.motivoDenegacion || "-") : (r.motivoSolicitud || "-");
                  const puedeCancelar = r.estado === "PENDIENTE" || r.estado === "APROBADA";
                  return (
                    <tr key={r.id}>
                      <td>#{r.id}</td>
                      <td>{cursoLabel}</td>
                      <td>{espacio?.nombre || r.espacioAulicoId}</td>
                      <td>{isoToDisplay(r.fecha)}</td>
                      <td>{moduloLabel}</td>
                      <td>{renderEstado(r.estado)}</td>
                      <td>{motivoCol}</td>
                      <td>
                        {puedeCancelar ? (
                          <Button variant="danger" size="sm" onClick={() => solicitarCancelacion(r)}>
                            Cancelar
                          </Button>
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
      <ConfirmarAccion
        show={showConfirm}
        title="Confirmar cancelación"
        message={
          reservaSeleccionada ? (
            <>
              ¿Querés cancelar la reserva #{reservaSeleccionada.id} del día {isoToDisplay(reservaSeleccionada.fecha)} en el módulo {reservaSeleccionada.modulo?.orden}?
            </>
          ) : (
            "¿Querés cancelar esta reserva?"
          )
        }
        confirmText="Cancelar reserva"
        confirmBtnClass="btn-danger"
        onConfirm={confirmarCancelacion}
        onClose={() => { if (!confirming) { setShowConfirm(false); setReservaSeleccionada(null); } }}
        loading={confirming}
      />
    </div>
  );
}
