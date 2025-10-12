import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useAuth } from "../Context/AuthContext";
import TablaDetalle from "../Components/TablaDetalles";
import RenderCampos from "../Components/RenderCampos";
import RenderCamposEditable from "../Components/RenderCamposEditables";
import { camposUsuario } from "../Entidades/camposUsuario";
import { camposUsuarioVista } from "../Entidades/camposUsuarioVista";
import { actualizarUsuario, obtenerUsuarios } from "../Services/UsuarioService";
import { toast } from "react-toastify";

export default function UsuarioDetalle() {
	const { id } = useParams();
	const location = useLocation();
	const usuarioState = location.state;
	const { user } = useAuth();
	const token = user?.token;

	const [usuario, setUsuario] = useState(usuarioState || null);
	const [formData, setFormData] = useState(() => {
		const u = usuarioState || {};
		return {
			id: u.id || null,
			name: u.name || "",
			lastName: u.lastName || "",
			email: u.email || "",
			password: "",
			role: typeof u.role === "string" ? u.role : (u.role?.name || ""),
		};
	});

	// Cargar usuario desde el listado si no vino por state
	useEffect(() => {
		const cargar = async () => {
			if (!token) return;
			if (usuarioState) return; // ya lo tenemos
			try {
				const lista = await obtenerUsuarios(token);
				const u = (lista || []).find(x => String(x.id) === String(id));
				if (u) {
					setUsuario(u);
					setFormData({
						id: u.id || null,
						name: u.name || "",
						lastName: u.lastName || "",
						email: u.email || "",
						password: "",
						role: typeof u.role === "string" ? u.role : (u.role?.name || ""),
					});
				}
			} catch (e) {
				console.error(e);
				toast.error(e.message || "Error cargando usuario");
			}
		};
		cargar();
	}, [token, id, usuarioState]);

	const handleSave = async () => {
		try {
			if (formData.password && formData.password.length < 5) {
				toast.error("La contraseña debe tener como mínimo 5 caracteres");
				return;
			}
			const payload = {
				id: formData.id,
				name: formData.name,
				lastName: formData.lastName,
				email: formData.email,
				...(formData.password?.trim() ? { password: formData.password } : {}),
				rol: formData.role,
			};

			await actualizarUsuario(token, payload);
			toast.success("Usuario actualizado con éxito");
			setUsuario(prev => ({
				...prev,
				name: payload.name,
				lastName: payload.lastName,
				email: payload.email,
				role: payload.rol || prev?.role,
			}));
			// limpiar password del form
			setFormData(f => ({ ...f, password: "" }));
		} catch (e) {
			const msg = e.response?.data?.errors?.password || e.response?.data?.mensaje || e.message || "Error al actualizar usuario";
			toast.error(msg);
		}
	};

	const handleCancel = () => {
		if (usuario) {
			setFormData({
				id: usuario.id || null,
				name: usuario.name || "",
				lastName: usuario.lastName || "",
				email: usuario.email || "",
				password: "",
				role: typeof usuario.role === "string" ? usuario.role : (usuario.role?.name || ""),
			});
		}
	};

	const titulo = usuario ? `${usuario.name || ""} ${usuario.lastName || ""}`.trim() || "Usuario" : "Usuario";
	const subtitulo = (() => {
		const email = usuario?.email || formData.email;
		const roleValue = typeof (usuario?.role) === 'string' ? usuario.role : (usuario?.role?.name || formData.role);
		let roleLabel = "";
		switch (roleValue) {
			case 'ROLE_ADMIN': roleLabel = 'Admin'; break;
			case 'ROLE_DIRECTOR': roleLabel = 'Director'; break;
			case 'ROLE_DOCENTE': roleLabel = 'Docente'; break;
			case 'ROLE_PRECEPTOR': roleLabel = 'Preceptor'; break;
			default: roleLabel = '';
		}
		return [email, roleLabel && `Rol: ${roleLabel}`].filter(Boolean).join(' • ');
	})();

	return (
		<TablaDetalle
			titulo={titulo}
			subtitulo={subtitulo}
			onSave={handleSave}
			onCancel={handleCancel}
			tabs={[
				{
					id: "datos",
					label: "Datos del usuario",
					content: (modoEditar) =>
						!modoEditar ? (
							<RenderCampos campos={camposUsuarioVista} data={{
								name: usuario?.name ?? formData.name,
								lastName: usuario?.lastName ?? formData.lastName,
								email: usuario?.email ?? formData.email,
								role: usuario?.role ?? formData.role,
							}} />
						) : (
							<RenderCamposEditable
								campos={camposUsuario}
								formData={formData}
								setFormData={setFormData}
							/>
						),
				},
			]}
		/>
	);
}

