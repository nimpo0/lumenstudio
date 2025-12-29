import React from 'react';

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'medium',
  type = 'button',
  disabled = false,
  className = ''
}) => {
  const baseClass = 'btn';
  const variantClass = variant === 'primary' ? 'btn-primary' : 'btn-secondary';
  const sizeClass = size === 'large' ? 'btn-large' : size === 'small' ? 'btn-small' : '';
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClass} ${variantClass} ${sizeClass} ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;
