// src/layout/DashboardLayout.jsx
import Sidebar from '../Components/SideBar/SideBar';
import Header from '../Components/Header/Header';
import Footer from '../Components/Footer/Footer';
import { Outlet } from 'react-router-dom';

export default function DashboardLayout() {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar a la izquierda */}
      <div style={{ width: '250px', backgroundColor: '#212529', color: 'white' }}>
        <Sidebar />
      </div>

      {/* Contenedor principal */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ flexShrink: 0 }}>
          <Header />
        </div>

        {/* Contenido principal */}
        <div style={{ flex: 1, overflowY: 'auto', backgroundColor: '#f8f9fa', padding: '1rem' }}>
          <Outlet />
        </div>

        {/* Footer */}
        <div style={{ flexShrink: 0 }}>
          <Footer />
        </div>
      </div>
    </div>
  );
}