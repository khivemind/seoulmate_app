import { GRADE_COLORS, GRADE_LABELS } from "./NaverMap.jsx";

export default function DongInfoCard({ gu, dong, score, grade, layerLabel, onDetail, onClose }) {
  if (!dong) return null;

  return (
    <div className="dong-info-card">
      <button className="dong-info-card__close" onClick={onClose} aria-label="닫기">
        ✕
      </button>
      <div className="dong-info-card__location">
        <span className="dong-info-card__gu">{gu}</span>
        <span className="dong-info-card__dong">{dong}</span>
      </div>
      <div className="dong-info-card__stats">
        <div className="dong-info-card__stat">
          <span className="dong-info-card__stat-label">{layerLabel ?? "종합 지수"}</span>
          <span className="dong-info-card__stat-value">{score}</span>
        </div>
        <div className="dong-info-card__divider" />
        <div className="dong-info-card__stat">
          <span className="dong-info-card__stat-label">등급</span>
          <span
            className="dong-info-card__grade"
            style={{ color: GRADE_COLORS[grade] }}
          >
            {GRADE_LABELS[grade]}
          </span>
        </div>
      </div>
      <button className="dong-info-card__detail-btn" onClick={onDetail}>
        상세보기
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.6"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
