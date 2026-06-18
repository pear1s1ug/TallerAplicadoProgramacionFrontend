import { Routes, Route, Navigate } from "react-router-dom";
import ProfesorHorarioScreen from "../screens/profesor/ProfesorHorarioScreen";
import ProfesorDisponibilidadScreen from "../screens/profesor/ProfesorDisponibilidadScreen";

export default function ProfesorRoutes() {
  return (
    <Routes>
      <Route path="horario" element={<ProfesorHorarioScreen />} />
      <Route path="disponibilidad" element={<ProfesorDisponibilidadScreen />} />
      <Route path="*"       element={<Navigate to="horario" replace />} />
    </Routes>
  );
}