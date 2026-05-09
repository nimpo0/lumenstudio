import React, { useEffect, useMemo, useState } from "react";
import Card from "../components/Card";
import Button from "../components/Button";
import Modal from "../components/Modal";
import { useNavigate } from "react-router-dom";
import "./Services.css";
import { serviceReviewsApi } from "../api/servicesReviews";
import LoginAndSignup from "../authorization/loginAndSignup";
import { useAuth } from "../authorization/authContext";
import { dataApi } from "../api/data";

const formatUAH = (value, currency = "UAH") => {
  if (value == null) return "";
  const symbol = currency === "UAH" ? "₴" : currency;
  return `від ${Number(value).toLocaleString("uk-UA")} ${symbol}`;
};

const ServiceReviews = ({ serviceId }) => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loadingR, setLoadingR] = useState(true);
  const [errR, setErrR] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const load = async () => {
    try {
      setLoadingR(true);
      setErrR("");
      const data = await serviceReviewsApi.list(serviceId);
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setErrR("Не вдалося завантажити відгуки.");
      setItems([]);
    } finally {
      setLoadingR(false);
    }
  };

  useEffect(() => {
    if (!serviceId) return;
    setMsg("");
    setComment("");
    setRating(5);
    load();
  }, [serviceId]);

  const avg = useMemo(() => {
    if (!items.length) return "0.0";
    const s = items.reduce((acc, x) => acc + Number(x.rating || 0), 0);
    return (s / items.length).toFixed(1);
  }, [items]);

  return (
    <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid rgba(0,0,0,0.08)" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <h3 style={{ margin: 0 }}>Відгуки</h3>
        <span className="text-light">
          {items.length ? `★ ${avg} / 5 (${items.length})` : "Поки що немає відгуків"}
        </span>
      </div>

      {loadingR && <p className="text-light" style={{ marginTop: 10 }}>Завантаження...</p>}
      {errR && <p className="text-light" style={{ color: "crimson", marginTop: 10 }}>{errR}</p>}

      {!loadingR && !errR && items.slice(0, 3).map((r) => (
        <div key={r.id} style={{ marginTop: 10, padding: 12, borderRadius: 14, border: "1px solid rgba(0,0,0,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div style={{ fontWeight: 600 }}>★ {r.rating} / 5</div>

            <div style={{ textAlign: "right" }}>
              <div className="text-small text-light">{r.userEmail || "Користувач"}</div>
              <div className="text-small text-light">
                {r.createdAt ? new Date(r.createdAt).toLocaleString("uk-UA") : ""}
              </div>
            </div>
          </div>

          {r.comment && <div style={{ marginTop: 6 }}>{r.comment}</div>}
        </div>
      ))}

      {user ? (
        <div style={{ marginTop: 14, padding: 12, borderRadius: 14, background: "rgba(0,0,0,0.03)" }}>
          <div className="text-small text-light" style={{ marginBottom: 8 }}>Залишити відгук</div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            {[1,2,3,4,5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                style={{
                  padding: "8px 10px",
                  borderRadius: 12,
                  border: n === rating ? "2px solid var(--accent)" : "1px solid rgba(0,0,0,0.12)",
                  background: "white",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                {n} ★
              </button>
            ))}
          </div>

          <textarea
            className="input"
            rows={3}
            placeholder="Ваш відгук..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            style={{ width: "100%", resize: "vertical" }}
          />

          <div style={{ marginTop: 10 }}>
            <Button
              size="small"
              disabled={saving}
              onClick={async () => {
                try {
                  setSaving(true);
                  setMsg("");
                  await serviceReviewsApi.save({ serviceId, rating, comment });
                  setMsg("Збережено");
                  setComment("");
                  setRating(5);
                  await load();
                } catch (e) {
                  setMsg("Не вдалося зберегти");
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? "Збереження..." : "Зберегти відгук"}
            </Button>
          </div>
          {msg && <div className="text-light" style={{ marginTop: 8 }}>{msg}</div>}
        </div>
      ) : (
        <p className="text-light" style={{ marginTop: 12 }}>
          Увійдіть, щоб залишити відгук.
        </p>
      )}
    </div>
  );
};

const Services = () => {
  const [selectedService, setSelectedService] = useState(null);
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [priceFilter, setPriceFilter] = useState("all");
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const { user, login, signup, loginWithGoogle, authLoading } = useAuth();

  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await dataApi.services();
        setServices(Array.isArray(data) ? data : []);
      } catch (e) {
        setError("Не вдалося завантажити послуги. Спробуйте пізніше.");
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  const handleSelectPhotographer = (service) => {
    navigate("/photographers", { state: { selectedService: service } });
  };

  const servicesWithPrice = useMemo(() => {
    return services.map((s) => ({
      ...s,
      priceValue: Number(s.priceFrom || 0),
      priceText: formatUAH(s.priceFrom, s.currency),
    }));
  }, [services]);

  const filteredServices = useMemo(() => {
    const q = query.trim().toLowerCase();

    return servicesWithPrice.filter((s) => {
      const matchesQuery =
        !q ||
        String(s.title || "").toLowerCase().includes(q) ||
        String(s.shortDescription || "").toLowerCase().includes(q) ||
        String(s.fullDescription || "").toLowerCase().includes(q);

      let matchesPrice = true;
      if (priceFilter === "upTo3000") matchesPrice = s.priceValue < 3000;
      if (priceFilter === "upTo5000") matchesPrice = s.priceValue < 5000;
      if (priceFilter === "from7000") matchesPrice = s.priceValue >= 7000;

      return matchesQuery && matchesPrice;
    });
  }, [servicesWithPrice, query, priceFilter]);

  const filterLabel = useMemo(() => {
    if (priceFilter === "upTo3000") return "до 3000 ₴";
    if (priceFilter === "upTo5000") return "до 5000 ₴";
    if (priceFilter === "from7000") return "від 7000 ₴";
    return "усі ціни";
  }, [priceFilter]);

  const hasAnyFilter = query.trim() || priceFilter !== "all";

  return (
    <div className="services-page">
      <section className="page-header">
        <div className="container">
          <h1>Наші послуги</h1>
          <p className="text-large text-light">
            Професійні фотопослуги для будь-якої події та потреби
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="services-controls-lite">
            <div className="services-search-lite">
              <label className="label">Пошук</label>
              <input
                className="input"
                type="text"
                placeholder="Портрет, весільна, сімейна…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <div className="services-chips-lite">
              <div className="chips-label text-small text-light">Ціна</div>
              <div className="chips-row">
                <button
                  className={`chip-lite ${priceFilter === "all" ? "active" : ""}`}
                  onClick={() => setPriceFilter("all")}
                  type="button"
                >
                  Усі
                </button>
                <button
                  className={`chip-lite ${priceFilter === "upTo3000" ? "active" : ""}`}
                  onClick={() => setPriceFilter("upTo3000")}
                  type="button"
                >
                  до 3000 ₴
                </button>
                <button
                  className={`chip-lite ${priceFilter === "upTo5000" ? "active" : ""}`}
                  onClick={() => setPriceFilter("upTo5000")}
                  type="button"
                >
                  до 5000 ₴
                </button>
                <button
                  className={`chip-lite ${priceFilter === "from7000" ? "active" : ""}`}
                  onClick={() => setPriceFilter("from7000")}
                  type="button"
                >
                  від 7000 ₴
                </button>

                {hasAnyFilter && (
                  <button
                    className="chip-lite ghost"
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setPriceFilter("all");
                    }}
                    aria-label="Скинути фільтри"
                    title="Скинути фільтри"
                  >
                    Скинути
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="services-meta-row">
            <div className="text-small text-light">
              {query.trim() ? `Пошук: “${query.trim()}” · ${filterLabel}` : `Фільтр: ${filterLabel}`}
            </div>
            <div className="text-small">
              <strong>{filteredServices.length}</strong> послуг(и)
            </div>
          </div>

          {loading && <p className="text-light">Завантаження...</p>}
          {error && <p className="text-light" style={{ color: "crimson" }}>{error}</p>}

          {!loading && !error && filteredServices.length === 0 ? (
            <div className="services-empty">
              <h3>Нічого не знайдено</h3>
              <p className="text-light">Спробуйте змінити пошук або фільтр ціни.</p>
              <Button
                variant="secondary"
                onClick={() => {
                  setQuery("");
                  setPriceFilter("all");
                }}
              >
                Очистити фільтри
              </Button>
            </div>
          ) : null}

          {!loading && !error && filteredServices.length > 0 ? (
            <div className="grid-3">
              {filteredServices.map((service) => (
                <Card
                  key={service.id}
                  image={service.image}
                  title={service.title}
                  description={service.shortDescription}
                >
                  <div className="service-card-footer">
                    <div className="service-meta">
                      <div>
                        <div className="service-price">{service.priceText}</div>
                        <div className="service-duration text-small text-light">
                          ⏱ {service.duration}
                        </div>
                      </div>
                    </div>

                    <div className="service-actions">
                      <Button
                        size="small"
                        variant="secondary"
                        onClick={() => setSelectedService(service)}
                      >
                        Деталі
                      </Button>
                      <Button size="small" onClick={() => handleSelectPhotographer(service)}>
                        Обрати фотографа
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {selectedService && (
        <Modal
          isOpen={!!selectedService}
          onClose={() => setSelectedService(null)}
          title={selectedService.title}
        >
          <div className="service-detail">
            <img
              src={selectedService.image}
              alt={selectedService.title}
              className="service-detail-image"
            />

            <div className="service-detail-meta">
              <div className="service-detail-item">
                <strong>Вартість:</strong>{" "}
                {formatUAH(selectedService.priceFrom, selectedService.currency)}
              </div>
              <div className="service-detail-item">
                <strong>Тривалість:</strong> {selectedService.duration}
              </div>
            </div>

            <p className="service-detail-description">{selectedService.fullDescription}</p>

            <div className="service-includes">
              <h4>Що входить:</h4>
              <ul>
                {(selectedService.includes || []).map((item, index) => (
                  <li key={index}>✓ {item}</li>
                ))}
              </ul>
            </div>

            <div className="service-detail-actions">
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
            </div>

            <ServiceReviews serviceId={selectedService.id} />

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
        </Modal>
      )}
    </div>
  );
};

export default Services;
