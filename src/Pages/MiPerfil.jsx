import { useAuth } from "../Context/AuthContext";

export default function MiPerfil() {
  const { user } = useAuth();

  return (
    <div className="container mt-4">
      <h2 className="mb-4">Mi Perfil</h2>

      <div className="card shadow-sm">
        <div className="card-body">
          <h5 className="card-title mb-3">Información del usuario</h5>
          <div className="row mb-2">
            <div className="col-md-6">
              <p><strong>Nombre:</strong> {user?.nombre}</p>
            </div>
            <div className="col-md-6">
              <p><strong>Apellido:</strong> {user?.apellido}</p>
            </div>
          </div>
          <div className="row mb-2">
            <div className="col-md-6">
              <p><strong>Email:</strong> {user?.email}</p>
            </div>
            <div className="col-md-6">
              <p><strong>Rol:</strong> {user?.rol}</p>
            </div>
          </div>
          <div className="row">
            <div className="col-md-6">
              <p><strong>Estado:</strong> {user?.estado}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
