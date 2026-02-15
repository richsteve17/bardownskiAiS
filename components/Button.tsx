import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', className = '', ...props }) => {
  const baseStyle = "px-4 py-2 font-bold uppercase tracking-wider transform transition-all duration-100 active:scale-95 border-2";
  
  const variants = {
    primary: "bg-cyan-500 text-black border-cyan-400 hover:bg-cyan-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
    secondary: "bg-gray-800 text-white border-gray-600 hover:bg-gray-700 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
    danger: "bg-red-600 text-white border-red-500 hover:bg-red-500 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};
