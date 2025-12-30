import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import "./Photographers.css";
import Button from "../components/Button";
import Modal from "../components/Modal";
import { availabilityApi } from "../api/availability";
import { dataApi } from "../api/data";
import { useAuth } from "../authorization/authContext";
import { photographerReviewsApi } from "../api/photographerReviews";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

const avgRating = (items) => {
  if (!items.length) return 0;
  const s = items.reduce((acc, x) => acc + (Number(x.rating) || 0), 0);
  return Math.round((s / items.length) * 10) / 10;
};

const PhotographerReviews = ({ photographerId }) => {
  const { user } = useAuth();

  const [items, setItems] = useState([]);
  const [loadingR, setLoadingR] = useState(false);
  const [errR, setErrR] = useState("");

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const load = async () => {
    try {
      setLoadingR(true);
      setErrR("");
      const data = await photographerReviewsApi.list(photographerId);
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setErrR("Не вдалося завантажити відгуки.");
      setItems([]);
    } finally {
      setLoadingR(false);
    }
  };

  useEffect(() => {
    load();
  }, [photographerId]);

  const avg = avgRating(items);

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

          {msg && <div className="text-small text-light" style={{ marginTop: 8 }}>{msg}</div>}

          <div style={{ marginTop: 10 }}>
            <Button
              size="small"
              disabled={saving}
              onClick={async () => {
                try {
                  setSaving(true);
                  setMsg("");
                  await photographerReviewsApi.save({ photographerId, rating, comment });
                  setMsg("Збережено");
                  setComment("");
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
        </div>
      ) : (
        <p className="text-light" style={{ marginTop: 12 }}>
          Увійдіть, щоб залишити відгук.
        </p>
      )}
    </div>
  );
};

const isRelevantForService = (photographer, serviceId) => {
  if (!serviceId) return true;

  const text = `${photographer.specialty || ""} ${photographer.description || ""}`.toLowerCase();

  const map = {
    wedding: ["весіл", "wedding"],
    portrait: ["портрет", "portrait"],
    family: ["сім", "family"],
    business: ["бізнес", "корпоратив", "business"],
    pregnancy: ["вагіт", "pregnan"],
    newborn: ["новонарод", "немовл", "newborn"],
  };

  const keys = map[serviceId] || [serviceId];
  return keys.some((k) => text.includes(k));
};

