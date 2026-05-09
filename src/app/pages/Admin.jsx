import React, { useEffect, useMemo, useState } from "react";
import { Link, Routes, Route, useLocation } from "react-router-dom";
import Button from "../components/Button";
import Modal from "../components/Modal";
import { adminApi } from "../api/admin";
import "./Admin.css";

const Field = ({ label, children }) => (
  <div className="form-group">
    <label className="label">{label}</label>
    {children}
  </div>
);

const Stats = () => {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminApi.stats().then(setStats).catch((e) => setError(e?.data?.message || "Помилка"));
  }, []);

  if (error) return <p className="text-light" style={{ color: "crimson" }}>{error}</p>;
  if (!stats) return <p className="text-light">Завантаження...</p>;

  return (
    <div className="admin-stats">
      <div className="overview-card">
        <h3>Усі бронювання</h3>
        <div className="overview-number">{stats.bookings.total}</div>
      </div>
      <div className="overview-card">
        <h3>Сьогодні сесій</h3>
        <div className="overview-number">{stats.bookings.today}</div>
      </div>
      <div className="overview-card">
        <h3>Дохід (₴)</h3>
        <div className="overview-number">{stats.bookings.revenue.toLocaleString("uk-UA")}</div>
      </div>
      <div className="overview-card">
        <h3>Фотографи</h3>
        <div className="overview-number">{stats.photographers}</div>
      </div>
      <div className="overview-card">
        <h3>Послуги</h3>
        <div className="overview-number">{stats.services}</div>
      </div>
      <div className="overview-card">
        <h3>Зали</h3>
        <div className="overview-number">{stats.studios}</div>
      </div>
    </div>
  );
};

