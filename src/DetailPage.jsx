import { useMemo } from "react";
import { GRADE_COLORS, GRADE_LABELS } from "./NaverMap.jsx";

const CATEGORIES = [
  { key: "traffic",     label: "교통",   icon: "🚇" },
  { key: "safety",      label: "안전",   icon: "🛡️" },
  { key: "environment", label: "환경",   icon: "🌿" },
  { key: "medical",     label: "의료",   icon: "🏥" },
  { key: "education",   label: "교육",   icon: "📚" },
];

// adm_cd 기반 시드로 재현 가능한 임의 값 생성
const seededRand = (seed, offset = 0) => {
  const x = Math.sin(seed * 9301 + offset * 49297 + 233) * 10000;
  return x - Math.floor(x);
};

const genCategoryScores = (baseScore, adm_cd) => {
  const seed = parseInt(adm_cd, 10) || 1;
  return CATEGORIES.map((cat, i) => {
    const noise = (seededRand(seed, i) - 0.5) * 30;
    return { ...cat, score: Math.min(100, Math.max(0, Math.round(baseScore + noise))) };
  });
};

const genMonthlyScores = (baseScore, adm_cd, year) => {
  const seed = (parseInt(adm_cd, 10) || 1) + year;
  return Array.from({ length: 12 }, (_, i) => {
    const noise = (seededRand(seed, i + 20) - 0.5) * 20;
    return Math.min(100, Math.max(0, Math.round(baseScore + noise)));
  });
};

const gradeFor = (score) =>
  score >= 80 ? 1 : score >= 60 ? 2 : score >= 40 ? 3 : score >= 20 ? 4 : 5;

export default function DetailPage({ gu, dong, adm_cd, score, grade, year, month, onBack }) {
  const categoryScores = useMemo(
    () => genCategoryScores(score, adm_cd),
    [score, adm_cd],
  );

  const monthlyScores = useMemo(
    () => genMonthlyScores(score, adm_cd, Number(year)),
    [score, adm_cd, year],
  );

  const maxMonthly = Math.max(...monthlyScores);

  return (
    <div className="detail-page">
      {/* 헤더 */}
      <header className="detail-header">
        <button className="detail-back" onClick={onBack}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          지도로 돌아가기
        </button>
        <span className="detail-header__period">{year}년 {month}월 기준</span>
      </header>

      <div className="detail-body">
        {/* 히어로 */}
        <section className="detail-hero">
          <div className="detail-hero__location">
            <span className="detail-hero__gu">{gu}</span>
            <h1 className="detail-hero__dong">{dong}</h1>
          </div>
          <div className="detail-hero__score-wrap">
            <div className="detail-hero__score">{score}</div>
            <div
              className="detail-hero__grade"
              style={{ background: GRADE_COLORS[grade] }}
            >
              {GRADE_LABELS[grade]}
            </div>
          </div>
        </section>

        {/* 카테고리별 점수 */}
        <section className="detail-section">
          <h2 className="detail-section__title">카테고리별 점수</h2>
          <div className="detail-cats">
            {categoryScores.map((cat) => {
              const g = gradeFor(cat.score);
              return (
                <div key={cat.key} className="detail-cat">
                  <div className="detail-cat__top">
                    <span className="detail-cat__icon">{cat.icon}</span>
                    <span className="detail-cat__label">{cat.label}</span>
                    <span
                      className="detail-cat__score"
                      style={{ color: GRADE_COLORS[g] }}
                    >
                      {cat.score}
                    </span>
                  </div>
                  <div className="detail-cat__bar-bg">
                    <div
                      className="detail-cat__bar-fill"
                      style={{
                        width: `${cat.score}%`,
                        background: GRADE_COLORS[g],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 월별 추이 */}
        <section className="detail-section">
          <h2 className="detail-section__title">{year}년 월별 점수 추이</h2>
          <div className="detail-trend">
            {monthlyScores.map((s, i) => {
              const g = gradeFor(s);
              const isCurrent = i + 1 === Number(month);
              return (
                <div key={i} className="detail-trend__col">
                  <span className="detail-trend__val">{s}</span>
                  <div className="detail-trend__bar-bg">
                    <div
                      className={`detail-trend__bar-fill${isCurrent ? " detail-trend__bar-fill--current" : ""}`}
                      style={{
                        height: `${(s / maxMonthly) * 100}%`,
                        background: GRADE_COLORS[g],
                      }}
                    />
                  </div>
                  <span className={`detail-trend__month${isCurrent ? " detail-trend__month--current" : ""}`}>
                    {i + 1}월
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
