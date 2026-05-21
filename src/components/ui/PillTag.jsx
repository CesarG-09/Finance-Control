export function PillTag({
  label,
  variant = 'default',
  onRemove,
  color,
  icon,
  size = 'medium',
}) {
  const variantClass = `pill-tag--${variant}`;
  const sizeClass = `pill-tag--${size}`;
  const styleProps = color ? { '--tag-color': color } : {};

  return (
    <span className={`pill-tag ${variantClass} ${sizeClass}`} style={styleProps}>
      {icon && <span className="pill-icon">{icon}</span>}
      <span className="pill-label">{label}</span>
      {onRemove && (
        <button
          type="button"
          className="pill-remove"
          onClick={onRemove}
          aria-label={`Remover ${label}`}
        >
          ✕
        </button>
      )}
    </span>
  );
}
