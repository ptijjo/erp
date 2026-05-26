"use client";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

/** Conteneur global des toasts (alertes temps réel, etc.). */
export function ToastHost() {
  return (
    <ToastContainer
      position="top-right"
      autoClose={6000}
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      pauseOnFocusLoss
      draggable
      theme="light"
      className="!top-16"
      toastClassName="!text-sm"
    />
  );
}
