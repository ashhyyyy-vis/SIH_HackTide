import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Auth from './components/Auth';
import PartnerMap from './components/PartnerMap';
import Schemes from './components/Schemes';
import Navbar from './components/Navbar';
import { useAuthStore } from './store/authStore';

function App() {
  const { token } = useAuthStore();

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {token && <Navbar />}
        <Routes>
          <Route path="/" element={<Auth />} />
          <Route path="/map" element={<PartnerMap />} />
          <Route path="/schemes" element={<Schemes />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
