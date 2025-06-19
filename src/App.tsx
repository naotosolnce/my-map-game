// src/App.tsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import GoogleLoginPage from './pages/GoogleLoginPage';
import RoleSelect from './pages/RoleSelect';
import OrganizerLoginPage from './pages/OrganizerLoginPage';
import OrganizerPage from './pages/OrganizerPage';
import UserPage from './pages/UserPage';
import MapPage from './pages/MapPage';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<GoogleLoginPage />} /> {/* ルートパスは GoogleLoginPage のみ */}
        <Route path="/role" element={<RoleSelect />} />
        <Route path="/organizer-login" element={<OrganizerLoginPage />} />
        <Route path="/organizer" element={<OrganizerPage />} />
        <Route path="/user" element={<UserPage />} />
        <Route path="/map/:areaId" element={<MapPage />} />
      </Routes>
    </Router>
  );
}