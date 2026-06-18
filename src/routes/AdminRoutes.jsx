import { Routes, Route, Navigate } from "react-router-dom";
import AdminHomeScreen             from "../screens/admin/AdminHomeScreen";
import AdminDepartamentosScreen    from "../screens/admin/AdminDepartamentosScreen";
import AdminCarrerasScreen         from "../screens/admin/AdminCarrerasScreen";
import AdminDetalleCarrerasScreen  from "../screens/admin/AdminDetalleCarrerasScreen";
import AdminSeccionesScreen        from "../screens/admin/AdminSeccionesScreen";
import AdminSalasScreen            from "../screens/admin/AdminSalasScreen";
import AdminNexusMatchScreen       from "../screens/admin/AdminNexusMatchScreen";

export default function AdminRoutes() {
  return (
    <Routes>
      <Route path="home"             element={<AdminHomeScreen />}            />
      <Route path="departamentos"    element={<AdminDepartamentosScreen />}   />
      <Route path="carreras"         element={<AdminCarrerasScreen />}        />
      <Route path="detalle-carreras" element={<AdminDetalleCarrerasScreen />} />
      <Route path="secciones"        element={<AdminSeccionesScreen />}       />
      <Route path="salas"            element={<AdminSalasScreen />}           />
      <Route path="nexus-match"      element={<AdminNexusMatchScreen />} />
      <Route path="*"                element={<Navigate to="home" replace />} />
    </Routes>
  );
}