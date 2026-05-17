function ThemeToggle({ theme, onToggle }) {
  return (
    <div className="theme-toggle">
      <button className="theme-toggle-button" onClick={onToggle}>
        {theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      </button>
    </div>
  );
}

export default ThemeToggle;
