import React, { useEffect, useMemo, useState } from "react";
import { Routes, Route, useNavigate, useParams } from "react-router-dom";
import Button from "../components/Button";
import { useAuth } from "../authorization/authContext";
import { albumsApi } from "../api/albums";
import { bookingsApi } from "../api/bookings";
import { reviewsApi } from "../api/reviews";

const API_URL = "https://nimpo0-github-io.onrender.com";
const TOKEN_KEY = "lumen_token";

const safeArray = (v) => (Array.isArray(v) ? v : []);

async function downloadPhoto(url, filename = "photo.jpg") {
  const token = localStorage.getItem(TOKEN_KEY);
  const proxy = `${API_URL}/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
  try {
    const res = await fetch(proxy, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error("failed");
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch {
    window.open(url, "_blank");
  }
}

const AlbumsList = ({ albums, bookingsById }) => {
  const navigate = useNavigate();

  return (
    <div>
      <h2>Архів фото</h2>

      <div className="albums-grid">
        {albums.map((album) => {
          const photos = safeArray(album.photos);
          const booking = album.bookingId ? bookingsById.get(album.bookingId) : null;

          return (
            <div key={album.id} className="album-card">
              <img
                src={album.cover || photos[0] || ""}
                alt={album.title}
                className="album-cover"
              />
              <div className="album-info">
                <h4>{album.title}</h4>

                {booking && (
                  <p className="text-small text-light" style={{ marginTop: 6 }}>
                    Пов’язано з бронюванням: {booking.serviceLabel || booking.serviceId} · {booking.date} {booking.time}
                  </p>
                )}

                <p className="text-small text-light">
                  {photos.length} фото
                  {album.status === "processing" ? " · в обробці" : ""}
                </p>

                <Button size="small" onClick={() => navigate(`/cabinet/photos/${album.id}`)}>
                  Переглянути
                </Button>
              </div>
            </div>
          );
        })}

        {albums.length === 0 && (
          <p className="text-light">
            Поки що немає альбомів. Вони з’являться після фотосесії.
          </p>
        )}
      </div>
    </div>
  );
};

const AlbumDetails = ({ albums }) => {
  const { albumId } = useParams();
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState(0);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [reviewMsg, setReviewMsg] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [downloading, setDownloading] = useState(false);

  async function handleDownload(url, filename) {
    setDownloading(true);
    await downloadPhoto(url, filename);
    setTimeout(() => setDownloading(false), 600);
  }

  const album = useMemo(
    () => albums.find((a) => String(a.id) === String(albumId)),
    [albums, albumId]
  );

  useEffect(() => setActiveIndex(0), [albumId]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setReviewMsg("");
        setIsSaved(false);
        const existing = await reviewsApi.getMy(albumId);
        if (cancelled) return;

        if (existing) {
          setRating(existing.rating || 5);
          setComment(existing.comment || "");
          setIsSaved(true);
        } else {
          setRating(5);
          setComment("");
          setIsSaved(false);
        }
      } catch (e) {
        setIsSaved(false);
      }
    })();

    return () => { cancelled = true; };
  }, [albumId]);

  if (!album) {
    return (
      <div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
          <Button variant="secondary" onClick={() => navigate("/cabinet/photos")}>
            ← Назад
          </Button>
          <h2 style={{ margin: 0 }}>Альбом не знайдено</h2>
        </div>
        <p className="text-light">Схоже, цього альбому немає в архіві.</p>
      </div>
    );
  }

  const photos = safeArray(album.photos);

  return (
    <div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Button variant="secondary" onClick={() => navigate("/cabinet/photos")}>
            ← Назад
          </Button>
          <div>
            <h2 style={{ margin: 0 }}>{album.title}</h2>
            <p className="text-small text-light" style={{ marginTop: 4 }}>
              {photos.length} фото
            </p>
          </div>
        </div>
      </div>

      {photos.length === 0 ? (
        <p className="text-light" style={{ marginTop: 16 }}>
          {album.status === "processing"
            ? album.message || "Очікуйте, фотограф обробляє ваші фото. Як тільки вони будуть готові — вони з’являться тут."
            : "У цьому альбомі поки що немає фото."}
        </p>
      ) : (
        <div style={{ marginTop: 16, display: "grid", gap: 16 }}>
          <div style={{ borderRadius: 16, overflow: "hidden" }}>
            <img src={photos[activeIndex]} alt="Фото" style={{ width: "100%", display: "block" }} />
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Button size="small" variant="secondary" onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}>
              ← Попереднє
            </Button>

            <Button
              size="small"
              disabled={downloading}
              onClick={() => handleDownload(photos[activeIndex], `${album.title}-${activeIndex + 1}.jpg`)}
            >
              {downloading ? "Завантаження..." : "Завантажити"}
            </Button>

            <Button size="small" variant="secondary" onClick={() => setActiveIndex((i) => Math.min(photos.length - 1, i + 1))}>
              Наступне →
            </Button>
          </div>

          <div className="text-small text-light">
            Фото {activeIndex + 1} з {photos.length}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 10 }}>
            {photos.map((url, idx) => (
              <button
                key={url + idx}
                onClick={() => setActiveIndex(idx)}
                style={{
                  border: idx === activeIndex ? "2px solid var(--accent)" : "1px solid rgba(0,0,0,0.08)",
                  padding: 0,
                  borderRadius: 12,
                  overflow: "hidden",
                  cursor: "pointer",
                  background: "transparent",
                }}
                aria-label={`Фото ${idx + 1}`}
              >
                <img src={url} alt="" style={{ width: "100%", height: 90, objectFit: "cover", display: "block" }} />
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 28, padding: 16, borderRadius: 16, border: "1px solid rgba(0,0,0,0.08)" }}>
        <h3 style={{ marginTop: 0 }}>Оцінити фотосесію</h3>

        {/* rating 1..5 */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              disabled={isSaved}
              onClick={() => {
                if (!isSaved) setRating(n);
              }}
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
          rows={4}
          placeholder="Ваш відгук (особистий)."
          value={comment}
            onChange={(e) => {
              if (!isSaved) setComment(e.target.value);
            }}
            readOnly={isSaved}
            style={{ width: "100%", resize: "vertical", background: isSaved ? "rgba(0,0,0,0.04)" : "white", cursor: isSaved ? "not-allowed" : "text",}
          }
        />

        {reviewMsg && (
          <p className="text-small text-light" style={{ marginTop: 8 }}>
            {reviewMsg}
          </p>
        )}

        {isSaved && (
          <div style={{ marginTop: 12 }}>
            <Button size="small" variant="secondary" onClick={() => setIsSaved(false)}>
              Редагувати відгук
            </Button>
          </div>
        )}
        
        <div style={{ marginTop: 12 }}>
          {!isSaved ? (
            <Button
              size="small"
              disabled={saving}
              onClick={async () => {
                try {
                  setSaving(true);
                  setReviewMsg("");
                  await reviewsApi.save({ albumId, rating, comment });
                  setReviewMsg("Збережено");
                  setIsSaved(true);
                } catch (e) {
                  setReviewMsg("Не вдалося зберегти ");
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? "Збереження..." : "Зберегти відгук"}
            </Button>
          ) : (
            <div className="text-small text-light">Дякую! Ваш відгук збережено.</div>
          )}
        </div>
      </div>
    </div>
  );
};

const CabinetPhotos = () => {
  const { user } = useAuth();

  const [albums, setAlbums] = useState([]);
  const [bookingsById, setBookingsById] = useState(new Map());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAll = async () => {
    const [albumsList, bookingsList] = await Promise.all([
      albumsApi.listMy(),
      bookingsApi.listMy(),
    ]);

    const map = new Map();
    (Array.isArray(bookingsList) ? bookingsList : []).forEach((b) => map.set(b.id, b));

    setAlbums(Array.isArray(albumsList) ? albumsList : []);
    setBookingsById(map);
  };

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError("");

        await loadAll();
        if (cancelled) return;
      } catch (e) {
        if (cancelled) return;
        setError("Не вдалося завантажити альбоми.");
        setAlbums([]);
        setBookingsById(new Map());
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user]);

  if (loading) return <p className="text-light">Завантаження...</p>;
  if (error) return <p className="text-light" style={{ color: "crimson" }}>{error}</p>;

  return (
    <Routes>
      <Route index element={<AlbumsList albums={albums} bookingsById={bookingsById} />} />
      <Route path=":albumId" element={<AlbumDetails albums={albums} />} />
    </Routes>
  );
};

export default CabinetPhotos;
