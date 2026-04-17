import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import './ThemeToggle.css';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      id="theme-toggle"
      className="theme-toggle-btn"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <span className="theme-toggle-icon-wrapper">
        <Sun size={18} className={`theme-toggle-icon sun ${theme === 'dark' ? 'active' : ''}`} />
        <Moon size={18} className={`theme-toggle-icon moon ${theme === 'light' ? 'active' : ''}`} />
      </span>
    </button>
  );
}
