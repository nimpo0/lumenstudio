import React, { useEffect, useMemo, useState } from "react";
import "./Portfolio.css";

import { dataApi } from "../api/data";

const Portfolio = () => {
  const [filter, setFilter] = useState("all");
  const [selectedImage, setSelectedImage] = useState(null);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await dataApi.portfolio();
        setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        setError("Не вдалося завантажити портфоліо. Спробуйте пізніше.");
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolio();
  }, []);

  const filteredPortfolio = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((item) => item.category === filter);
  }, [items, filter]);

  return (
    <div className="portfolio-page">
      <section className="page-header">
        <div className="container">
          <h1>Портфоліо</h1>
          <p className="text-large text-light">Наші найкращі роботи за останні роки</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
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

          {loading && <p className="text-light">Завантаження...</p>}
          {error && <p className="text-light" style={{ color: "crimson" }}>{error}</p>}

          {!loading && !error && (
            <div className="portfolio-grid">
              {filteredPortfolio.map((item) => (
                <div
                  key={item.id}
                  className="portfolio-item"
                  onClick={() => setSelectedImage(item)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setSelectedImage(item);
                  }}
                >
                  <img src={item.image} alt={item.title || "Фото"} loading="lazy" />
                  <div className="portfolio-overlay">
                    <span>{item.title || "Фото"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && !error && filteredPortfolio.length === 0 && (
            <p className="text-light">Немає робіт у цій категорії.</p>
          )}
        </div>
      </section>

      {selectedImage && (
        <div className="lightbox" onClick={() => setSelectedImage(null)} role="presentation">
          <button
            className="lightbox-close"
            onClick={() => setSelectedImage(null)}
            type="button"
          >
            ×
          </button>
          <img src={selectedImage.image} alt={selectedImage.title || "Фото"} />
        </div>
      )}
    </div>
  );
};

export default Portfolio;
