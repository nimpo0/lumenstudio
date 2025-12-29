import React from 'react';

const Card = ({ 
  image, 
  title, 
  description, 
  children, 
  className = '',
  onClick
}) => {
  return (
    <div className={`card ${className}`} onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      {image && (
        <img src={image} alt={title || 'Card image'} className="card-image" loading="lazy" />
      )}
      {title && <h3 className="card-title">{title}</h3>}
      {description && <p className="card-text">{description}</p>}
      {children}
    </div>
  );
};

export default Card;