const PhotographersTab = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    specialty: "",
    experienceYears: "",
    experienceLabel: "",
    bio: "",
    image: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await adminApi.photographers.list();
      setItems(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const startCreate = () => {
    setEditing(null);
    setForm({
      name: "", email: "", password: "",
      specialty: "", experienceYears: "", experienceLabel: "",
      bio: "", image: "",
    });
    setErr("");
    setOpen(true);
  };

  const startEdit = (p) => {
    setEditing(p);
    setForm({
      name: p.name || "",
      email: p.email || "",
      password: "",
      specialty: p.specialty || "",
      experienceYears: p.experienceYears || "",
      experienceLabel: p.experienceLabel || "",
      bio: p.bio || "",
      image: p.image || "",
    });
    setErr("");
    setOpen(true);
  };

  const submit = async () => {
    setErr("");
    setBusy(true);
    try {
      if (editing) {
        const { name, specialty, experienceYears, experienceLabel, bio, image } = form;
        await adminApi.photographers.update(editing.id, {
          name, specialty, experienceYears, experienceLabel, bio, image,
        });
      } else {
        await adminApi.photographers.create(form);
      }
      setOpen(false);
      await load();
    } catch (e) {
      setErr(e?.data?.message || "Помилка збереження");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (!confirm("Видалити фотографа? Його обліковий запис теж буде видалено.")) return;
    await adminApi.photographers.remove(id);
    await load();
  };

  return (
    <div>
      <div className="admin-tab-header">
        <h2>Фотографи</h2>
        <Button onClick={startCreate}>+ Додати фотографа</Button>
      </div>

      {loading ? (
        <p className="text-light">Завантаження...</p>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Ім'я</th>
                <th>Email</th>
                <th>Спеціалізація</th>
                <th>Досвід</th>
                <th>Дії</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.email}</td>
                  <td>{p.specialty || "—"}</td>
                  <td>{p.experienceYears ? `${p.experienceYears} р.` : "—"}</td>
                  <td className="booking-actions-cell">
                    <Button size="small" variant="secondary" onClick={() => startEdit(p)}>Редагувати</Button>
                    <Button size="small" variant="secondary" onClick={() => remove(p.id)}>Видалити</Button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={5} className="text-light">Поки що немає фотографів.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <Modal
          title={editing ? "Редагувати фотографа" : "Додати фотографа"}
          isOpen={open}
          onClose={() => setOpen(false)}
        >
          <div className="admin-form">
            <Field label="Ім'я *">
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Email *">
              <input
                className="input"
                type="email"
                value={form.email}
                disabled={!!editing}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            {!editing && (
              <Field label="Тимчасовий пароль *">
                <input
                  className="input"
                  type="text"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </Field>
            )}
            <Field label="Спеціалізація">
              <input className="input" value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} />
            </Field>
            <div className="form-row">
              <Field label="Років досвіду">
                <input
                  className="input"
                  type="number"
                  value={form.experienceYears}
                  onChange={(e) => setForm({ ...form, experienceYears: e.target.value })}
                />
              </Field>
              <Field label="Підпис досвіду">
                <input
                  className="input"
                  placeholder="напр. 5 років з весіллями"
                  value={form.experienceLabel}
                  onChange={(e) => setForm({ ...form, experienceLabel: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Опис (bio)">
              <textarea className="input" rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
            </Field>
            <Field label="URL аватарки">
              <input className="input" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} />
            </Field>

            {err && <p className="text-light" style={{ color: "crimson" }}>{err}</p>}

            <div style={{ display: "flex", gap: 10 }}>
              <Button onClick={submit} disabled={busy}>
                {busy ? "Зберігаємо..." : "Зберегти"}
              </Button>
              <Button variant="secondary" onClick={() => setOpen(false)}>Скасувати</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

const ServicesTab = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    title: "", label: "", shortDescription: "", description: "",
    priceFrom: "", currency: "UAH", duration: "", image: "", category: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await adminApi.services.list();
      setItems(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const startCreate = () => {
    setEditing(null);
    setForm({ title: "", label: "", shortDescription: "", description: "", priceFrom: "", currency: "UAH", duration: "", image: "", category: "" });
    setErr("");
    setOpen(true);
  };
  const startEdit = (s) => {
    setEditing(s);
    setForm({
      title: s.title || "",
      label: s.label || "",
      shortDescription: s.shortDescription || "",
      description: s.description || "",
      priceFrom: s.priceFrom || "",
      currency: s.currency || "UAH",
      duration: s.duration || "",
      image: s.image || "",
      category: s.category || "",
    });
    setErr("");
    setOpen(true);
  };

  const submit = async () => {
    setErr("");
    setBusy(true);
    try {
      if (editing) await adminApi.services.update(editing.id, form);
      else await adminApi.services.create(form);
      setOpen(false);
      await load();
    } catch (e) {
      setErr(e?.data?.message || "Помилка збереження");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (!confirm("Видалити послугу?")) return;
    await adminApi.services.remove(id);
    await load();
  };

  return (
    <div>
      <div className="admin-tab-header">
        <h2>Послуги</h2>
        <Button onClick={startCreate}>+ Додати послугу</Button>
      </div>

      {loading ? <p className="text-light">Завантаження...</p> : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Назва</th>
                <th>Категорія</th>
                <th>Ціна від</th>
                <th>Тривалість</th>
                <th>Дії</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id}>
                  <td>{s.title || s.label}</td>
                  <td>{s.category || "—"}</td>
                  <td>{s.priceFrom} {s.currency}</td>
                  <td>{s.duration || "—"}</td>
                  <td className="booking-actions-cell">
                    <Button size="small" variant="secondary" onClick={() => startEdit(s)}>Редагувати</Button>
                    <Button size="small" variant="secondary" onClick={() => remove(s.id)}>Видалити</Button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={5} className="text-light">Поки що немає послуг.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <Modal title={editing ? "Редагувати послугу" : "Додати послугу"} isOpen={open} onClose={() => setOpen(false)}>
          <div className="admin-form">
            <Field label="Назва *">
              <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </Field>
            <Field label="Короткий опис">
              <input className="input" value={form.shortDescription} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} />
            </Field>
            <Field label="Повний опис">
              <textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <div className="form-row">
              <Field label="Ціна від (₴)">
                <input className="input" type="number" value={form.priceFrom} onChange={(e) => setForm({ ...form, priceFrom: e.target.value })} />
              </Field>
              <Field label="Тривалість">
                <input className="input" placeholder="напр. 1 година" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
              </Field>
            </div>
            <Field label="Категорія">
              <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="">— не вказано —</option>
                <option value="portrait">Портрети</option>
                <option value="wedding">Весілля</option>
                <option value="family">Сімейні</option>
                <option value="business">Бізнес</option>
              </select>
            </Field>
            <Field label="URL зображення">
              <input className="input" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} />
            </Field>

            {err && <p className="text-light" style={{ color: "crimson" }}>{err}</p>}

            <div style={{ display: "flex", gap: 10 }}>
              <Button onClick={submit} disabled={busy}>{busy ? "Зберігаємо..." : "Зберегти"}</Button>
              <Button variant="secondary" onClick={() => setOpen(false)}>Скасувати</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

const StudiosTab = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: "", description: "", hourlyPrice: "", area: "",
    equipmentText: "", image: "", galleryText: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await adminApi.studios.list();
      setItems(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const startCreate = () => {
    setEditing(null);
    setForm({ name: "", description: "", hourlyPrice: "", area: "", equipmentText: "", image: "", galleryText: "" });
    setErr("");
    setOpen(true);
  };

  const startEdit = (s) => {
    setEditing(s);
    setForm({
      name: s.name || "",
      description: s.description || "",
      hourlyPrice: s.hourlyPrice || "",
      area: s.area || "",
      equipmentText: (s.equipment || []).join("\n"),
      image: s.image || "",
      galleryText: (s.gallery || []).join("\n"),
    });
    setErr("");
    setOpen(true);
  };

  const submit = async () => {
    setErr("");
    setBusy(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        hourlyPrice: form.hourlyPrice,
        area: form.area,
        image: form.image,
        equipment: form.equipmentText.split("\n").map((s) => s.trim()).filter(Boolean),
        gallery: form.galleryText.split("\n").map((s) => s.trim()).filter(Boolean),
      };
      if (editing) await adminApi.studios.update(editing.id, payload);
      else await adminApi.studios.create(payload);
      setOpen(false);
      await load();
    } catch (e) {
      setErr(e?.data?.message || "Помилка збереження");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (!confirm("Видалити зал?")) return;
    await adminApi.studios.remove(id);
    await load();
  };

  return (
    <div>
      <div className="admin-tab-header">
        <h2>Зали</h2>
        <Button onClick={startCreate}>+ Додати зал</Button>
      </div>

      {loading ? <p className="text-light">Завантаження...</p> : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Назва</th>
                <th>Площа</th>
                <th>Ціна/год</th>
                <th>Дії</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.area || "—"}</td>
                  <td>{s.hourlyPrice} ₴</td>
                  <td className="booking-actions-cell">
                    <Button size="small" variant="secondary" onClick={() => startEdit(s)}>Редагувати</Button>
                    <Button size="small" variant="secondary" onClick={() => remove(s.id)}>Видалити</Button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={4} className="text-light">Поки що немає залів.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <Modal title={editing ? "Редагувати зал" : "Додати зал"} isOpen={open} onClose={() => setOpen(false)}>
          <div className="admin-form">
            <Field label="Назва *">
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Опис">
              <textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <div className="form-row">
              <Field label="Ціна за годину (₴)">
                <input className="input" type="number" value={form.hourlyPrice} onChange={(e) => setForm({ ...form, hourlyPrice: e.target.value })} />
              </Field>
              <Field label="Площа">
                <input className="input" placeholder="напр. 30 м²" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
              </Field>
            </div>
            <Field label="Обладнання (по одному в рядок)">
              <textarea className="input" rows={4} value={form.equipmentText} onChange={(e) => setForm({ ...form, equipmentText: e.target.value })} />
            </Field>
            <Field label="Головне фото (URL)">
              <input className="input" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} />
            </Field>
            <Field label="Галерея (URL по одному в рядок)">
              <textarea className="input" rows={4} value={form.galleryText} onChange={(e) => setForm({ ...form, galleryText: e.target.value })} />
            </Field>

            {err && <p className="text-light" style={{ color: "crimson" }}>{err}</p>}

            <div style={{ display: "flex", gap: 10 }}>
              <Button onClick={submit} disabled={busy}>{busy ? "Зберігаємо..." : "Зберегти"}</Button>
              <Button variant="secondary" onClick={() => setOpen(false)}>Скасувати</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

const Admin = () => {
  const location = useLocation();
  const path = location.pathname;

  return (
    <div className="admin-page">
      <section className="page-header">
        <div className="container">
          <h1>Адмін-кабінет</h1>
          <p className="text-large text-light">Керування фотографами, послугами та залами</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="cabinet-layout">
            <nav className="cabinet-nav">
              <Link to="/admin" className={`cabinet-nav-link ${path === "/admin" ? "active" : ""}`}>Огляд</Link>
              <Link to="/admin/photographers" className={`cabinet-nav-link ${path.startsWith("/admin/photographers") ? "active" : ""}`}>Фотографи</Link>
              <Link to="/admin/services" className={`cabinet-nav-link ${path.startsWith("/admin/services") ? "active" : ""}`}>Послуги</Link>
              <Link to="/admin/studios" className={`cabinet-nav-link ${path.startsWith("/admin/studios") ? "active" : ""}`}>Зали</Link>
            </nav>

            <div className="cabinet-content">
              <Routes>
                <Route index element={<Stats />} />
                <Route path="photographers" element={<PhotographersTab />} />
                <Route path="services" element={<ServicesTab />} />
                <Route path="studios" element={<StudiosTab />} />
              </Routes>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Admin;
