import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Card from "../components/Card";
import Button from "../components/Button";
import { dataApi } from "../api/data";
import "./Studios.css";

const Studios = () => {
  const [studios, setStudios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [active, setActive] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await dataApi.studios();
        if (cancelled) return;
        setStudios(Array.isArray(data) ? data : []);
      } catch (e) {
        if (cancelled) return;
        setError("Не вдалося завантажити список залів.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="studios-page">
      <section className="page-header">
        <div className="container">
          <h1>Наші зали</h1>
          <p className="text-large text-light">
            Оберіть простір під ваш настрій. Усі зали можна забронювати разом з фотосесією.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {loading && <p className="text-light">Завантаження...</p>}
          {error && <p className="text-light" style={{ color: "crimson" }}>{error}</p>}

          <div className="grid-3">
            {studios.map((s) => (
              <Card key={s.id} image={s.image} title={s.name}>
                <div className="studio-info">
                  {s.area && <span className="badge badge-accent">{s.area}</span>}
                  <p className="text-small text-light" style={{ marginTop: 6 }}>
                    {s.description}
                  </p>
                  <div className="studio-footer">
                    <span className="studio-price">
                      від {Number(s.hourlyPrice || 0).toLocaleString("uk-UA")} ₴/год
                    </span>
                    <Button size="small" onClick={() => setActive(s)}>Деталі</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {!loading && studios.length === 0 && !error && (
            <p className="text-light" style={{ textAlign: "center", marginTop: 24 }}>
              Поки що немає доданих залів.
            </p>
          )}
        </div>
      </section>

      {active && (
        <div className="studio-modal-backdrop" onClick={() => setActive(null)}>
          <div className="studio-modal" onClick={(e) => e.stopPropagation()}>
            <button className="studio-modal-close" onClick={() => setActive(null)}>×</button>
            <h2>{active.name}</h2>

            {active.image && (
              <img className="studio-modal-image" src={active.image} alt={active.name} />
            )}

            <p className="text-light">{active.description}</p>

            <div className="studio-modal-meta">
              {active.area && <div><strong>Площа:</strong> {active.area}</div>}
              <div><strong>Ціна:</strong> {Number(active.hourlyPrice || 0).toLocaleString("uk-UA")} ₴/год</div>
            </div>

            {Array.isArray(active.equipment) && active.equipment.length > 0 && (
              <div className="studio-equipment">
                <h4>Обладнання</h4>
                <ul>
                  {active.equipment.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}

            {Array.isArray(active.gallery) && active.gallery.length > 0 && (
              <div className="studio-gallery">
                {active.gallery.map((url, i) => (
                  <img key={i} src={url} alt="" />
                ))}
              </div>
            )}

            <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
              <Link to={`/booking?studio=${active.id}`}>
                <Button size="large">Забронювати цей зал</Button>
              </Link>
              <Button variant="secondary" onClick={() => setActive(null)}>Закрити</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Studios;
