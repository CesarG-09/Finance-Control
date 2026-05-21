import { useState, useEffect } from 'react';

export function AmountInput({
  value,
  onChange,
  label,
  placeholder = '0.00',
  min = 0,
  max,
  step = 0.01,
  required = false,
  disabled = false,
  showValidation = false,
}) {
  const [inputValue, setInputValue] = useState(value?.toString() || '');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    setInputValue(value?.toString() || '');
  }, [value]);

  const handleChange = (e) => {
    let val = e.target.value;

    // Allow empty value or valid numbers
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      setInputValue(val);
      const numVal = val === '' ? null : parseFloat(val);
      onChange?.(numVal);
    }
  };

  const handleBlur = () => {
    setTouched(true);
    // Validate on blur
    const numVal = inputValue === '' ? null : parseFloat(inputValue);
    if (numVal !== null) {
      if (numVal < min) {
        setInputValue(min.toString());
        onChange?.(min);
      }
      if (max !== undefined && numVal > max) {
        setInputValue(max.toString());
        onChange?.(max);
      }
    }
  };

  const isValid =
    !touched ||
    inputValue === '' ||
    (parseFloat(inputValue) >= min && (max === undefined || parseFloat(inputValue) <= max));

  return (
    <div className="amount-input-wrapper">
      {label && (
        <label>
          <span>{label}</span>
          {required && <span className="required-tag">Requerido</span>}
        </label>
      )}
      <div className={`amount-input-container ${!isValid ? 'error' : ''}`}>
        <input
          type="text"
          inputMode="decimal"
          value={inputValue}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className="amount-input"
        />
        {showValidation && touched && (
          <span className={`validation-icon ${isValid ? 'valid' : 'invalid'}`}>
            {isValid ? '✓' : '✗'}
          </span>
        )}
      </div>
      {!isValid && touched && (
        <small className="error-text">
          Valor debe estar entre {min} {max ? `y ${max}` : 'o superior'}
        </small>
      )}
    </div>
  );
}
