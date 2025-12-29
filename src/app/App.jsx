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
              <Route
                path="/booking"
                element={
                  <ProtectedRoute>
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
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
