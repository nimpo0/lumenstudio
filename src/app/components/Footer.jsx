import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <h3 className="footer-title">Lumen Studio</h3>
            <p className="footer-text">
              Професійна фотостудія у Києві. Створюємо незабутні спогади.
            </p>
          </div>
          
          <div className="footer-section">
            <h4 className="footer-heading">Контакти</h4>
            <ul className="footer-contacts">
              <li>
                <span className="footer-icon"></span>
                м. Київ, вул. Хрещатик, 1
              </li>
              <li>
                <span className="footer-icon"></span>
                +380 98 98 989
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