const Photographers = () => {
  const location = useLocation();
  const selectedService = location.state?.selectedService || null;
  const [photographers, setPhotographers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [openAvailFor, setOpenAvailFor] = useState(null);
  const [availBusy, setAvailBusy] = useState([]);
  const [availLoading, setAvailLoading] = useState(false);
  const [availErr, setAvailErr] = useState("");
  const [calendarValue, setCalendarValue] = useState(stripTime(new Date()));

  function toYMD(d) {
    const x = new Date(d);
    const yyyy = x.getFullYear();
    const mm = String(x.getMonth() + 1).padStart(2, "0");
    const dd = String(x.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function addDaysYMD(ymd, days) {
    const [y, m, d] = ymd.split("-").map(Number);
    const x = new Date(y, m - 1, d);
    x.setDate(x.getDate() + days);
    return toYMD(x);
  }

  function stripTime(dateObj) {
    return new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
  }

  const openAvailability = async (photographer) => {
    setOpenAvailFor(photographer);
    setAvailErr("");
    setAvailBusy([]);

    const from = toYMD(new Date());
    const to = addDaysYMD(from, 30);

    setCalendarValue(stripTime(new Date()));

    try {
      setAvailLoading(true);
      const data = await availabilityApi.getForPhotographer(photographer.id, from, to);
      setAvailBusy(Array.isArray(data?.busy) ? data.busy : []);
    } catch (e) {
      setAvailErr("Не вдалося завантажити зайнятість.");
    } finally {
      setAvailLoading(false);
    }
  };

  useEffect(() => {
    const fetchPhotographers = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await dataApi.photographers();
        setPhotographers(Array.isArray(data) ? data : []);
      } catch (e) {
        setError("Не вдалося завантажити фотографів. Спробуйте пізніше.");
      } finally {
        setLoading(false);
      }
    };

    fetchPhotographers();
  }, []);

  const orderedPhotographers = useMemo(() => {
    if (!selectedService?.id) return photographers;

    const relevant = photographers.filter((p) => isRelevantForService(p, selectedService.id));
    const other = photographers.filter((p) => !isRelevantForService(p, selectedService.id));
    return [...relevant, ...other];
  }, [photographers, selectedService]);

  const busyCountByDay = useMemo(() => {
    const map = new Map();
    for (const b of availBusy) {
      const key = String(b.date || "");
      if (!key) continue;
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [availBusy]);

  const selectedDayYMD = useMemo(() => toYMD(calendarValue), [calendarValue]);

  const busyForSelectedDay = useMemo(() => {
    return availBusy
      .filter((x) => x.date === selectedDayYMD)
      .sort((a, b) => (a.startMin ?? 0) - (b.startMin ?? 0));
  }, [availBusy, selectedDayYMD]);


  return (
    <div className="photographers-page">
      <section className="page-header">
        <div className="container">
          <h1>Наші фотографи</h1>
          <p className="text-large text-light">
            Команда професіоналів з великим досвідом та індивідуальним підходом
          </p>

          {selectedService && (
            <div className="selected-service-hint">
              <span className="badge badge-accent">
                Обрана послуга: {selectedService.title}
              </span>
              <span className="text-light" style={{ marginLeft: 10 }}>
                (релевантні фотографи показані першими)
              </span>
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="container">
          {loading && <p className="text-light">Завантаження...</p>}
          {error && <p className="text-light" style={{ color: "crimson" }}>{error}</p>}

          {!loading && !error && orderedPhotographers.map((photographer) => (
            <div key={photographer.id} className="photographer-profile">
              <div className="photographer-main">
                <img
                  src={photographer.image}
                  alt={photographer.name}
                  className="photographer-photo"
                />

                <div className="photographer-info">
                  <h2>{photographer.name}</h2>

                  <div className="photographer-specialty">
                    <span className="badge badge-accent">{photographer.specialty}</span>
                    <span className="text-light">
                      {photographer.experienceLabel ||
                        (photographer.experienceYears ? `${photographer.experienceYears} років досвіду` : "")}
                    </span>

                    {selectedService?.id && isRelevantForService(photographer, selectedService.id) && (
                      <span className="badge" style={{ marginLeft: 10 }}>
                        підходить
                      </span>
                    )}
                  </div>

                  <p className="photographer-description">{photographer.description}</p>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
                <Button size="large" variant="secondary" onClick={() => openAvailability(photographer)}>
                  Переглянути зайнятість
                </Button>
              </div>

              <div className="photographer-portfolio">
                <h3>Міні-портфоліо</h3>
                <div className="mini-portfolio-grid">
                  {(photographer.portfolio || []).map((image, index) => (
                    <div key={index} className="mini-portfolio-item">
                      <img src={image} alt={`Робота ${index + 1}`} loading="lazy" />
                    </div>
                  ))}
                </div>
              </div>
                <Modal
                  isOpen={!!openAvailFor}
                  onClose={() => setOpenAvailFor(null)}
                  title={openAvailFor ? `Зайнятість: ${openAvailFor.name}` : "Зайнятість"}
                >
                  {availLoading && <p className="text-light">Завантаження...</p>}
                  {availErr && <p className="text-light" style={{ color: "crimson" }}>{availErr}</p>}

                  {!availLoading && !availErr && (
                    <div style={{ display: "grid", gap: 14 }}>
                      <div className="avail-calendar">
                        <Calendar
                          value={calendarValue}
                          onChange={(v) => setCalendarValue(stripTime(v))}
                          minDate={stripTime(new Date())}
                          tileClassName={({ date, view }) => {
                            if (view !== "month") return null;
                            const key = toYMD(date);
                            return busyCountByDay.has(key) ? "busy-day" : null;
                          }}
                          tileContent={({ date, view }) => {
                            if (view !== "month") return null;
                            const key = toYMD(date);
                            const cnt = busyCountByDay.get(key);
                            if (!cnt) return null;
                            return <div className="busy-dot">{cnt}</div>;
                          }}
                        />
                      </div>

                      <div>
                        <div style={{ fontWeight: 700, marginBottom: 8 }}>
                          {selectedDayYMD}: {busyForSelectedDay.length ? "зайнято" : "вільно"}
                        </div>

                        {busyForSelectedDay.length === 0 ? (
                          <p className="text-light">На цей день бронювань немає.</p>
                        ) : (
                          <div className="avail-slots">
                            {busyForSelectedDay.map((b) => (
                              <div
                                key={b.bookingId + b.startMin}
                                className="avail-slot"
                              >
                                <div className="avail-slot-time">
                                  {b.startTime} – {b.endTime}
                                </div>
                                {b.service && <div className="avail-slot-service">{b.service}</div>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Modal>

              <PhotographerReviews photographerId={photographer.id} />
            </div>
          ))}

          {!loading && !error && orderedPhotographers.length === 0 && (
            <p className="text-light">Фотографів поки немає.</p>
          )}
        </div>
      </section>
    </div>
  );
};

export default Photographers;
