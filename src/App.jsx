import React from 'react';
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AppRoutes from './Routes/AppRoutes';

function App() {
  return (
  <>
    <AppRoutes />
    <ToastContainer
      position="top-right"
      autoClose={3000}
      theme="light"
      newestOnTop
      closeOnClick
      pauseOnFocusLoss
      draggable
      pauseOnHover
    />
  </>
  );
}

export default App;
