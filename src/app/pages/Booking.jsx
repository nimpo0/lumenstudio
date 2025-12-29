import React, { useEffect, useMemo, useState } from "react";
import Button from "../components/Button";
import "./Booking.css";
import { useAuth } from "../authorization/authContext";

import { dataApi } from "../api/data";
import { bookingsApi } from "../api/bookings";

const Booking = () => {
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    service: "portrait",
    date: "",
    time: "",
    photographer: "",
    additional: [],
    notes: "",
  });

  const [showSuccess, setShowSuccess] = useState(false);

  const [services, setServices] = useState([]);
  const [photographers, setPhotographers] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");


  const timeSlots = [
    "10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00",
  ];

  const additionalServices = [
    { value: "prints", label: "Друковані фото", price: 800 },
    { value: "photobook", label: "Фотокнига", price: 2500 },
    { value: "second_photographer", label: "Другий фотограф", price: 2000 },
    { value: "stylist", label: "Стиліст / Візажист", price: 1500 },
  ];

  useEffect(() => {
    const fetchBookingLists = async () => {
      try {
        setLoadingData(true);
        setError("");

        const [servicesRaw, photographersRaw] = await Promise.all([
          dataApi.services(),
          dataApi.photographers(),
        ]);

        const servicesData = (Array.isArray(servicesRaw) ? servicesRaw : [])
          .map((x) => {
            const id = x.id;
            return {
              value: id,
              label: x.label || x.title || id,
              price: Number(x.priceFrom || x.price || 0),
            };
          })
          .sort((a, b) => a.label.localeCompare(b.label, "uk"));

        const photographersData = (Array.isArray(photographersRaw) ? photographersRaw : [])
          .map((x) => {
            const id = x.id;
            return {
              value: id,
              label: x.label || x.name || id,
            };
          })
          .sort((a, b) => a.label.localeCompare(b.label, "uk"));

        setServices(servicesData);
        setPhotographers(photographersData);

        if (servicesData.length > 0) {
          setFormData((prev) => {
            const hasDefault = servicesData.some((s) => s.value === prev.service);
            return hasDefault ? prev : { ...prev, service: servicesData[0].value };
          });
        }
      } catch (e) {
        setError("Не вдалося завантажити список послуг/фотографів.");
      } finally {
        setLoadingData(false);
      }
    };

    fetchBookingLists();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === "checkbox") {
      setFormData((prev) => ({
        ...prev,
        additional: checked
          ? [...prev.additional, value]
          : prev.additional.filter((item) => item !== value),
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    if (["date", "time", "photographer"].includes(name)) {
      setError("");
      setErrorCode("");
    }
  };

  const selectedService = useMemo(
    () => services.find((s) => s.value === formData.service),
    [services, formData.service]
  );

  const selectedPhotographer = useMemo(
    () => photographers.find((p) => p.value === formData.photographer),
    [photographers, formData.photographer]
  );

  const selectedAdditional = useMemo(() => {
    return formData.additional
      .map((val) => {
        const a = additionalServices.find((x) => x.value === val);
        return a ? { value: a.value, label: a.label, price: a.price } : null;
      })
      .filter(Boolean);
  }, [formData.additional]);

  const calculateTotal = () => {
    const base = selectedService?.price || 0;
    const additionalTotal = selectedAdditional.reduce((sum, a) => sum + (a.price || 0), 0);
    return base + additionalTotal;
  };

  const resetForm = () => {
    setFormData({
      service: services.some((s) => s.value === "portrait")
        ? "portrait"
        : (services[0]?.value || "portrait"),
      date: "",
      time: "",
      photographer: "",
      additional: [],
      notes: "",
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

    setLoadingSubmit(true);
    setError("");

    try {
      await bookingsApi.create({
        date: formData.date,
        time: formData.time,

        serviceId: formData.service,
        serviceLabel: selectedService?.label || formData.service,
        servicePrice: selectedService?.price || 0,

        photographerId: formData.photographer || null,
        photographerLabel: selectedPhotographer?.label || "Будь-який доступний",

        additional: selectedAdditional,
        notes: formData.notes || "",

        total: calculateTotal(),
      });

      setShowSuccess(true);

      setTimeout(() => {
        setShowSuccess(false);
        resetForm();
      }, 2500);
    } catch (err) {
      console.error("Booking submit error:", err);

      const status = err?.status;
      const code = err?.data?.code;

      if (status === 409 && code === "SLOT_TAKEN") {
        setErrorCode("SLOT_TAKEN");
        setError(
          "Цей час уже зайнятий для обраного фотографа. Оберіть інший час або іншого фотографа."
        );
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

  if (showSuccess) {
    return (
      <div className="booking-page">
        <section className="section">
          <div className="container">
            <div className="success-screen">
              <div className="success-icon">✓</div>
              <h1>Бронювання успішно відправлено!</h1>
              <p className="text-large text-light">
                Ми зв&apos;яжемося з вами найближчим часом для підтвердження деталей.
              </p>
              <p className="text-light">
                Альбом для фотосесії вже створено в “Архіві фото”. Спочатку він буде в обробці.
              </p>
              <Button size="large" onClick={() => setShowSuccess(false)}>
                Повернутися
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
            Заповніть форму, і ми зв&apos;яжемося з вами для підтвердження
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="booking-layout">
            <div className="booking-form-container">
              {loadingData && <p className="text-light">Завантаження списків...</p>}
              {error && <p className="text-light" style={{ color: "crimson" }}>{error}</p>}

              <form onSubmit={handleSubmit} className="booking-form">
                <div className="form-section">
                  <h3>Деталі бронювання</h3>

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
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-row">
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
                        <select
                          name="time"
                          value={formData.time}
                          onChange={handleChange}
                          className={`input ${errorCode === "SLOT_TAKEN" ? "input-error" : ""}`}
                          required
                        >

                        <option value="">Оберіть час</option>
                        {timeSlots.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="label">Оберіть фотографа</label>
                      <select
                        name="photographer"
                        value={formData.photographer}
                        onChange={handleChange}
                        className={`input ${errorCode === "SLOT_TAKEN" ? "input-error" : ""}`}
                        disabled={loadingData}
                      >

                      <option value="">Будь-який доступний</option>
                      {photographers.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-section">
                  <h3>Додаткові послуги</h3>

                  <div className="checkbox-group">
                    {additionalServices.map((s) => (
                      <label key={s.value} className="checkbox-label">
                        <input
                          type="checkbox"
                          value={s.value}
                          checked={formData.additional.includes(s.value)}
                          onChange={handleChange}
                        />
                        <span>
                          {s.label} (+{s.price} ₴)
                        </span>
                      </label>
                    ))}
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
                      placeholder="Розкажіть про ваші побажання до фотосесії..."
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  size="large"
                  className="submit-btn"
                  disabled={loadingSubmit || loadingData}
                >
                  {loadingSubmit ? "Відправляємо..." : "Підтвердити бронювання"}
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

                  {formData.photographer && (
                    <div className="summary-item">
                      <span>Фотограф:</span>
                      <strong>{selectedPhotographer?.label}</strong>
                    </div>
                  )}
                </div>

                {formData.additional.length > 0 && (
                  <div className="summary-section">
                    <h4>Додаткові послуги:</h4>
                    {formData.additional.map((item) => {
                      const s = additionalServices.find((x) => x.value === item);
                      return (
                        <div key={item} className="summary-item">
                          <span>{s?.label}</span>
                          <strong>{s?.price} ₴</strong>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="summary-total">
                  <span>Загальна вартість:</span>
                  <strong>{calculateTotal()} ₴</strong>
                </div>
                
                <p className="text-small text-light" style={{ marginTop: 10 }}>
                  Оплата та підтвердження — після дзвінка менеджера.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Booking;
