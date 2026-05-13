import { useEffect, useRef } from "react";
import { GRADE_COLORS, GRADE_LABELS } from "./NaverMap.jsx";

export default function DongList({ items, selectedGu, selectedDong, onSelect }) {
  const selectedRef = useRef(null);

  // 선택된 항목으로 자동 스크롤
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedDong]);

  return (
    <aside className="dong-list">
      <div className="dong-list__header">
        <span className="dong-list__title">
          {selectedGu ? selectedGu : "전체 행정동"}
        </span>
        <span className="dong-list__count">{items.length}개</span>
      </div>

      <ul className="dong-list__ul">
        {items.map((item) => {
          const isSelected =
            item.sggnm === selectedGu && item.dongName === selectedDong;
          return (
            <li
              key={item.adm_cd}
              ref={isSelected ? selectedRef : null}
              className={`dong-list__item${isSelected ? " dong-list__item--active" : ""}`}
              onClick={() => onSelect(item.sggnm, item.dongName)}
            >
              <span
                className="dong-list__grade-badge"
                style={{ background: GRADE_COLORS[item.grade] ?? GRADE_COLORS[0] }}
              >
                {item.grade || "—"}
              </span>
              <div className="dong-list__names">
                <span className="dong-list__dong">{item.dongName}</span>
                {!selectedGu && (
                  <span className="dong-list__gu">{item.sggnm}</span>
                )}
              </div>
              <div className="dong-list__score-wrap">
                <span className="dong-list__score">
                  {item.score !== null ? item.score : "—"}
                </span>
                <span className="dong-list__grade-label">
                  {GRADE_LABELS[item.grade] ?? GRADE_LABELS[0]}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
