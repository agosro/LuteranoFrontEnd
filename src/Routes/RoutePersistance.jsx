import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../Context/AuthContext";

export default function RoutePersistence() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const restoredOnceRef = useRef(false);
  const [ready, setReady] = useState(false);

  // Marcar ready cuando user se haya evaluado (primer render + efecto de AuthContext)
  useEffect(() => {
    // Si AuthContext ya evaluó (user null o set), consideramos listo
    setReady(true);
  }, [user]);

  // Guardar última ruta (excepto login)
  useEffect(() => {
    if (location.pathname !== "/login") {
      localStorage.setItem("ultimaRuta", location.pathname + location.search);
    }
  }, [location.pathname, location.search]);

  // Restaurar ruta: si recargo en cualquier lado y hay ultimaRuta distinta a /, ir ahí SOLO una vez
  useEffect(() => {
    if (!ready || restoredOnceRef.current) return;
    const storedUser = JSON.parse(localStorage.getItem("user"));
    const ultimaRuta = localStorage.getItem("ultimaRuta");
    if (storedUser && ultimaRuta && ultimaRuta !== "/" && location.pathname === "/") {
      restoredOnceRef.current = true;
      navigate(ultimaRuta, { replace: true });
    }
  }, [ready, location.pathname, navigate]);

  return null;
}
