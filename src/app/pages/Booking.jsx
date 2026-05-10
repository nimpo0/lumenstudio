import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Button from "../components/Button";
import Modal from "../components/Modal";
import "./Booking.css";
import { useAuth } from "../authorization/authContext";

import { dataApi } from "../api/data";
import { bookingsApi } from "../api/bookings";
import { availabilityApi } from "../api/availability";

const TIME_SLOTS = [
  "10:00", "11:00", "12:00", "13:00", "14:00",
  "15:00", "16:00", "17:00", "18:00", "19:00",
];

function parseDurationToMinutes(raw) {
  if (!raw) return 60;
  const s = String(raw).trim().toLowerCase().replace(",", ".");
  const m = s.match(/(\d+(\.\d+)?)\s*(годин|година|години?)/i);
  if (m) return Math.max(1, Math.round(Number(m[1]) * 60));
  return 60;
}

const ADDITIONAL_SERVICES = [
  { value: "express", label: "Експрес-обробка (24 год)", price: 800 },
  { value: "preview", label: "Швидкий перегляд (5 фото за 24 год)", price: 400 },
  { value: "second_photographer", label: "Другий фотограф", price: 2000 },
  { value: "videographer", label: "Відеограф", price: 3500 },
  { value: "stylist", label: "Стиліст / Візажист", price: 1500 },
  { value: "props", label: "Реквізит / декорації", price: 600 },
  { value: "backstage", label: "Backstage-зйомка", price: 1200 },
  { value: "prints", label: "Друковані фото (10 шт)", price: 800 },
  { value: "photobook", label: "Фотокнига", price: 2500 },
];

