import { useEffect, useRef, useState } from "react";
import { GRADE_COLORS, GRADE_LABELS } from "./mapConstants.js";
import { LuSearch, LuX } from "react-icons/lu";

export default function DongList({ items, selectedGu, selectedDong, onSelect }) {
  const selectedRef = useRef(null);
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? items.filter(
        (item) =>
          item.dongName.includes(query.trim()) ||
          item.sggnm.includes(query.trim()),
      )
    : items;

  // 선택된 항목으로 자동 스크롤
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedDong]);

  // 자치구 필터 바뀌면 검색어 초기화
  useEffect(() => {
    setQuery("");
  }, [selectedGu]);

  return (
    <aside className="dong-list">
      <div className="dong-list__header">
        <span className="dong-list__title">
          {selectedGu ? selectedGu : "전체 행정동"}
        </span>
        <span className="dong-list__count">{filtered.length}개</span>
      </div>

      <div className="dong-list__search">
        <LuSearch size={14} className="dong-list__search-icon" />
        <input
          className="dong-list__search-input"
          type="text"
          placeholder="동 이름 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button className="dong-list__search-clear" onClick={() => setQuery("")}>
            <LuX size={12} />
          </button>
        )}
      </div>

      <ul className="dong-list__ul">
        {filtered.length === 0 && (
          <li className="dong-list__empty">검색 결과가 없습니다</li>
        )}
        {filtered.map((item) => {
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
