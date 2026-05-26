import { useState, useRef, useEffect } from "react";

export default function FilterSelect({ value, onChange, options, placeholder, disabled, showEmpty = true, className = "", onOpenChange }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const selected = options.find((o) => o.value === value);

  const setOpenWithCallback = (val) => {
    const next = typeof val === "function" ? val(open) : val;
    setOpen(next);
    onOpenChange?.(next);
  };

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpenWithCallback(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleSelect = (val) => {
    onChange({ target: { value: val } });
    setOpenWithCallback(false);
  };

  return (
    <div
      className={`fsel${open ? " fsel--open" : ""}${disabled ? " fsel--disabled" : ""}${className ? " " + className : ""}`}
      ref={containerRef}
    >
      <button
        type="button"
        className="fsel__trigger"
        onClick={() => !disabled && setOpenWithCallback((o) => !o)}
        disabled={disabled}
      >
        <span className={`fsel__label${!selected ? " fsel__label--placeholder" : ""}`}>
          {selected ? selected.label : placeholder}
        </span>
        <svg className="fsel__arrow" width="11" height="7" viewBox="0 0 11 7" fill="none">
          <path d="M1 1l4.5 4.5L10 1" stroke="currentColor" strokeWidth="1.6"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="fsel__panel">
        <ul className="fsel__list">
          {showEmpty && (
            <li
              className={`fsel__item fsel__item--placeholder${!value ? " fsel__item--selected" : ""}`}
              onClick={() => handleSelect("")}
            >
              {placeholder}
            </li>
          )}
          {options.map((o) => (
            <li
              key={o.value}
              className={`fsel__item${o.value === value ? " fsel__item--selected" : ""}${o.disabled ? " fsel__item--disabled" : ""}`}
              onClick={() => !o.disabled && handleSelect(o.value)}
            >
              {o.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
