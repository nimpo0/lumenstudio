import React, { useEffect, useMemo, useState } from "react";
import { Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../authorization/authContext";
import Button from "../components/Button";
import Modal from "../components/Modal";
import "./Cabinet.css";
import CabinetPhotos from "./CabinetPhotos";
import CabinetPhotographer from "./CabinetPhotographer";
import { bookingsApi } from "../api/bookings";
import { profileApi } from "../api/profile";

function isActiveStatus(status) {
  return status === "Підтверджено" || status === "pending_assignment";
}

const CabinetClient = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const [name, setName] = useState("");
  const [bookings, setBookings] = useState([]);
  const [me, setMe] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [loadingMe, setLoadingMe] = useState(true);
  const [savingName, setSavingName] = useState(false);
  const [errorBookings, setErrorBookings] = useState("");
  const [errorMe, setErrorMe] = useState("");
  const [errorSave, setErrorSave] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoadingMe(true);
        setErrorMe("");

        const meData = await profileApi.me();
        if (cancelled) return;

        setMe(meData);
        setName(meData?.name || "");
      } catch (e) {
        if (cancelled) return;
        setErrorMe("Не вдалося завантажити профіль.");
        setMe(null);
      } finally {
        if (!cancelled) setLoadingMe(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoadingBookings(true);
        setErrorBookings("");

        const list = await bookingsApi.listMy();
        if (cancelled) return;

        setBookings(Array.isArray(list) ? list : []);
      } catch (e) {
        if (cancelled) return;
        setErrorBookings("Не вдалося завантажити бронювання.");
        setBookings([]);
      } finally {
        if (!cancelled) setLoadingBookings(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const stats = useMemo(() => {
    const active = bookings.filter((b) => isActiveStatus(b.status)).length;
    const finished = bookings.filter((b) => b.status === "Завершено").length;
    return { active, finished };
  }, [bookings]);

  const latestBookings = useMemo(() => {
    const copy = [...bookings];
    copy.sort((a, b) => {
      const ta = Date.parse(a.createdAt || "") || 0;
      const tb = Date.parse(b.createdAt || "") || 0;
      if (ta !== tb) return tb - ta;

      const da = `${a.date || ""} ${a.time || ""}`.trim();
      const db = `${b.date || ""} ${b.time || ""}`.trim();
      return db.localeCompare(da);
    });
    return copy.slice(0, 2);
  }, [bookings]);

  const normalizeBooking = (b) => ({
    id: b.id,
    date: b.date || "—",
    time: b.time || "—",
    service: b.serviceLabel || b.service || b.serviceId || "—",
    photographer: b.photographerLabel || b.photographer || b.photographerId || "—",
    status: b.status || "—",
    total: typeof b.total === "number" ? b.total : null,
    notes: b.notes || "",
    additional: Array.isArray(b.additional) ? b.additional : [],
  });

  const refreshBookings = async () => {
    const list = await bookingsApi.listMy();
    setBookings(Array.isArray(list) ? list : []);
  };

  const handleSaveName = async () => {
    const newName = String(name || "").trim();
    if (newName.length < 2) {
      setErrorSave("Ім'я має бути мінімум 2 символи.");
      return;
    }

    try {
      setSavingName(true);
      setErrorSave("");

      const updated = await profileApi.updateName(newName);
      setMe(updated);
      setName(updated?.name || newName);

      alert("Збережено");
    } catch (e) {
      setErrorSave("Не вдалося зберегти ім'я.");
    } finally {
      setSavingName(false);
    }
  };

  const handleCancelBooking = async (id) => {
    if (!id) return;
    if (!confirm("Скасувати бронювання?")) return;

    try {
      await bookingsApi.remove(id);
      await refreshBookings();
      alert("Бронювання скасовано");
    } catch (e) {
      alert("Не вдалося скасувати бронювання");
    }
  };

  const [reschedule, setReschedule] = useState(null);
  const [rescheduleForm, setRescheduleForm] = useState({ date: "", time: "" });
  const [rescheduleBusy, setRescheduleBusy] = useState(false);
  const [rescheduleErr, setRescheduleErr] = useState("");

  const startReschedule = (b) => {
    setReschedule(b);
    const today = new Date().toISOString().slice(0, 10);
    setRescheduleForm({
      date: (b.date || "") >= today ? (b.date || today) : today,
      time: b.time || "10:00",
    });
    setRescheduleErr("");
  };

  const submitReschedule = async () => {
    if (!reschedule) return;
    setRescheduleBusy(true);
    setRescheduleErr("");
    try {
      await bookingsApi.reschedule(reschedule.id, rescheduleForm);
      await refreshBookings();
      setReschedule(null);
    } catch (e) {
      setRescheduleErr(e?.data?.message || "Не вдалося перенести");
    } finally {
      setRescheduleBusy(false);
    }
  };

  return (
    <div className="cabinet-page">
      <section className="page-header">
        <div className="container">
          <h1>Особистий кабінет</h1>
          <p className="text-large text-light">
            Керуйте вашими бронюваннями та фотографіями
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="cabinet-layout">
            <nav className="cabinet-nav">
              <Link
                to="/cabinet"
                className={`cabinet-nav-link ${currentPath === "/cabinet" ? "active" : ""}`}
              >
                Огляд
              </Link>

              <Link
                to="/cabinet/bookings"
                className={`cabinet-nav-link ${currentPath === "/cabinet/bookings" ? "active" : ""}`}
              >
                Мої фотосесії
              </Link>

              <Link
                to="/cabinet/photos"
                className={`cabinet-nav-link ${currentPath.startsWith("/cabinet/photos") ? "active" : ""}`}
              >
                Архів фото
              </Link>

              <Link
                to="/cabinet/settings"
                className={`cabinet-nav-link ${currentPath === "/cabinet/settings" ? "active" : ""}`}
              >
                Налаштування
              </Link>
            </nav>

            <div className="cabinet-content">
              <Routes>
                <Route
                  index
                  element={
                    <div className="cabinet-overview">
                      <div className="overview-cards">
                        <div className="overview-card">
                          <h3>Активні бронювання</h3>
                          <div className="overview-number">{stats.active}</div>
                        </div>
                        <div className="overview-card">
                          <h3>Завершені сесії</h3>
                          <div className="overview-number">{stats.finished}</div>
                        </div>
                      </div>

                      <div className="cabinet-section">
                        <h2>Останні бронювання</h2>
                        <div className="bookings-list">
                          {latestBookings.map((b) => {
                            const booking = normalizeBooking(b);
                            return (
                              <div key={booking.id} className="booking-card">
                                <div className="booking-info">
                                  <h4>{booking.service}</h4>
                                  <p className="text-small text-light">
                                    {booking.date} о {booking.time}
                                    <br />
                                    Фотограф: {booking.photographer}
                                  </p>
                                </div>
                                <span
                                  className={`badge ${booking.status === "Підтверджено" ? "badge-accent" : ""}`}
                                >
                                  {booking.status}
                                </span>
                              </div>
                            );
                          })}

                          {bookings.length === 0 && (
                            <p className="text-light">Поки що немає бронювань.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  }
                />

                <Route
                  path="bookings"
                  element={
                    <div>
                      <h2>Мої фотосесії</h2>
                      <div className="table-container">
                        <table className="table">
                          <thead>
                            <tr>
                              <th>Дата</th>
                              <th>Час</th>
                              <th>Послуга</th>
                              <th>Фотограф</th>
                              <th>Дії</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bookings.map((b) => {
                              const booking = normalizeBooking(b);
                              return (
                                <tr key={booking.id}>
                                  <td data-label="Дата">{booking.date}</td>
                                  <td data-label="Час">{booking.time}</td>
                                  <td data-label="Послуга">{booking.service}</td>
                                  <td data-label="Фотограф">{booking.photographer}</td>
                                  <td data-label="Дії" className="booking-actions-cell">
                                    <Button size="small" variant="secondary" onClick={() => setSelectedBooking(booking)}>
                                      Деталі
                                    </Button>

                                    {isActiveStatus(booking.status) && (
                                      <>
                                        <Button size="small" variant="secondary" onClick={() => startReschedule(booking)}>
                                          Перенести
                                        </Button>
                                        <Button size="small" variant="secondary" onClick={() => handleCancelBooking(booking.id)}>
                                          Скасувати
                                        </Button>
                                      </>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}

                            {bookings.length === 0 && (
                              <tr>
                                <td colSpan="6" className="text-light">
                                  Немає бронювань. Створіть нове через “Бронювання”.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  }
                />

                <Route path="photos/*" element={<CabinetPhotos />} />

                <Route
                  path="settings"
                  element={
                    <div>
                      <h2>Налаштування</h2>
                      <div className="settings-form">
                        <div className="form-group">
                          <label className="label">Ім&apos;я</label>
                          <input
                            type="text"
                            className="input"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                          />
                        </div>

                        <div className="form-group">
                          <label className="label">Email</label>
                          <input type="email" className="input" value={me?.email || ""} disabled />
                        </div>

                        <Button
                          onClick={async () => {
                            if (!user) return;
                            await handleSaveName();
                            alert("Збережено");
                          }}
                        >
                          Зберегти зміни
                        </Button>
                      </div>
                    </div>
                  }
                />
              </Routes>
            </div>
          </div>
        </div>
      </section>

      {selectedBooking && (
        <Modal
          title="Деталі бронювання"
          isOpen={!!selectedBooking}
          onClose={() => setSelectedBooking(null)}
        >
          <div style={{ display: "grid", gap: 10 }}>
            <div><strong>Послуга:</strong> {selectedBooking.service}</div>
            <div><strong>Дата/час:</strong> {selectedBooking.date} {selectedBooking.time}</div>
            <div><strong>Фотограф:</strong> {selectedBooking.photographer}</div>

            {typeof selectedBooking.total === "number" && (
              <div><strong>Сума:</strong> {selectedBooking.total} ₴</div>
            )}

            {selectedBooking.additional?.length > 0 && (
              <div>
                <strong>Додатково:</strong>
                <ul style={{ marginTop: 6 }}>
                  {selectedBooking.additional.map((a, idx) => (
                    <li key={idx}>
                      {a.label || a.value} {typeof a.price === "number" ? `(+${a.price} ₴)` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {selectedBooking.notes && (
              <div><strong>Нотатки:</strong> {selectedBooking.notes}</div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <Button variant="secondary" onClick={() => setSelectedBooking(null)}>
                Закрити
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {reschedule && (
        <Modal
          title="Перенести бронювання"
          isOpen={!!reschedule}
          onClose={() => setReschedule(null)}
        >
          <div style={{ display: "grid", gap: 12 }}>
            <p className="text-light">{reschedule.service || reschedule.serviceLabel || reschedule.serviceId}</p>
            <div className="form-row">
              <div className="form-group">
                <label className="label">Нова дата</label>
                <input
                  type="date"
                  className="input"
                  value={rescheduleForm.date}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setRescheduleForm({ ...rescheduleForm, date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="label">Новий час</label>
                <input
                  type="time"
                  className="input"
                  value={rescheduleForm.time}
                  onChange={(e) => setRescheduleForm({ ...rescheduleForm, time: e.target.value })}
                />
              </div>
            </div>

            <p className="text-small text-light">
              Перенесення доступне не пізніше ніж за 24 години до сесії.
            </p>

            {rescheduleErr && (
              <p className="text-light" style={{ color: "crimson" }}>{rescheduleErr}</p>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <Button onClick={submitReschedule} disabled={rescheduleBusy}>
                {rescheduleBusy ? "Зберігаємо..." : "Підтвердити"}
              </Button>
              <Button variant="secondary" onClick={() => setReschedule(null)}>Скасувати</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

const Cabinet = () => {
  const { user, authLoading } = useAuth();

  if (authLoading) return <p className="text-light" style={{ padding: 20 }}>Завантаження...</p>;
  if (!user) return null;

  if (user.role === "photographer") return <CabinetPhotographer />;
  return <CabinetClient />;
};

export default Cabinet;
