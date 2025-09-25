import "./SideBar.css";
import { useAuth } from "../../Context/AuthContext";
import { Link } from "react-router-dom";
import {
  FaDoorOpen, FaCaretDown, FaCaretUp, FaUserCircle
} from "react-icons/fa";
import { useState } from "react";
import { menuConfig } from "../../config/menuConfig";

export default function SidebarLayout() {
  const { user, logout } = useAuth();
  const [openMenu, setOpenMenu] = useState(null);

  const toggleMenu = (menu) => {
    setOpenMenu(openMenu === menu ? null : menu);
  };

  // 🔹 Función para mostrar el rol en texto legible
  const getRolNombre = (rol) => {
    if (!rol) return "";
    switch (rol) {
      case "ROLE_ADMIN": return "Administrador";
      case "ROLE_DOCENTE": return "Docente";
      case "ROLE_PRECEPTOR": return "Preceptor";
      case "ROLE_DIRECTOR": return "Director";
      case "ROLE_TUTOR": return "Tutor";
      default: return rol.replace("ROLE_", "").toLowerCase();
    }
  };

  return (
    <div className="sidebar d-flex flex-column bg-dark text-white p-3">
      
      {/* 🔹 Header de usuario */}
      <div className="user-header text-center mb-4 pt-4">
        <img
          src={
            user?.fotoPerfil ||
            "https://ui-avatars.com/api/?name=" + encodeURIComponent(`${user?.nombre || ""} ${user?.apellido || ""}`.trim())
          }
          alt="Perfil"
          className="profile-pic mb-2"
        />
        <h5 className="mb-0">{user?.nombre || "Usuario"}</h5>
        <small className="user-role fw-bold">
          {getRolNombre(user?.rol)}
        </small>
      </div>

      {/* 🔹 Menú dinámico */}
      <div className="flex-grow-1">
        {menuConfig
          .filter((item) => item.roles.includes(user?.rol))
          .map((item, index) => {
            const Icon = item.icon;
            const hasSubItems = !!item.subItems;

            return (
              <div key={index} className="mb-2">
                {hasSubItems ? (
                  <>
                    {/* Menú con subitems */}
                    <button
                      className="menu-btn w-100 text-start d-flex align-items-center justify-content-between"
                      onClick={() => toggleMenu(index)}
                    >
                      <span>
                        <Icon className="me-2" /> {item.label}
                      </span>
                      {openMenu === index ? <FaCaretUp /> : <FaCaretDown />}
                    </button>

                    {openMenu === index && (
                      <div className="submenu ps-4">
                        {item.subItems
                          .filter(
                            (sub) => !sub.roles || sub.roles.includes(user?.rol)
                          )
                          .map((sub, i) => (
                            <Link key={i} to={sub.path} className="submenu-link">
                              {sub.label}
                            </Link>
                          ))}
                      </div>
                    )}
                  </>
                ) : (
                  /* Menú simple con ícono y link */
                  <Link
                    to={item.path}
                    className="menu-link d-flex align-items-center"
                  >
                    <Icon className="me-2" /> {item.label}
                  </Link>
                )}
              </div>
            );
          })}
      </div>

      {/* 🔹 Perfil / Logout */}
      <div className="mt-auto pt-3 border-top">
        <Link to="/mi-perfil" className="menu-link d-flex align-items-center mb-2">
          <FaUserCircle className="me-2" /> Mi Perfil
        </Link>
        <button
          className="menu-link btn-logout w-100 text-start"
          onClick={logout}
        >
          <FaDoorOpen className="me-2" /> Cerrar sesión
        </button>
      </div>
    </div>
  );
}
