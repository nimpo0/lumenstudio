import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Services from './pages/Services';
import Portfolio from './pages/Portfolio';
import Photographers from './pages/Photographers';
import About from './pages/About';
import Booking from './pages/Booking';
import Cabinet from './pages/Cabinet';
import Admin from './pages/Admin';
import Studios from './pages/Studios';
import AuthCallback from './pages/AuthCallback';
import ProtectedRoute from "./authorization/protectedRoute";
import { AuthProvider } from "./authorization/authContext";
import '../styles/app.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app">
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/services" element={<Services />} />
              <Route path="/portfolio" element={<Portfolio />} />
              <Route path="/photographers" element={<Photographers />} />
              <Route path="/about" element={<About />} />
              <Route path="/studios" element={<Studios />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route
                path="/booking"
                element={
                  <ProtectedRoute roles={["client"]}>
                    <Booking />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/cabinet/*"
                element={
                  <ProtectedRoute>
                    <Cabinet />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/*"
                element={
                  <ProtectedRoute roles={["admin"]}>
                    <Admin />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
