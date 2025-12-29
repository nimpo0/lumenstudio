import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Navbar.css";
import LoginAndSignup from "../authorization/loginAndSignup";
import { useAuth } from "../authorization/authContext";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const { user, logout, login, signup, authLoading } = useAuth();

  const navLinks = [
    { path: "/", label: "Головна" },
    { path: "/services", label: "Послуги" },
    { path: "/portfolio", label: "Портфоліо" },
    { path: "/photographers", label: "Фотографи" },
    { path: "/about", label: "Про нас" },
    { path: "/booking", label: "Забронювати", authOnly: true },
    { path: "/cabinet", label: "Кабінет", authOnly: true },
  ];

  const visibleLinks = navLinks.filter((l) => !l.authOnly || !!user);

  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  const onCabinetClick = (e) => {
    if (authLoading) return;
    if (!user) {
      e.preventDefault();
      setAuthOpen(true);
      return;
    }
  };

  const onBookingClick = (e) => {
    if (authLoading) return;
    if (!user) {
      e.preventDefault();
      setAuthOpen(true);
      return;
    }
  };

  return (
    <>
      <nav className="navbar">
        <div className="container navbar-container">
          <Link to="/" className="navbar-logo">Lumen Studio</Link>

          <button
            className="navbar-toggle"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            <span></span><span></span><span></span>
          </button>

          <ul className={`navbar-menu ${isOpen ? "active" : ""}`}>
            {visibleLinks.map((link) => (
              <li key={link.path}>
                <Link
                  to={link.path}
                  className={`navbar-link ${isActive(link.path) ? "active" : ""}`}
                  onClick={(e) => {
                    setIsOpen(false);
                    if (link.path === "/cabinet") onCabinetClick(e);
                    if (link.path === "/booking") onBookingClick(e);
                  }}
                >
                  {link.label}
                </Link>
              </li>
            ))}

            <li className="navbar-auth">
              {!user ? (
                <button className="navbar-auth-btn" onClick={() => setAuthOpen(true)}>
                  Увійти
                </button>
              ) : (
                <div className="navbar-user">
                  <button
                    className="navbar-auth-btn"
                    onClick={async () => {
                      await logout();
                      navigate("/");
                    }}
                  >
                    Вийти
                  </button>
                </div>
              )}
            </li>
          </ul>
        </div>
      </nav>

      <LoginAndSignup
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        onLogin={login}
        onSignUp={signup}
      />
    </>
  );
};

export default Navbar;
