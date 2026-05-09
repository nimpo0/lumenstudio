import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Card from "../components/Card";
import Button from "../components/Button";
import LoginAndSignup from "../authorization/loginAndSignup";
import { useAuth } from "../authorization/authContext";
import "./Home.css";

import { dataApi } from "../api/data";

const formatUAH = (value, currency = "UAH") => {
  if (value == null) return "";
  const symbol = currency === "UAH" ? "₴" : currency;
  return `від ${Number(value).toLocaleString("uk-UA")} ${symbol}`;
};

const Home = () => {
  const [filter, setFilter] = useState("all");
  const [services, setServices] = useState([]);
  const [portfolioItems, setPortfolioItems] = useState([]);
  const [photographers, setPhotographers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const navigate = useNavigate();
  const { user, login, signup, loginWithGoogle, authLoading } = useAuth();

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        setLoading(true);
        setError("");

        const [servicesRaw, portfolioRaw, photographersRaw] = await Promise.all([
          dataApi.services(),
          dataApi.portfolio(),
          dataApi.photographers(),
        ]);

        const servicesData = (Array.isArray(servicesRaw) ? servicesRaw : [])
          .sort((a, b) => String(a.id).localeCompare(String(b.id), "uk", { numeric: true }))
          .slice(0, 4);

        const portfolioData = (Array.isArray(portfolioRaw) ? portfolioRaw : [])
          .sort((a, b) => String(a.id).localeCompare(String(b.id), "uk", { numeric: true }));

        const photographersData = (Array.isArray(photographersRaw) ? photographersRaw : [])
          .sort((a, b) => String(a.id).localeCompare(String(b.id), "uk", { numeric: true }))
          .slice(0, 3);

        setServices(servicesData);
        setPortfolioItems(portfolioData);
        setPhotographers(photographersData);
      } catch (e) {
        setError("Не вдалося завантажити дані головної сторінки. Спробуйте пізніше.");
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
  }, []);

  const filteredPortfolio = useMemo(() => {
    const base = filter === "all" ? portfolioItems : portfolioItems.filter((i) => i.category === filter);
    return base.slice(0, 3);
  }, [portfolioItems, filter]);

  return (
    <div className="home">
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <h1 className="hero-title">Професійна фотостудія у Києві</h1>
            <p className="hero-subtitle">
              Створюємо незабутні спогади з 2015 року. Від портретів до весільних фотосесій.
            </p>
            <div className="hero-buttons">
              <Button
                size="large"
                onClick={() => {
                  if (authLoading) return;
                  if (!user) {
                    setAuthOpen(true);
                    return;
                  }
                  navigate("/booking");
                }}
              >
                Забронювати зараз
              </Button>
              <Link to="/portfolio">
                <Button variant="secondary" size="large">Переглянути роботи</Button>
              </Link>
            </div>

            {loading && <p className="text-light" style={{ marginTop: 16 }}>Завантаження...</p>}
            {error && <p className="text-light" style={{ marginTop: 16, color: "crimson" }}>{error}</p>}
          </div>
        </div>
        <LoginAndSignup
          isOpen={authOpen}
          onClose={() => setAuthOpen(false)}
          onLogin={async (email, pass) => {
            await login(email, pass);
            setAuthOpen(false);
            navigate("/booking");
          }}
          onSignUp={async (email, pass, name) => {
            await signup(email, pass, name);
            setAuthOpen(false);
            navigate("/booking");
          }}
          onGoogleLogin={async () => {
            await loginWithGoogle();
            setAuthOpen(false);
            navigate("/booking");
          }}
        />
      </section>

      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2>Наші послуги</h2>
            <p className="text-light">Професійні фотопослуги для будь-якої події</p>
          </div>

          <div className="grid-4">
            {services.map((service) => (
              <Card
                key={service.id}
                image={service.image}
                title={service.title}
                description={service.shortDescription || service.description}
              >
                <div className="service-footer">
                  <span className="service-price">
                    {formatUAH(service.priceFrom, service.currency)}
                  </span>
                  <Link to="/services">
                    <Button size="small">Деталі</Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-dark">
        <div className="container">
          <div className="section-header">
            <h2>Наше портфоліо</h2>
            <p className="text-light">Приклади наших робіт</p>
          </div>

          <div className="portfolio-filters">
            <button
              className={`filter-btn ${filter === "all" ? "active" : ""}`}
              onClick={() => setFilter("all")}
              type="button"
            >
              Всі
            </button>
            <button
              className={`filter-btn ${filter === "portrait" ? "active" : ""}`}
              onClick={() => setFilter("portrait")}
              type="button"
            >
              Портрети
            </button>
            <button
              className={`filter-btn ${filter === "wedding" ? "active" : ""}`}
              onClick={() => setFilter("wedding")}
              type="button"
            >
              Весілля
            </button>
            <button
              className={`filter-btn ${filter === "family" ? "active" : ""}`}
              onClick={() => setFilter("family")}
              type="button"
            >
              Сім&apos;я
            </button>
            <button
              className={`filter-btn ${filter === "business" ? "active" : ""}`}
              onClick={() => setFilter("business")}
              type="button"
            >
              Бізнес
            </button>
          </div>

          <div className="portfolio-grid">
            {filteredPortfolio.map((item) => (
              <div key={item.id} className="portfolio-item">
                <img src={item.image} alt={item.title || "Portfolio item"} loading="lazy" />
              </div>
            ))}
          </div>

          <div className="section-cta">
            <Link to="/portfolio">
              <Button size="large">Переглянути все портфоліо</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2>Наші фотографи</h2>
            <p className="text-light">Команда професіоналів з великим досвідом</p>
          </div>

          <div className="grid-3">
            {photographers.map((p) => (
              <Card key={p.id} image={p.image} title={p.name}>
                <div className="photographer-info">
                  <span className="badge badge-accent">{p.specialty}</span>
                  <p className="text-small text-light">
                    {p.experienceLabel || (p.experienceYears ? `${p.experienceYears} років досвіду` : "")}
                  </p>
                  <Link to="/photographers">
                    <Button size="small">Переглянути профіль</Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
