import React, { useEffect, useMemo, useState } from "react";
import { Routes, Route, Link, useLocation, useNavigate, useParams } from "react-router-dom";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import Button from "../components/Button";
import Modal from "../components/Modal";
import { useAuth } from "../authorization/authContext";
import { photographerApi } from "../api/photographer";
import { bookingsApi } from "../api/bookings";
import { uploadFile } from "../supabase";
import "./CabinetPhotographer.css";

const STATUS_FLOW = ["Підтверджено", "В роботі", "Готово до видачі", "Завершено"];

const fmt = (d) => {
  if (!d) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const Overview = ({ stats, bookings, profile }) => {
  const upcoming = useMemo(() => {
    const today = fmt(new Date());
    return bookings
      .filter((b) => b.date >= today && b.status !== "cancelled")
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
      .slice(0, 3);
  }, [bookings]);

  return (
    <div className="cabinet-overview">
      <h2>Привіт, {profile?.name || "фотограф"}!</h2>

      <div className="overview-cards">
        <div className="overview-card">
          <h3>Сесій сьогодні</h3>
          <div className="overview-number">{stats?.today ?? "—"}</div>
        </div>
        <div className="overview-card">
          <h3>На цьому тижні</h3>
          <div className="overview-number">{stats?.thisWeek ?? "—"}</div>
        </div>
        <div className="overview-card">
          <h3>Очікують обробки</h3>
          <div className="overview-number">{stats?.processing ?? "—"}</div>
        </div>
        <div className="overview-card">
          <h3>Рейтинг</h3>
          <div className="overview-number">
            {stats?.avgRating ? `${stats.avgRating} ★` : "—"}
          </div>
          <p className="text-small text-light">{stats?.reviews || 0} відгуків</p>
        </div>
      </div>

      <div className="cabinet-section">
        <h2>Найближчі сесії</h2>
        <div className="bookings-list">
          {upcoming.map((b) => (
            <div key={b.id} className="booking-card">
              <div className="booking-info">
                <h4>{b.serviceLabel}</h4>
                <p className="text-small text-light">
                  {b.date} о {b.time} · клієнт: {b.userId}
                </p>
              </div>
              <span className="badge badge-accent">{b.status}</span>
            </div>
          ))}
          {upcoming.length === 0 && (
            <p className="text-light">На найближчий час сесій немає.</p>
          )}
        </div>
      </div>
    </div>
  );
};

const Schedule = ({ bookings, blocks, onAddBlock, onRemoveBlock }) => {
  const [pickedDate, setPickedDate] = useState(new Date());
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ startTime: "10:00", endTime: "12:00", reason: "" });

  const dateStr = fmt(pickedDate);

  const dayBookings = useMemo(
    () => bookings.filter((b) => b.date === dateStr && b.status !== "cancelled"),
    [bookings, dateStr]
  );

  const dayBlocks = useMemo(
    () => blocks.filter((b) => b.date === dateStr),
    [blocks, dateStr]
  );

  const tileContent = ({ date, view }) => {
    if (view !== "month") return null;
    const ds = fmt(date);
    const count =
      bookings.filter((b) => b.date === ds && b.status !== "cancelled").length +
      blocks.filter((b) => b.date === ds).length;
    if (count === 0) return null;
    return <div className="calendar-dot">{count}</div>;
  };

  const submitBlock = async () => {
    await onAddBlock({ date: dateStr, ...form });
    setShowAdd(false);
    setForm({ startTime: "10:00", endTime: "12:00", reason: "" });
  };

  return (
    <div>
      <h2>Розклад</h2>

      <div className="schedule-layout">
        <div className="schedule-calendar">
          <Calendar
            value={pickedDate}
            onChange={setPickedDate}
            tileContent={tileContent}
          />
          <Button style={{ marginTop: 12 }} onClick={() => setShowAdd(true)}>
            + Заблокувати час на {dateStr}
          </Button>
        </div>

        <div className="schedule-day">
          <h3>{dateStr}</h3>

          {dayBookings.length === 0 && dayBlocks.length === 0 && (
            <p className="text-light">Цей день вільний.</p>
          )}

          {dayBookings.map((b) => (
            <div key={b.id} className="schedule-item">
              <div className="schedule-time">{b.time}</div>
              <div className="schedule-body">
                <strong>{b.serviceLabel}</strong>
                <p className="text-small text-light">
                  Тривалість: {b.durationMin || 60} хв · Статус: {b.status}
                </p>
              </div>
            </div>
          ))}

          {dayBlocks.map((b) => (
            <div key={b.id} className="schedule-item schedule-item-block">
              <div className="schedule-time">{b.startTime}</div>
              <div className="schedule-body">
                <strong>Блокування</strong>
                <p className="text-small text-light">
                  до {b.endTime}{b.reason ? ` · ${b.reason}` : ""}
                </p>
              </div>
              <Button size="small" variant="secondary" onClick={() => onRemoveBlock(b.id)}>×</Button>
            </div>
          ))}
        </div>
      </div>

      {showAdd && (
        <Modal title="Заблокувати час" isOpen={showAdd} onClose={() => setShowAdd(false)}>
          <div style={{ display: "grid", gap: 12 }}>
            <p className="text-light">Дата: {dateStr}</p>
            <div className="form-row">
              <div className="form-group">
                <label className="label">Початок</label>
                <input
                  className="input"
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="label">Кінець</label>
                <input
                  className="input"
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="label">Причина (опціонально)</label>
              <input
                className="input"
                placeholder="Відпустка, обід, особисте..."
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
              />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Button onClick={submitBlock}>Зберегти</Button>
              <Button variant="secondary" onClick={() => setShowAdd(false)}>Скасувати</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

const Sessions = ({ bookings, onChangeStatus, onReschedule }) => {
  const [reschedule, setReschedule] = useState(null);
  const [form, setForm] = useState({ date: "", time: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const startReschedule = (b) => {
    setReschedule(b);
    setForm({ date: b.date, time: b.time });
    setErr("");
  };

  const submit = async () => {
    setErr("");
    setBusy(true);
    try {
      await onReschedule(reschedule.id, form);
      setReschedule(null);
    } catch (e) {
      setErr(e?.data?.message || "Помилка перенесення");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h2>Мої сесії</h2>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Дата</th>
              <th>Час</th>
              <th>Послуга</th>
              <th>Статус</th>
              <th>Дії</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id}>
                <td>{b.date}</td>
                <td>{b.time}</td>
                <td>{b.serviceLabel}</td>
                <td>
                  <select
                    className="input"
                    value={b.status}
                    onChange={(e) => onChangeStatus(b.id, e.target.value)}
                  >
                    {STATUS_FLOW.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="booking-actions-cell">
                  <Button size="small" variant="secondary" onClick={() => startReschedule(b)}>Перенести</Button>
                  <Link to={`/cabinet/albums/${b.id}`}>
                    <Button size="small">Альбом</Button>
                  </Link>
                </td>
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr><td colSpan={5} className="text-light">Поки що немає сесій.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {reschedule && (
        <Modal title="Перенести сесію" isOpen={!!reschedule} onClose={() => setReschedule(null)}>
          <div style={{ display: "grid", gap: 12 }}>
            <p className="text-light">{reschedule.serviceLabel}</p>
            <div className="form-row">
              <div className="form-group">
                <label className="label">Нова дата</label>
                <input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="label">Новий час</label>
                <input className="input" type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
              </div>
            </div>
            {err && <p className="text-light" style={{ color: "crimson" }}>{err}</p>}
            <div style={{ display: "flex", gap: 10 }}>
              <Button onClick={submit} disabled={busy}>{busy ? "Зберігаємо..." : "Підтвердити"}</Button>
              <Button variant="secondary" onClick={() => setReschedule(null)}>Скасувати</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

const AlbumsList = ({ albums }) => {
  return (
    <div>
      <h2>Альбоми</h2>

      <div className="albums-grid">
        {albums.map((a) => (
          <div key={a.id} className="album-card">
            <img
              src={a.cover || (a.photos && a.photos[0]) || "/placeholder-album.jpg"}
              alt={a.title}
              className="album-cover"
            />
            <div className="album-info">
              <h4>{a.title}</h4>
              <p className="text-small text-light">
                {(a.photos || []).length} фото · {a.status === "processing" ? "в обробці" : "готово"}
              </p>
              <Link to={`/cabinet/albums/${a.id}`}>
                <Button size="small">Відкрити</Button>
              </Link>
            </div>
          </div>
        ))}
        {albums.length === 0 && <p className="text-light">Поки що немає альбомів.</p>}
      </div>
    </div>
  );
};

const AlbumEditor = ({ albums, onUpdate }) => {
  const { albumId } = useParams();
  const navigate = useNavigate();
  const album = albums.find((a) => a.id === albumId);

  const [photos, setPhotos] = useState([]);
  const [cover, setCover] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (album) {
      setPhotos(album.photos || []);
      setCover(album.cover || "");
    }
  }, [album?.id]);

  if (!album) {
    return (
      <div>
        <Button variant="secondary" onClick={() => navigate("/cabinet/albums")}>← Назад</Button>
        <h2>Альбом не знайдено</h2>
      </div>
    );
  }

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    setUploading(true);
    const newUrls = [...photos];
    let done = 0;

    for (const file of files) {
      const path = `albums/${album.id}/${Date.now()}-${file.name}`;
      try {
        const { url } = await uploadFile(path, file, (p) => {
          const overall = (done + p) / files.length;
          setProgress(overall);
        });
        newUrls.push(url);
      } catch (e) {
        console.error("Помилка завантаження:", e);
      }
      done += 1;
    }

    setUploading(false);
    setProgress(0);
    setPhotos(newUrls);
    await onUpdate(album.id, { photos: newUrls, cover: cover || newUrls[0] || "" });
  };

  const removePhoto = async (url) => {
    if (!confirm("Видалити це фото з альбому?")) return;
    const next = photos.filter((u) => u !== url);
    const newCover = cover === url ? (next[0] || "") : cover;
    setPhotos(next);
    setCover(newCover);
    await onUpdate(album.id, { photos: next, cover: newCover });
  };

  const setAsCover = async (url) => {
    setCover(url);
    await onUpdate(album.id, { cover: url });
  };

  const publish = async () => {
    setBusy(true);
    try {
      await onUpdate(album.id, { status: "ready" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <Button variant="secondary" onClick={() => navigate("/cabinet/albums")}>← Назад</Button>
        <h2 style={{ margin: 0 }}>{album.title}</h2>
        <span className="badge badge-accent">{album.status}</span>
      </div>

      <div className="album-uploader">
        <input
          type="file"
          multiple
          accept="image/*"
          disabled={uploading}
          onChange={(e) => handleFiles(e.target.files)}
        />
        {uploading && <p className="text-light">Завантаження... {Math.round(progress * 100)}%</p>}
      </div>

      <div className="photo-grid">
        {photos.map((url, idx) => (
          <div key={idx} className={`photo-tile ${cover === url ? "is-cover" : ""}`}>
            <img src={url} alt="" />
            <div className="photo-actions">
              <button onClick={() => setAsCover(url)} title="Зробити обкладинкою">★</button>
              <button onClick={() => removePhoto(url)} title="Видалити">×</button>
            </div>
          </div>
        ))}
        {photos.length === 0 && <p className="text-light">Альбом порожній. Завантажте фото вище.</p>}
      </div>

      {album.status === "processing" && photos.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <Button onClick={publish} disabled={busy}>
            {busy ? "Публікуємо..." : "Опублікувати альбом для клієнта"}
          </Button>
          <p className="text-small text-light" style={{ marginTop: 8 }}>
            Після публікації клієнт побачить фото у своєму архіві.
          </p>
        </div>
      )}
    </div>
  );
};

const Portfolio = ({ profile, onSaveProfile }) => {
  const [form, setForm] = useState({
    specialty: "",
    experienceYears: "",
    experienceLabel: "",
    bio: "",
    image: "",
  });
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingWork, setUploadingWork] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setForm({
      specialty: profile.specialty || "",
      experienceYears: profile.experienceYears || "",
      experienceLabel: profile.experienceLabel || "",
      bio: profile.bio || "",
      image: profile.image || "",
    });
    setItems(profile.personalPortfolio || []);
  }, [profile?.id]);

  const save = async () => {
    setBusy(true);
    setMsg("");
    try {
      await onSaveProfile({ ...form, personalPortfolio: items });
      setMsg("Збережено");
    } catch (e) {
      setMsg("Помилка збереження");
    } finally {
      setBusy(false);
    }
  };

  const uploadAvatar = async (file) => {
    if (!file || !profile) return;
    setUploadingAvatar(true);
    try {
      const path = `photographers/${profile.id}/avatar-${Date.now()}-${file.name}`;
      const { url } = await uploadFile(path, file);
      setForm((f) => ({ ...f, image: url }));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const uploadWorks = async (fileList) => {
    if (!profile) return;
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    setUploadingWork(true);
    try {
      const next = [...items];
      for (const file of files) {
        const path = `photographers/${profile.id}/works/${Date.now()}-${file.name}`;
        const { url } = await uploadFile(path, file);
        next.push(url);
      }
      setItems(next);
    } finally {
      setUploadingWork(false);
    }
  };

  const removeWork = (url) => {
    setItems(items.filter((u) => u !== url));
  };

  return (
    <div>
      <h2>Моє портфоліо</h2>

      <div className="form-section">
        <h3>Профіль</h3>

        <div className="form-group">
          <label className="label">Аватарка</label>
          <div className="avatar-row">
            {form.image && <img src={form.image} alt="" className="avatar-preview" />}
            <input type="file" accept="image/*" disabled={uploadingAvatar} onChange={(e) => uploadAvatar(e.target.files?.[0])} />
            {uploadingAvatar && <span className="text-light">Завантаження...</span>}
          </div>
        </div>

        <div className="form-group">
          <label className="label">Спеціалізація</label>
          <input className="input" value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="label">Років досвіду</label>
            <input
              className="input"
              type="number"
              value={form.experienceYears}
              onChange={(e) => setForm({ ...form, experienceYears: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="label">Підпис досвіду</label>
            <input className="input" value={form.experienceLabel} onChange={(e) => setForm({ ...form, experienceLabel: e.target.value })} />
          </div>
        </div>

        <div className="form-group">
          <label className="label">Про себе</label>
          <textarea className="input" rows={4} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
        </div>
      </div>

      <div className="form-section">
        <h3>Особисті роботи</h3>
        <input
          type="file"
          multiple
          accept="image/*"
          disabled={uploadingWork}
          onChange={(e) => uploadWorks(e.target.files)}
        />
        {uploadingWork && <p className="text-light">Завантаження...</p>}

        <div className="photo-grid" style={{ marginTop: 12 }}>
          {items.map((url, i) => (
            <div key={i} className="photo-tile">
              <img src={url} alt="" />
              <div className="photo-actions">
                <button onClick={() => removeWork(url)} title="Видалити">×</button>
              </div>
            </div>
          ))}
          {items.length === 0 && <p className="text-light">Робіт ще немає.</p>}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <Button onClick={save} disabled={busy}>{busy ? "Зберігаємо..." : "Зберегти"}</Button>
        {msg && <span className="text-small text-light">{msg}</span>}
      </div>
    </div>
  );
};

const SettingsTab = () => {
  const { user } = useAuth();
  return (
    <div>
      <h2>Налаштування</h2>
      <div className="settings-form">
        <div className="form-group">
          <label className="label">Email</label>
          <input className="input" value={user?.email || ""} disabled />
        </div>
        <p className="text-light">
          Зміна пароля та інші опції — через адміністратора студії.
        </p>
      </div>
    </div>
  );
};

const CabinetPhotographer = () => {
  const location = useLocation();
  const path = location.pathname;
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = async () => {
    const [p, s, b, blk, alb] = await Promise.all([
      photographerApi.me(),
      photographerApi.stats(),
      photographerApi.bookings.list(),
      photographerApi.blocks.list(),
      photographerApi.albums.list(),
    ]);
    setProfile(p);
    setStats(s);
    setBookings(Array.isArray(b) ? b : []);
    setBlocks(Array.isArray(blk) ? blk : []);
    setAlbums(Array.isArray(alb) ? alb : []);
  };

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        await refresh();
        if (cancelled) return;
      } catch (e) {
        if (cancelled) return;
        setError("Не вдалося завантажити дані кабінету.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.uid]);

  const onAddBlock = async (payload) => {
    await photographerApi.blocks.create(payload);
    await refresh();
  };
  const onRemoveBlock = async (id) => {
    await photographerApi.blocks.remove(id);
    await refresh();
  };
  const onChangeStatus = async (id, status) => {
    await photographerApi.bookings.setStatus(id, status);
    await refresh();
  };
  const onReschedule = async (id, { date, time }) => {
    await bookingsApi.reschedule(id, { date, time });
    await refresh();
  };
  const onUpdateAlbum = async (id, patch) => {
    await photographerApi.albums.update(id, patch);
    await refresh();
  };
  const onSaveProfile = async (patch) => {
    await photographerApi.updateMe(patch);
    await refresh();
  };

  if (loading) return <p className="text-light" style={{ padding: 20 }}>Завантаження...</p>;
  if (error) return <p className="text-light" style={{ padding: 20, color: "crimson" }}>{error}</p>;

  return (
    <div className="cabinet-page">
      <section className="page-header">
        <div className="container">
          <h1>Кабінет фотографа</h1>
          <p className="text-large text-light">{profile?.specialty || "Керуйте сесіями та портфоліо"}</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="cabinet-layout">
            <nav className="cabinet-nav">
              <Link to="/cabinet" className={`cabinet-nav-link ${path === "/cabinet" ? "active" : ""}`}>Огляд</Link>
              <Link to="/cabinet/schedule" className={`cabinet-nav-link ${path.startsWith("/cabinet/schedule") ? "active" : ""}`}>Розклад</Link>
              <Link to="/cabinet/sessions" className={`cabinet-nav-link ${path.startsWith("/cabinet/sessions") ? "active" : ""}`}>Мої сесії</Link>
              <Link to="/cabinet/albums" className={`cabinet-nav-link ${path.startsWith("/cabinet/albums") ? "active" : ""}`}>Альбоми</Link>
              <Link to="/cabinet/portfolio" className={`cabinet-nav-link ${path.startsWith("/cabinet/portfolio") ? "active" : ""}`}>Портфоліо</Link>
              <Link to="/cabinet/settings" className={`cabinet-nav-link ${path === "/cabinet/settings" ? "active" : ""}`}>Налаштування</Link>
            </nav>

            <div className="cabinet-content">
              <Routes>
                <Route index element={<Overview stats={stats} bookings={bookings} profile={profile} />} />
                <Route path="schedule" element={<Schedule bookings={bookings} blocks={blocks} onAddBlock={onAddBlock} onRemoveBlock={onRemoveBlock} />} />
                <Route path="sessions" element={<Sessions bookings={bookings} onChangeStatus={onChangeStatus} onReschedule={onReschedule} />} />
                <Route path="albums" element={<AlbumsList albums={albums} />} />
                <Route path="albums/:albumId" element={<AlbumEditor albums={albums} onUpdate={onUpdateAlbum} />} />
                <Route path="portfolio" element={<Portfolio profile={profile} onSaveProfile={onSaveProfile} />} />
                <Route path="settings" element={<SettingsTab />} />
              </Routes>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CabinetPhotographer;
