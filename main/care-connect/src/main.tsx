// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";

import App from "./App";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Browse from "./pages/Browse";
import AddMedicine from "./pages/AddMedicine";
import ItemDetails from "./pages/ItemDetails";
import Admin from "./pages/Admin";
import Profile from "./pages/Profile";
import { AuthProvider, Protected } from "./state/auth";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Browse /> },
      { path: "login", element: <Login /> },
      { path: "dashboard", element: <Protected><Dashboard /></Protected> },
      { path: "add-medicine", element: <Protected><AddMedicine /></Protected> },
      { path: "item/:id", element: <ItemDetails /> },
      { path: "admin", element: <Protected><Admin /></Protected> },
  { path: "profile", element: <Protected><Profile /></Protected> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>
);
