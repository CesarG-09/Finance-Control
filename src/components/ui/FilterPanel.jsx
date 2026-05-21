import { useState } from 'react';

export function FilterPanel({
  filters,
  onFilterChange,
  onClear,
  title = 'Filtros',
  expandable = true,
}) {
  const [isExpanded, setIsExpanded] = useState(!expandable);
  const activeFilterCount = Object.values(filters).filter(
    (v) => v !== '' && v !== null && v !== undefined
  ).length;

  const handleFilterChange = (key, value) => {
    onFilterChange?.({
      ...filters,
      [key]: value,
    });
  };

  const handleClear = () => {
    const clearedFilters = Object.keys(filters).reduce((acc, key) => {
      acc[key] = '';
      return acc;
    }, {});
    onFilterChange?.(clearedFilters);
    onClear?.();
  };

  return (
    <div className="filter-panel">
      <div className="filter-panel-header">
        {expandable && (
          <button
            type="button"
            className="filter-toggle"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
          >
            <span className={`toggle-icon ${isExpanded ? 'open' : ''}`}>▼</span>
          </button>
        )}
        <h3 className="filter-title">
          {title}
          {activeFilterCount > 0 && (
            <span className="filter-badge">{activeFilterCount}</span>
          )}
        </h3>
        {activeFilterCount > 0 && (
          <button
            type="button"
            className="filter-clear-btn"
            onClick={handleClear}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="filter-panel-content">
          {Object.entries(filters).map(([key, value]) => (
            <div key={key} className="filter-item">
              <label htmlFor={key} className="filter-label">
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </label>
              <input
                id={key}
                type="text"
                value={value}
                onChange={(e) => handleFilterChange(key, e.target.value)}
                placeholder={`Filtrar por ${key.toLowerCase()}`}
                className="filter-input"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
