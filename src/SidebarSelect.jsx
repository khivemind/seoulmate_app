import { useState, useRef, useEffect } from "react";

export default function SidebarSelect({ value, onChange, options, placeholder, disabled }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const listRef = useRef(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // 패널 열릴 때 선택된 항목으로 스크롤
  useEffect(() => {
    if (!open || !listRef.current) return;
    const active = listRef.current.querySelector(".sbsel__item--selected");
    active?.scrollIntoView({ block: "nearest" });
  }, [open]);

  const handleSelect = (val) => {
    onChange(val);
    setOpen(false);
  };

  return (
    <div
      className={`sbsel${open ? " sbsel--open" : ""}${disabled ? " sbsel--disabled" : ""}`}
      ref={containerRef}
    >
      <button
        type="button"
        className="sbsel__trigger"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
      >
        <span className={`sbsel__label${!selected ? " sbsel__label--placeholder" : ""}`}>
          {selected?.label ?? placeholder ?? ""}
        </span>
        <svg className="sbsel__arrow" width="11" height="7" viewBox="0 0 11 7" fill="none">
          <path d="M1 1l4.5 4.5L10 1" stroke="currentColor" strokeWidth="1.6"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="sbsel__panel">
        <ul className="sbsel__list" ref={listRef}>
          {options.map((o) => (
            <li
              key={o.value}
              className={`sbsel__item${o.value === value ? " sbsel__item--selected" : ""}`}
              onClick={() => handleSelect(o.value)}
            >
              {o.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