const Booking = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const presetStudio = new URLSearchParams(location.search).get("studio") || "";

  const [formData, setFormData] = useState({
    service: "",
    date: "",
    time: "",
    photographer: "",
    studio: presetStudio,
    additional: [],
    notes: "",
    paymentMethod: "onsite",
  });

  const [services, setServices] = useState([]);
  const [photographers, setPhotographers] = useState([]);
  const [studios, setStudios] = useState([]);
  const [busySlots, setBusySlots] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");

  const [showSuccess, setShowSuccess] = useState(false);
  const [createdBooking, setCreatedBooking] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentStage, setPaymentStage] = useState("idle");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingData(true);
        const [s, p, st] = await Promise.all([
          dataApi.services(),
          dataApi.photographers(),
          dataApi.studios(),
        ]);
        if (cancelled) return;

        const servicesData = (Array.isArray(s) ? s : []).map((x) => ({
          value: x.id,
          label: x.label || x.title || x.id,
          price: Number(x.priceFrom || x.price || 0),
          duration: x.duration || "",
        }));

        const photographersData = (Array.isArray(p) ? p : []).map((x) => ({
          value: x.id,
          label: x.label || x.name || x.id,
        }));

        const studiosData = (Array.isArray(st) ? st : []).map((x) => ({
          value: x.id,
          label: x.name,
          hourlyPrice: Number(x.hourlyPrice || 0),
        }));

        setServices(servicesData);
        setPhotographers(photographersData);
        setStudios(studiosData);

        if (servicesData.length > 0) {
          setFormData((prev) => ({ ...prev, service: prev.service || servicesData[0].value }));
        }
      } catch (e) {
        setError("Не вдалося завантажити список послуг.");
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!formData.date) {
      setBusySlots([]);
      return;
    }
    if (!formData.photographer && !formData.studio) {
      setBusySlots([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoadingAvailability(true);
        const r = await availabilityApi.get({
          photographerId: formData.photographer || undefined,
          studioId: formData.studio || undefined,
          from: formData.date,
          to: formData.date,
        });
        if (cancelled) return;
        setBusySlots(r.busy || []);
      } catch (e) {
        if (!cancelled) setBusySlots([]);
      } finally {
        if (!cancelled) setLoadingAvailability(false);
      }
    })();
    return () => { cancelled = true; };
  }, [formData.date, formData.photographer, formData.studio]);

  const selectedService = useMemo(
    () => services.find((s) => s.value === formData.service),
    [services, formData.service]
  );
  const selectedPhotographer = useMemo(
    () => photographers.find((p) => p.value === formData.photographer),
    [photographers, formData.photographer]
  );
  const selectedStudio = useMemo(
    () => studios.find((s) => s.value === formData.studio),
    [studios, formData.studio]
  );
  const selectedAdditional = useMemo(
    () =>
      formData.additional
        .map((val) => ADDITIONAL_SERVICES.find((x) => x.value === val))
        .filter(Boolean),
    [formData.additional]
  );

  const isSlotBusy = (slot) => {
    const [hh, mm] = slot.split(":").map(Number);
    const slotMin = hh * 60 + mm;
    return busySlots.some((b) => b.startMin <= slotMin && slotMin < b.endMin);
  };

  const sessionHours = useMemo(() => {
    const min = parseDurationToMinutes(selectedService?.duration);
    return Math.max(1, Math.ceil(min / 60));
  }, [selectedService]);

  const studioCost = useMemo(
    () => (selectedStudio?.hourlyPrice || 0) * sessionHours,
    [selectedStudio, sessionHours]
  );

  const calculateTotal = () => {
    const base = selectedService?.price || 0;
    const additionalTotal = selectedAdditional.reduce((sum, a) => sum + (a.price || 0), 0);
    return base + studioCost + additionalTotal;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === "checkbox" && name === "additional") {
      setFormData((prev) => ({
        ...prev,
        additional: checked
          ? [...prev.additional, value]
          : prev.additional.filter((item) => item !== value),
      }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));

    if (["date", "time", "photographer", "studio"].includes(name)) {
      setError("");
      setErrorCode("");
    }
  };

  const resetForm = () => {
    setFormData({
      service: services[0]?.value || "",
      date: "",
      time: "",
      photographer: "",
      studio: "",
      additional: [],
      notes: "",
      paymentMethod: "onsite",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      alert("Щоб створити бронювання, увійдіть у свій акаунт.");
      return;
    }
    if (!formData.date || !formData.time) {
      setError("Будь ласка, оберіть дату та час фотосесії.");
      return;
    }
    if (!formData.service) {
      setError("Будь ласка, оберіть послугу.");
      return;
    }
    if (isSlotBusy(formData.time)) {
      setError("Цей слот зайнятий. Оберіть інший час.");
      return;
    }

    setLoadingSubmit(true);
    setError("");

    try {
      const created = await bookingsApi.create({
        date: formData.date,
        time: formData.time,

        serviceId: formData.service,
        serviceLabel: selectedService?.label || formData.service,
        servicePrice: selectedService?.price || 0,

        photographerId: formData.photographer || null,
        photographerLabel: selectedPhotographer?.label || "Будь-який доступний",

        studioId: formData.studio || null,

        additional: selectedAdditional,
        notes: formData.notes || "",

        total: calculateTotal(),

        paymentMethod: formData.paymentMethod,
      });

      setCreatedBooking(created);

      if (formData.paymentMethod === "online") {
        setShowPayment(true);
        setPaymentStage("idle");
      } else {
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          resetForm();
        }, 2500);
      }
    } catch (err) {
      console.error("Booking submit error:", err);

      const status = err?.status;
      const code = err?.data?.code;

      if (status === 409 && code === "SLOT_TAKEN") {
        setErrorCode("SLOT_TAKEN");
        setError("Цей час уже зайнятий. Оберіть інший час, фотографа або зал.");
        return;
      }

      if (status === 400) {
        setErrorCode("BAD_REQUEST");
        setError(err?.data?.message || "Перевірте введені дані.");
        return;
      }

      setErrorCode("UNKNOWN");
      setError("Не вдалося створити бронювання. Спробуйте ще раз.");
    } finally {
      setLoadingSubmit(false);
    }
  };

  const processPayment = async () => {
    if (!createdBooking) return;
    setPaymentStage("processing");
    await new Promise((r) => setTimeout(r, 1800));
    try {
      await bookingsApi.pay(createdBooking.id, { method: "online" });
      setPaymentStage("done");
      setTimeout(() => {
        setShowPayment(false);
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          resetForm();
        }, 2500);
      }, 1200);
    } catch (e) {
      setPaymentStage("error");
    }
  };

  if (showSuccess) {
    return (
      <div className="booking-page">
        <section className="section">
          <div className="container">
            <div className="success-screen">
              <div className="success-icon">✓</div>
              <h1>Бронювання успішно створено!</h1>
              <p className="text-large text-light">
                {formData.paymentMethod === "online"
                  ? "Оплата отримана. Очікуйте дзвінка для підтвердження деталей."
                  : "Ми зв'яжемося з вами для підтвердження. Оплата — на місці."}
              </p>
              <p className="text-light">
                Альбом для фотосесії вже створено в "Архіві фото".
              </p>
              <Button size="large" onClick={() => { setShowSuccess(false); navigate("/cabinet"); }}>
                Перейти в кабінет
              </Button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="booking-page">
      <section className="page-header">
        <div className="container">
          <h1>Забронювати фотосесію</h1>
          <p className="text-large text-light">
            Заповніть форму, оберіть зручний час, і ми зв'яжемося для підтвердження
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="booking-layout">
            <div className="booking-form-container">
              {loadingData && <p className="text-light">Завантаження...</p>}
              {error && <p className="text-light booking-error">{error}</p>}

              <form onSubmit={handleSubmit} className="booking-form">
                <div className="form-section">
                  <h3>Послуга</h3>

                  <div className="form-group">
                    <label className="label">Тип послуги *</label>
                    <select
                      name="service"
                      value={formData.service}
                      onChange={handleChange}
                      className="input"
                      required
                      disabled={loadingData || services.length === 0}
                    >
                      {services.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label} {s.price ? `· від ${s.price} ₴` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="label">Зал (опціонально)</label>
                    <select
                      name="studio"
                      value={formData.studio}
                      onChange={handleChange}
                      className="input"
                      disabled={loadingData}
                    >
                      <option value="">— без конкретного залу —</option>
                      {studios.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label} · {s.hourlyPrice} ₴/год
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="label">Фотограф</label>
                    <select
                      name="photographer"
                      value={formData.photographer}
                      onChange={handleChange}
                      className="input"
                      disabled={loadingData}
                    >
                      <option value="">Будь-який доступний</option>
                      {photographers.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-section">
                  <h3>Дата і час</h3>

                  <div className="form-group">
                    <label className="label">Дата *</label>
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleChange}
                      className="input"
                      required
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>

                  <div className="form-group">
                    <label className="label">Час *</label>

                    {!formData.date ? (
                      <p className="text-small text-light">Спершу оберіть дату.</p>
                    ) : loadingAvailability ? (
                      <p className="text-small text-light">Перевіряємо доступність...</p>
                    ) : (
                      <div className="time-slots-grid">
                        {TIME_SLOTS.map((slot) => {
                          const busy = isSlotBusy(slot);
                          const selected = formData.time === slot;
                          return (
                            <button
                              key={slot}
                              type="button"
                              className={`slot-btn ${busy ? "is-busy" : ""} ${selected ? "is-selected" : ""}`}
                              disabled={busy}
                              onClick={() => setFormData({ ...formData, time: slot })}
                            >
                              {slot}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {(formData.photographer || formData.studio) && (
                      <p className="text-small text-light" style={{ marginTop: 6 }}>
                        Сірі слоти зайняті обраним фотографом / залом.
                      </p>
                    )}
                  </div>
                </div>

                <div className="form-section">
                  <h3>Додаткові послуги</h3>

                  <div className="checkbox-group">
                    {ADDITIONAL_SERVICES.map((s) => (
                      <label key={s.value} className="checkbox-label">
                        <input
                          type="checkbox"
                          name="additional"
                          value={s.value}
                          checked={formData.additional.includes(s.value)}
                          onChange={handleChange}
                        />
                        <span>{s.label} (+{s.price} ₴)</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-section">
                  <h3>Спосіб оплати</h3>

                  <div className="payment-options">
                    <label className={`payment-option ${formData.paymentMethod === "onsite" ? "is-active" : ""}`}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="onsite"
                        checked={formData.paymentMethod === "onsite"}
                        onChange={handleChange}
                      />
                      <div>
                        <strong>На місці</strong>
                        <p className="text-small text-light">Оплата готівкою або карткою у студії</p>
                      </div>
                    </label>

                    <label className={`payment-option ${formData.paymentMethod === "online" ? "is-active" : ""}`}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="online"
                        checked={formData.paymentMethod === "online"}
                        onChange={handleChange}
                      />
                      <div>
                        <strong>Онлайн</strong>
                        <p className="text-small text-light">Карткою прямо зараз</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="form-section">
                  <div className="form-group">
                    <label className="label">Додаткові побажання</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      className="input"
                      rows="4"
                      placeholder="Розкажіть про ваші побажання..."
                    />
                  </div>
                </div>

                <Button type="submit" size="large" className="submit-btn" disabled={loadingSubmit || loadingData}>
                  {loadingSubmit
                    ? "Відправляємо..."
                    : formData.paymentMethod === "online"
                    ? "Підтвердити та сплатити"
                    : "Підтвердити бронювання"}
                </Button>
              </form>
            </div>

            <div className="booking-summary-container">
              <div className="booking-summary">
                <h3>Підсумок бронювання</h3>

                <div className="summary-section">
                  <div className="summary-item">
                    <span>Послуга:</span>
                    <strong>{selectedService?.label || "—"}</strong>
                  </div>
                  <div className="summary-item">
                    <span>Ціна послуги:</span>
                    <strong>{selectedService?.price || 0} ₴</strong>
                  </div>

                  {selectedStudio && (
                    <div className="summary-item">
                      <span>Зал ({selectedStudio.label}, {sessionHours} год × {selectedStudio.hourlyPrice} ₴):</span>
                      <strong>{studioCost} ₴</strong>
                    </div>
                  )}
                  {formData.date && (
                    <div className="summary-item">
                      <span>Дата:</span>
                      <strong>{formData.date}</strong>
                    </div>
                  )}
                  {formData.time && (
                    <div className="summary-item">
                      <span>Час:</span>
                      <strong>{formData.time}</strong>
                    </div>
                  )}
                  {selectedPhotographer && (
                    <div className="summary-item">
                      <span>Фотограф:</span>
                      <strong>{selectedPhotographer.label}</strong>
                    </div>
                  )}
                </div>

                {selectedAdditional.length > 0 && (
                  <div className="summary-section">
                    <h4>Додатково:</h4>
                    {selectedAdditional.map((a) => (
                      <div key={a.value} className="summary-item">
                        <span>{a.label}</span>
                        <strong>{a.price} ₴</strong>
                      </div>
                    ))}
                  </div>
                )}

                <div className="summary-total">
                  <span>Загальна вартість:</span>
                  <strong>{calculateTotal()} ₴</strong>
                </div>

                <p className="text-small text-light" style={{ marginTop: 10 }}>
                  {formData.paymentMethod === "online"
                    ? "Сума буде списана після підтвердження бронювання."
                    : "Оплата на місці у день фотосесії."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {showPayment && (
        <Modal title="Оплата онлайн" isOpen={showPayment} onClose={() => paymentStage !== "processing" && setShowPayment(false)}>
          <div className="payment-mock">
            {paymentStage === "idle" && (
              <>
                <p>Сума до оплати: <strong>{calculateTotal()} ₴</strong></p>
                <div className="form-group">
                  <label className="label">Номер картки</label>
                  <input className="input" placeholder="4242 4242 4242 4242" defaultValue="4242 4242 4242 4242" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="label">MM/YY</label>
                    <input className="input" placeholder="12/27" defaultValue="12/27" />
                  </div>
                  <div className="form-group">
                    <label className="label">CVV</label>
                    <input className="input" placeholder="123" defaultValue="123" />
                  </div>
                </div>
                <p className="text-small text-light">
                  Це навчальна імітація — реальних транзакцій не відбувається.
                </p>
                <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                  <Button onClick={processPayment}>Сплатити {calculateTotal()} ₴</Button>
                  <Button variant="secondary" onClick={() => setShowPayment(false)}>Скасувати</Button>
                </div>
              </>
            )}
            {paymentStage === "processing" && (
              <div style={{ textAlign: "center", padding: 24 }}>
                <div className="spinner" />
                <p>Обробка платежу...</p>
              </div>
            )}
            {paymentStage === "done" && (
              <div style={{ textAlign: "center", padding: 24 }}>
                <div className="success-icon">✓</div>
                <p>Оплачено!</p>
              </div>
            )}
            {paymentStage === "error" && (
              <div style={{ padding: 12 }}>
                <p style={{ color: "crimson" }}>Помилка платежу. Спробуйте ще раз.</p>
                <Button onClick={() => setPaymentStage("idle")}>Повторити</Button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Booking;
