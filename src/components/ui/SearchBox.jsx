import { useState } from 'react';
import { useDebounce } from '../../hooks/useDebounce';

export function SearchBox({
  placeholder = 'Buscar...',
  onSearch,
  onSearchChange,
  value,
  debounceDelay = 300,
  autoFocus = false,
  clearable = true,
}) {
  const [localValue, setLocalValue] = useState(value || '');
  const debouncedValue = useDebounce(localValue, debounceDelay);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    onSearchChange?.(newValue);
  };

  const handleClear = () => {
    setLocalValue('');
    onSearchChange?.('');
    onSearch?.('');
  };

  return (
    <div className="search-box">
      <input
        type="text"
        placeholder={placeholder}
        value={localValue}
        onChange={handleChange}
        autoFocus={autoFocus}
        className="search-input"
      />
      {clearable && localValue && (
        <button
          type="button"
          className="search-clear-btn"
          onClick={handleClear}
          aria-label="Limpiar búsqueda"
        >
          ✕
        </button>
      )}
      <span className="search-icon">🔍</span>
    </div>
  );
}
