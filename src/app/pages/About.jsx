import React from 'react';
import './About.css';

const About = () => {
  return (
    <div className="about-page">
      <section className="page-header">
        <div className="container">
          <h1>Про нас</h1>
          <p className="text-large text-light">
            Професійна фотостудія Lumen Studio у Києві
          </p>
        </div>
      </section>
      
      <section className="section">
        <div className="container">
          <div className="about-content">
            <div className="about-text">
              <h2>Наша історія</h2>
              <p>
                Lumen Studio була заснована з метою створювати незабутні спогади через фотографії. 
                За роки роботи ми виросли від невеликої студії до повноцінного
                фотографічного центру з командою професіоналів.
              </p>
              <p>
                Ми віримо, що кожна фотосесія унікальна, тому підходимо до кожного клієнта індивідуально,
                враховуючи всі побажання та створюючи комфортну атмосферу.
              </p>
              
              <h3>Чому обирають нас</h3>
              <ul className="benefits-list">
                <li>
                  <strong>Професійна команда</strong>
                  <p>8+ років досвіду у фотографії</p>
                </li>
                <li>
                  <strong>Сучасне обладнання</strong>
                  <p>Професійна техніка та освітлення</p>
                </li>
                <li>
                  <strong>Індивідуальний підхід</strong>
                  <p>Враховуємо всі ваші побажання</p>
                </li>
                <li>
                  <strong>Швидка обробка</strong>
                  <p>Отримайте фото протягом 7 днів</p>
                </li>
              </ul>
            </div>
            
            <div className="about-image">
              <img 
                src="src/app/images/Studio.jpg" 
                alt="Наша студія"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
