import React from 'react';
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AppRoutes from './Routes/AppRoutes';

function App() {
  return (
  <>
    <AppRoutes />
    <ToastContainer position="bottom-right" autoClose={3000} theme="colored" />
  </>
  );
}

export default App;
