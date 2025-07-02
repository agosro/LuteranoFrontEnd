// src/layout/DashboardLayout.jsx
import Sidebar from '../Components/SideBar/SideBar';
import Header from '../Components/Header/Header';
import Footer from '../Components/Footer/Footer';
import { Outlet } from 'react-router-dom';

export default function DashboardLayout() {
    return (
        <div className="d-flex" style={{ minHeight: '100vh' }}>
            <Sidebar />
        <div className="flex-grow-1 d-flex flex-column">
            <Header />
            <main className="flex-grow-1 p-4">
                <Outlet /> {/* Acá se carga cada página interna */}
            </main>
            <Footer />
        </div>
    </div>
    );
}
