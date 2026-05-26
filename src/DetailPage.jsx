import { useState, useMemo, useRef, useEffect } from "react";
import SidebarSelect from "./SidebarSelect.jsx";
import NaverMap from "./NaverMap.jsx";
import { GRADE_COLORS, GRADE_LABELS } from "./mapConstants.js";
import {
  LuLayoutDashboard,
  LuLeaf,
  LuActivity,
  LuThermometerSnowflake,
  LuShieldCheck,
  LuWallet,
  LuSearch,
  LuInfo,
  LuBot,
} from "react-icons/lu";

/* ── 백엔드 코드 불일치 보정 (overview API 레이어별 코드가 다른 동) ────── */
// key: detailTarget.adm_cd2 (App.jsx OVERVIEW_CODE_ALIASES 적용 후 값)
// value: { layerKey: 해당 레이어 overview API 실제 코드 }
const LAYER_OVERVIEW_CODE_OVERRIDES = {
  1174052500: {
    // 강동구 상일1동: overall/health는 2500, comfort는 2000
    comfort: "1174052000",
  },
};

/* ── 상수 ─────────────────────────────────── */
const CATEGORIES = [
  {
    key: "comfort",
    label: "쾌적도",
    icon: <LuLeaf size={24} color="#10b981" />,
    color: "#22C55E",
  },
  {
    key: "health",
    label: "건강",
    icon: <LuActivity size={24} color="#f43f5e" />,
    color: "#3B82F6",
  },
  {
    key: "hvac",
    label: "에너지 효율",
    icon: <LuThermometerSnowflake size={24} color="#0ea5e9" />,
    color: "#60A5FA",
  },
  {
    key: "safety",
    label: "치안",
    icon: <LuShieldCheck size={24} color="#3b82f6" />,
    color: "#8B5CF6",
  },
  {
    key: "expenses",
    label: "도시 활력도",
    icon: <LuWallet size={24} color="#8b5cf6" />,
    color: "#EAB308",
  },
];

const CATEGORY_DESC = {
  comfort:
    "대기 환경, 소음 수준, 온 ·습도 등을 종합하여 주거 쾌적도를 평가합니다.",
  health: "의료 접근성, 운동 시설, 식품 환경 등 건강 관련 지표를 평가합니다.",
  hvac: "여름·겨울 냉난방 필요도 및 에너지 효율 환경을 평가합니다.",
  safety: "범죄율, CCTV 설치 현황, 가로등 밀도 등 치안 지표를 평가합니다.",
  expenses: "임대료, 식료품비, 교통비 등 생활비용 수준을 평가합니다.",
};

/* ── 유틸 ─────────────────────────────────── */
const seededRand = (seed, offset = 0) => {
  const x = Math.sin(seed * 9301 + offset * 49297 + 233) * 10000;
  return x - Math.floor(x);
};

const getGradeInfo = (score) => {
  if (score >= 80) return { label: GRADE_LABELS[1], color: GRADE_COLORS[1] };
  if (score >= 60) return { label: GRADE_LABELS[2], color: GRADE_COLORS[2] };
  if (score >= 40) return { label: GRADE_LABELS[3], color: GRADE_COLORS[3] };
  if (score >= 20) return { label: GRADE_LABELS[4], color: GRADE_COLORS[4] };
  return { label: GRADE_LABELS[5], color: GRADE_COLORS[5] };
};

const gradeToInfo = (grade) => ({
  label: GRADE_LABELS[grade] ?? GRADE_LABELS[0],
  color: GRADE_COLORS[grade] ?? GRADE_COLORS[0],
});

const genCategoryScores = (base, adm_cd) => {
  const seed = parseInt(adm_cd, 10) || 1;
  return CATEGORIES.map((_, i) => {
    const noise = (seededRand(seed, i) - 0.5) * 30;
    return Math.min(100, Math.max(0, Math.round(base + noise)));
  });
};

// 전년도 1월 ~ 현재 월까지 추이 데이터 생성
const genTrendScores = (base, adm_cd, prevYear, upToMonth) => {
  const seed1 = (parseInt(adm_cd, 10) || 1) + prevYear;
  const seed2 = (parseInt(adm_cd, 10) || 1) + (prevYear + 1);
  const prev = Array.from({ length: 12 }, (_, i) => ({
    score: Math.min(
      100,
      Math.max(0, Math.round(base + (seededRand(seed1, i + 20) - 0.5) * 20)),
    ),
    month: i + 1,
    year: prevYear,
    isYearStart: i === 0,
  }));
  const cur = Array.from({ length: upToMonth }, (_, i) => ({
    score: Math.min(
      100,
      Math.max(0, Math.round(base + (seededRand(seed2, i + 20) - 0.5) * 20)),
    ),
    month: i + 1,
    year: prevYear + 1,
    isYearStart: i === 0,
  }));
  return [...prev, ...cur];
};

/* ── 원형 진행 표시 ───────────────────────── */
function CircleScore({ score, size = 100, stroke = 10, color: colorProp }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const color = colorProp ?? getGradeInfo(score).color;
  const numFontSize =
    size >= 140 ? "1.75rem" : size >= 110 ? "1.35rem" : "1.15rem";
  const unitFontSize = size >= 140 ? "0.7rem" : "0.6rem";

  return (
    <div className="cscore" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#f0f0f0"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="cscore__inner">
        <span className="cscore__num" style={{ fontSize: numFontSize }}>
          {score}
        </span>
        <span className="cscore__unit" style={{ fontSize: unitFontSize }}>
          /100
        </span>
      </div>
    </div>
  );
}

/* ── 라인 차트 ────────────────────────────── */
function LineChart({ scores, year, month, seoulAvgScores }) {
  const PAD = { t: 24, b: 38, l: 28, r: 10 };
  const W = 360,
    H = 160;
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const n = scores.length;
  const seoulSlice = seoulAvgScores?.slice(-n) ?? null;
  const allVals = seoulSlice ? [...scores, ...seoulSlice] : scores;
  const minV = Math.min(...allVals) - 8;
  const maxV = Math.max(...allVals) + 8;

  // 기준 year/month 포함 최근 n개월 레이블 역산
  const monthLabels = [];
  let y = Number(year),
    m = Number(month);
  for (let i = n - 1; i >= 0; i--) {
    monthLabels[i] = { year: y, month: m };
    m--;
    if (m === 0) {
      m = 12;
      y--;
    }
  }

  const px = (i) => PAD.l + (i / (n - 1)) * iw;
  const py = (v) => PAD.t + ih - ((v - minV) / (maxV - minV)) * ih;

  const linePath = scores
    .map((s, i) => `${i === 0 ? "M" : "L"}${px(i)},${py(s)}`)
    .join(" ");
  const areaPath = `${linePath} L${px(n - 1)},${H - PAD.b} L${px(0)},${H - PAD.b}Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H }}>
      {[0, 0.33, 0.66, 1].map((t) => {
        const yv = PAD.t + ih * (1 - t);
        return (
          <line
            key={t}
            x1={PAD.l}
            y1={yv}
            x2={W - PAD.r}
            y2={yv}
            stroke="#f0f0f0"
            strokeWidth="1"
          />
        );
      })}
      {seoulSlice && (() => {
        const seoulPath = seoulSlice
          .map((s, i) => `${i === 0 ? "M" : "L"}${px(i)},${py(s)}`)
          .join(" ");
        const last = seoulSlice[seoulSlice.length - 1];
        return (
          <>
            <path
              d={seoulPath}
              fill="none"
              stroke="#818CF8"
              strokeWidth="1.5"
              strokeDasharray="4,3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx={px(n - 1)} cy={py(last)} r="3" fill="#818CF8" />
            <text
              x={px(n - 1)}
              y={py(last) - 7}
              textAnchor="middle"
              fontSize="9"
              fill="#818CF8"
              fontWeight="600"
            >
              {last}
            </text>
          </>
        );
      })()}
      <path d={areaPath} fill="#00B493" fillOpacity="0.07" />
      <path
        d={linePath}
        fill="none"
        stroke="#00B493"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {scores.map((s, i) => {
        const cur = i === n - 1;
        const lbl = monthLabels[i];
        return (
          <g key={i}>
            <circle
              cx={px(i)}
              cy={py(s)}
              r={cur ? 5 : 3.5}
              fill={cur ? "#00B493" : "#fff"}
              stroke="#00B493"
              strokeWidth="2"
            />
            <text
              x={px(i)}
              y={py(s) - 9}
              textAnchor="middle"
              fontSize="10"
              fill={cur ? "#00B493" : "#9ca3af"}
              fontWeight={cur ? "700" : "400"}
            >
              {s}
            </text>
            <text
              x={px(i)}
              y={H - PAD.b + 14}
              textAnchor="middle"
              fontSize="10"
              fill={cur ? "#00B493" : "#9ca3af"}
              fontWeight={cur ? "700" : "400"}
            >
              {lbl.month}월
            </text>
            {lbl.month === 1 && (
              <text
                x={px(i)}
                y={H - PAD.b + 25}
                textAnchor="middle"
                fontSize="9"
                fill="#d1d5db"
              >
                {lbl.year}년
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ── 레이어 상세 추이 차트 ────────────────── */
function LayerTrendChart({ trend, yearOnly = false }) {
  const PAD = { t: 24, b: 38, l: 28, r: 10 };
  const W = 520,
    H = 160;
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const n = trend.length;
  const scores = trend.map((d) => d.score);
  const minV = Math.min(...scores) - 8;
  const maxV = Math.max(...scores) + 8;

  const px = (i) => PAD.l + (i / (n - 1)) * iw;
  const py = (v) => PAD.t + ih - ((v - minV) / (maxV - minV)) * ih;

  const linePath = trend
    .map((d, i) => `${i === 0 ? "M" : "L"}${px(i)},${py(d.score)}`)
    .join(" ");
  const areaPath = `${linePath} L${px(n - 1)},${H - PAD.b} L${px(0)},${H - PAD.b}Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H }}>
      {[0, 0.33, 0.66, 1].map((t) => (
        <line
          key={t}
          x1={PAD.l}
          y1={PAD.t + ih * (1 - t)}
          x2={W - PAD.r}
          y2={PAD.t + ih * (1 - t)}
          stroke="#f0f0f0"
          strokeWidth="1"
        />
      ))}
      <path d={areaPath} fill="#00B493" fillOpacity="0.07" />
      <path
        d={linePath}
        fill="none"
        stroke="#00B493"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {trend.map((d, i) => {
        const cur = i === n - 1;
        const showLabel = cur || i === 0 || i % 3 === 0;
        return (
          <g key={i}>
            <circle
              cx={px(i)}
              cy={py(d.score)}
              r={cur ? 5 : 3}
              fill={cur ? "#00B493" : "#fff"}
              stroke="#00B493"
              strokeWidth="2"
            />
            {showLabel && (
              <text
                x={px(i)}
                y={py(d.score) - 9}
                textAnchor="middle"
                fontSize="10"
                fill={cur ? "#00B493" : "#9ca3af"}
                fontWeight={cur ? "700" : "400"}
              >
                {d.score}
              </text>
            )}
            {(i % 2 === 0 || cur) && (
              <text
                x={px(i)}
                y={H - PAD.b + 14}
                textAnchor="middle"
                fontSize="10"
                fill={cur ? "#00B493" : "#9ca3af"}
                fontWeight={cur ? "700" : "400"}
              >
                {yearOnly ? `${d.year}년` : `${d.month}월`}
              </text>
            )}
            {!yearOnly && d.month === 1 && (
              <text
                x={px(i)}
                y={H - PAD.b + 25}
                textAnchor="middle"
                fontSize="9"
                fill="#d1d5db"
              >
                {d.year}년
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ── 버터플라이 비교 바 ─────────────────────── */
function CompareBar({ label, icon, scoreA, scoreB }) {
  const { color: colorA } = getGradeInfo(scoreA);
  const { color: colorB } = getGradeInfo(scoreB);
  return (
    <div className="cmp-bar">
      <div className="cmp-bar__side cmp-bar__side--a">
        <span className="cmp-bar__score">{scoreA}</span>
        <div className="cmp-bar__track cmp-bar__track--a">
          <div
            className="cmp-bar__fill"
            style={{ width: `${scoreA}%`, background: colorA }}
          />
        </div>
      </div>
      <div className="cmp-bar__cat">
        <span className="cmp-bar__icon">{icon}</span>
        <span className="cmp-bar__label">{label}</span>
      </div>
      <div className="cmp-bar__side cmp-bar__side--b">
        <div className="cmp-bar__track">
          <div
            className="cmp-bar__fill"
            style={{ width: `${scoreB}%`, background: colorB }}
          />
        </div>
        <span className="cmp-bar__score">{scoreB}</span>
      </div>
    </div>
  );
}

/* ── 이중 레이더 차트 ─────────────────────── */
function CompareRadar({ scoresA, scoresB }) {
  const SIZE = 220,
    center = SIZE / 2,
    maxR = center - 40,
    n = scoresA.length;
  const ang = (i) => (i / n) * 2 * Math.PI - Math.PI / 2;
  const pt = (i, r) => [
    center + r * Math.cos(ang(i)),
    center + r * Math.sin(ang(i)),
  ];

  const ptsA = scoresA.map((s, i) => pt(i, (s / 100) * maxR));
  const ptsB = scoresB.map((s, i) => pt(i, (s / 100) * maxR));

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ width: SIZE, height: SIZE }}>
      {[0.25, 0.5, 0.75, 1].map((l) => (
        <polygon
          key={l}
          points={Array.from({ length: n }, (_, i) => pt(i, l * maxR))
            .map(([x, y]) => `${x},${y}`)
            .join(" ")}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="1"
        />
      ))}
      {Array.from({ length: n }, (_, i) => {
        const [x, y] = pt(i, maxR);
        return (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={x}
            y2={y}
            stroke="#e5e7eb"
            strokeWidth="1"
          />
        );
      })}
      <polygon
        points={ptsA.map(([x, y]) => `${x},${y}`).join(" ")}
        fill="#00B493"
        fillOpacity="0.2"
        stroke="#00B493"
        strokeWidth="2"
      />
      <polygon
        points={ptsB.map(([x, y]) => `${x},${y}`).join(" ")}
        fill="#818CF8"
        fillOpacity="0.2"
        stroke="#818CF8"
        strokeWidth="2"
      />
      {ptsA.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3.5" fill="#00B493" />
      ))}
      {ptsB.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3.5" fill="#818CF8" />
      ))}
      {CATEGORIES.map((cat, i) => {
        const [lx, ly] = pt(i, maxR + 20);
        return (
          <text
            key={i}
            x={lx}
            y={ly}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="11"
            fill="#6b7280"
            fontWeight="500"
          >
            {cat.label}
          </text>
        );
      })}
    </svg>
  );
}

/* ── 추이 비교 차트 ────────────────────────── */
function CompareTrendChart({ trendA, trendB, nameA, nameB }) {
  const PAD = { t: 28, b: 32, l: 32, r: 48 };
  const W = 560,
    H = 170;
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const n = trendA.length;

  const allVals = [...trendA, ...trendB].map((d) => d.score);
  const minV = Math.max(0, Math.min(...allVals) - 8);
  const maxV = Math.min(100, Math.max(...allVals) + 8);

  const px = (i) => (n === 1 ? PAD.l + iw / 2 : PAD.l + (i / (n - 1)) * iw);
  const py = (v) => PAD.t + ih - ((v - minV) / (maxV - minV)) * ih;

  const pathA = trendA
    .map((d, i) => `${i === 0 ? "M" : "L"}${px(i)},${py(d.score)}`)
    .join(" ");
  const pathB = trendB
    .map((d, i) => `${i === 0 ? "M" : "L"}${px(i)},${py(d.score)}`)
    .join(" ");

  const yearBoundaryIdx = trendA.findIndex((d, i) => i > 0 && d.isYearStart);

  const lastA = trendA[n - 1].score;
  const lastB = trendB[n - 1].score;
  const pyA = py(lastA);
  const pyB = py(lastB);
  const labelOffsetA = Math.abs(pyA - pyB) < 14 ? -8 : 0;
  const labelOffsetB = Math.abs(pyA - pyB) < 14 ? 8 : 0;

  const avg = (arr) =>
    Math.round(arr.reduce((s, d) => s + d.score, 0) / arr.length);
  const max = (arr) => Math.max(...arr.map((d) => d.score));
  const min = (arr) => Math.min(...arr.map((d) => d.score));

  const statRows = [
    { label: "현재", a: lastA, b: lastB },
    { label: "평균", a: avg(trendA), b: avg(trendB) },
    { label: "최고", a: max(trendA), b: max(trendB) },
    { label: "최저", a: min(trendA), b: min(trendB) },
  ];

  return (
    <div className="dp-chart-card">
      <div className="dp-chart-card__title">종합 점수 추이 비교</div>
      <div className="cmp-trend__legend">
        <span className="cmp-radar__dot" style={{ background: "#00B493" }} />
        <span className="cmp-radar__name">{nameA}</span>
        <span className="cmp-radar__dot" style={{ background: "#818CF8" }} />
        <span className="cmp-radar__name">{nameB}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H }}>
        {[0.25, 0.5, 0.75, 1].map((t) => (
          <line
            key={t}
            x1={PAD.l}
            y1={PAD.t + ih * (1 - t)}
            x2={W - PAD.r}
            y2={PAD.t + ih * (1 - t)}
            stroke="#f0f0f0"
            strokeWidth="1"
          />
        ))}
        {yearBoundaryIdx >= 0 && (
          <>
            <line
              x1={px(yearBoundaryIdx)}
              y1={PAD.t - 6}
              x2={px(yearBoundaryIdx)}
              y2={H - PAD.b}
              stroke="#d1d5db"
              strokeWidth="1"
              strokeDasharray="3,3"
            />
            <text
              x={px(yearBoundaryIdx)}
              y={PAD.t - 10}
              textAnchor="middle"
              fontSize="9"
              fill="#9ca3af"
            >
              {trendA[yearBoundaryIdx].year}년
            </text>
          </>
        )}
        <path
          d={pathA}
          fill="none"
          stroke="#00B493"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={pathB}
          fill="none"
          stroke="#818CF8"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {trendA.map((d, i) => {
          if (i % 3 !== 0 && i !== n - 1) return null;
          return (
            <text
              key={i}
              x={px(i)}
              y={H - PAD.b + 12}
              textAnchor="middle"
              fontSize="9"
              fill="#9ca3af"
            >
              {d.month}월
            </text>
          );
        })}
        {/* 끝점 원 + 수치 레이블 */}
        <circle cx={px(n - 1)} cy={pyA} r="3.5" fill="#00B493" />
        <text
          x={px(n - 1) + 6}
          y={pyA + labelOffsetA + 4}
          fontSize="11"
          fill="#00B493"
          fontWeight="700"
        >
          {lastA}
        </text>
        <circle cx={px(n - 1)} cy={pyB} r="3.5" fill="#818CF8" />
        <text
          x={px(n - 1) + 6}
          y={pyB + labelOffsetB + 4}
          fontSize="11"
          fill="#818CF8"
          fontWeight="700"
        >
          {lastB}
        </text>
      </svg>

      {/* 수치 비교 테이블 */}
      <div className="cmp-trend__stats">
        <div className="cmp-trend__stats-row cmp-trend__stats-row--header">
          <span />
          <span style={{ color: "#00B493" }}>{nameA}</span>
          <span style={{ color: "#818CF8" }}>{nameB}</span>
          <span>차이</span>
        </div>
        {statRows.map(({ label, a, b }) => {
          const diff = a - b;
          const diffColor =
            diff > 0 ? "#00B493" : diff < 0 ? "#818CF8" : "var(--text)";
          return (
            <div key={label} className="cmp-trend__stats-row">
              <span className="cmp-trend__stats-label">{label}</span>
              <span style={{ color: "#00B493", fontWeight: 700 }}>{a}점</span>
              <span style={{ color: "#818CF8", fontWeight: 700 }}>{b}점</span>
              <span style={{ color: diffColor, fontWeight: 700 }}>
                {diff > 0 ? `+${diff}` : `${diff}`}점
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── 메인 컴포넌트 ────────────────────────── */
export default function DetailPage({
  gu,
  dong,
  adm_cd,
  adm_cd2,
  score,
  year,
  month,
  guDongItems,
  layerDongData,
  guList = [],
  onGuChange,
  onDongChange,
  gradeData,
  onBack,
}) {
  const [activeTab, setActiveTab] = useState("overall");
  const [cmpGu, setCmpGu] = useState("");
  const [cmpDong, setCmpDong] = useState("");
  const [cmpGrade, setCmpGrade] = useState("");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [overviewData, setOverviewData] = useState(null);
  const [prevOverviewData, setPrevOverviewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [nextExpensesScore, setNextExpensesScore] = useState(null);
  const [nextHvacScore, setNextHvacScore] = useState(null);
  const [cmpOverviewData, setCmpOverviewData] = useState(null);
  const [cmpLoading, setCmpLoading] = useState(false);
  const [layerModal, setLayerModal] = useState(null);
  const [modalClosing, setModalClosing] = useState(false);
  const [aiModal, setAiModal] = useState(null);
  const [aiModalClosing, setAiModalClosing] = useState(false);
  const mainRef = useRef(null);

  const closeLayerModal = () => {
    setModalClosing(true);
    setTimeout(() => {
      setLayerModal(null);
      setModalClosing(false);
    }, 180);
  };

  const closeAiModal = () => {
    setAiModalClosing(true);
    setTimeout(() => {
      setAiModal(null);
      setAiModalClosing(false);
    }, 180);
  };

  const openAiModal = async () => {
    setAiModal({ loading: true, content: null, error: false });
    const base = import.meta.env.VITE_API_BASE ?? "";
    const url = `${base}/v1/overview/${adm_cd2}/summary?year=${year}&month=${month}`;
    console.log(`[fetch] AI analysis →`, url);
    try {
      const res = await fetch(url, {
        headers: { "x-api-key": "v9WzP1xF7K8lQ2mR4sT6uY8aB0cD3eF9GhJkLmNo" },
      });
      const data = res.ok ? await res.json() : null;
      const SKIP = new Set(["status", "code", "dong", "gu"]);
      const sections = data
        ? Object.entries(data)
            .filter(([k]) => !SKIP.has(k))
            .map(([k, v]) => ({ title: k, content: String(v) }))
        : [];
      if (data?.status === 200 && sections.length > 0) {
        setAiModal({ loading: false, error: false, sections });
      } else {
        setAiModal({ loading: false, error: true, sections: [] });
      }
    } catch {
      setAiModal({ loading: false, error: true, sections: [] });
    }
  };

  const openLayerModal = async (cat) => {
    setLayerModal({ cat, loading: true, trend: null, score: null });
    const base = import.meta.env.VITE_API_BASE ?? "";
    const layerCode =
      LAYER_OVERVIEW_CODE_OVERRIDES[adm_cd2]?.[cat.key] ?? adm_cd2;
    const layerUrl = `${base}/v1/overview/${layerCode}?year=${year}&month=${month}&layer=${cat.key}`;
    console.log(`[fetch] layer modal →`, layerUrl);
    try {
      const res = await fetch(layerUrl, {
        headers: { "x-api-key": "v9WzP1xF7K8lQ2mR4sT6uY8aB0cD3eF9GhJkLmNo" },
      });
      const data = res.ok ? await res.json() : null;
      if (data?.status === 200) {
        const raw = data.score_trend ?? [];
        const lastItem = raw[raw.length - 1];
        const currentScore =
          typeof lastItem === "object"
            ? (lastItem?.score ?? 0)
            : (lastItem ?? 0);
        let trend;
        if (cat.key === "safety") {
          // 치안: {year, score} 객체 배열로 응답
          trend = raw.map((d) => ({ score: d.score, year: d.year, month: 1 }));
        } else {
          const prevYear = Number(year) - 1;
          const curMonth = Number(month);
          trend = [
            ...Array.from({ length: 12 }, (_, i) => ({
              score: raw[i] ?? 0,
              month: i + 1,
              year: prevYear,
            })),
            ...Array.from({ length: curMonth }, (_, i) => ({
              score: raw[12 + i] ?? 0,
              month: i + 1,
              year: Number(year),
            })),
          ];
        }
        setLayerModal({
          cat,
          loading: false,
          trend,
          score: currentScore,
          grade: layerDongData?.[cat.key]?.[adm_cd]?.grade ?? null,
          yearOnly: cat.key === "safety",
        });
      } else {
        setLayerModal({ cat, loading: false, trend: null, score: null });
      }
    } catch {
      setLayerModal({ cat, loading: false, trend: null, score: null });
    }
  };

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [dong]);

  useEffect(() => {
    if (!adm_cd2) return;
    setOverviewData(null);
    setPrevOverviewData(null);
    setNextExpensesScore(null);
    setNextHvacScore(null);
    setLoading(true);
    const base = import.meta.env.VITE_API_BASE ?? "";
    const overviewUrl = `${base}/v1/overview/${adm_cd2}?year=${year}&month=${month}`;
    console.log(`[fetch] overview →`, overviewUrl);
    fetch(overviewUrl, {
      headers: { "x-api-key": "v9WzP1xF7K8lQ2mR4sT6uY8aB0cD3eF9GhJkLmNo" },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setLoading(false);
        if (data?.status === 200) setOverviewData(data);
      })
      .catch(() => setLoading(false));

    // 이전 달 overview fetch (카테고리별 추이 계산용)
    const pm = Number(month) === 1 ? 12 : Number(month) - 1;
    const py = Number(month) === 1 ? Number(year) - 1 : Number(year);
    const prevUrl = `${base}/v1/overview/${adm_cd2}?year=${py}&month=${pm}`;
    console.log(`[fetch] prev overview →`, prevUrl);
    fetch(prevUrl, {
      headers: { "x-api-key": "v9WzP1xF7K8lQ2mR4sT6uY8aB0cD3eF9GhJkLmNo" },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.status === 200) setPrevOverviewData(data);
      })
      .catch(() => {});

    // 도시 활력도 다음 달 예측치 fetch
    const nm = Number(month) === 12 ? 1 : Number(month) + 1;
    const ny = Number(month) === 12 ? Number(year) + 1 : Number(year);
    const nextUrl = `${base}/v1/overview/${adm_cd2}?year=${ny}&month=${nm}`;
    console.log(`[fetch] next expenses →`, nextUrl);
    fetch(nextUrl, {
      headers: { "x-api-key": "v9WzP1xF7K8lQ2mR4sT6uY8aB0cD3eF9GhJkLmNo" },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.status === 200) {
          const expScore = data?.expenses ?? null;
          if (expScore != null) setNextExpensesScore(expScore);
          const hvacScore = data?.hvac ?? null;
          if (hvacScore != null) setNextHvacScore(hvacScore);
        }
      })
      .catch(() => {});
  }, [adm_cd2, year, month]);

  const gradeMap = useMemo(() => {
    if (!layerDongData) return {};
    const layers = [
      "overall",
      "safety",
      "comfort",
      "health",
      "stress",
      "hvac",
      "expenses",
    ];
    for (const layer of layers) {
      const data = layerDongData[layer];
      if (data && Object.keys(data).length > 0) return data;
    }
    return {};
  }, [layerDongData]);

  const cmpDongOptions = useMemo(
    () =>
      !cmpGu
        ? []
        : (guDongItems ?? [])
            .filter((item) => {
              if (item.sggnm !== cmpGu) return false;
              if (!cmpGrade) return true;
              const grade = gradeMap[item.adm_cd]?.grade ?? item.grade;
              return String(grade) === cmpGrade;
            })
            .map((item) => ({ value: item.dongName, label: item.dongName })),
    [cmpGu, cmpGrade, guDongItems, gradeMap],
  );
  const cmpItem = useMemo(
    () =>
      !cmpDong
        ? null
        : (guDongItems ?? []).find(
            (item) => item.sggnm === cmpGu && item.dongName === cmpDong,
          ),
    [cmpGu, cmpDong, guDongItems],
  );
  useEffect(() => {
    if (!cmpItem?.adm_cd2) {
      setCmpOverviewData(null);
      return;
    }
    setCmpOverviewData(null);
    setCmpLoading(true);
    const base = import.meta.env.VITE_API_BASE ?? "";
    const cmpUrl = `${base}/v1/overview/${cmpItem.adm_cd2}?year=${year}&month=${month}`;
    console.log(`[fetch] compare overview →`, cmpUrl);
    fetch(cmpUrl, {
      headers: { "x-api-key": "v9WzP1xF7K8lQ2mR4sT6uY8aB0cD3eF9GhJkLmNo" },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setCmpLoading(false);
        if (data?.status === 200) setCmpOverviewData(data);
      })
      .catch(() => {
        setCmpLoading(false);
      });
  }, [cmpItem?.adm_cd2, year, month]);

  const cmpCatScores = useMemo(() => {
    if (!cmpOverviewData) return null;
    return CATEGORIES.map((cat) => cmpOverviewData[cat.key] ?? 0);
  }, [cmpOverviewData]);

  const effectiveScore = overviewData?.score ?? score;

  const trendA = useMemo(
    () =>
      genTrendScores(effectiveScore, adm_cd, Number(year) - 1, Number(month)),
    [effectiveScore, adm_cd, year, month],
  );
  const trendB = useMemo(
    () =>
      cmpItem
        ? genTrendScores(
            cmpItem.score,
            cmpItem.adm_cd,
            Number(year) - 1,
            Number(month),
          )
        : null,
    [cmpItem, year, month],
  );

  const catScores = useMemo(() => {
    if (!overviewData) return null;
    return CATEGORIES.map((cat) => overviewData[cat.key] ?? 0);
  }, [overviewData]);

  const monthScores = overviewData?.score_last_year ?? null;

  const [seoulAvgScores, setSeoulAvgScores] = useState(null);
  useEffect(() => {
    const base = import.meta.env.VITE_API_BASE ?? "";
    const url = `${base}/v1/overview/city?year=${year}&month=${month}`;
    fetch(url, { headers: { "x-api-key": "v9WzP1xF7K8lQ2mR4sT6uY8aB0cD3eF9GhJkLmNo" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.score_last_year) setSeoulAvgScores(data.score_last_year); })
      .catch(() => {});
  }, [year, month]);

  const delta = overviewData
    ? Math.round(
        (overviewData.score_last_year?.at(-1) ?? 0) -
        (overviewData.score_last_year?.at(-2) ?? 0),
      )
    : null;

  const overallGrade = layerDongData?.["overall"]?.[adm_cd]?.grade;
  const { label: gradeLabel, color: gradeColor } = overallGrade
    ? gradeToInfo(overallGrade)
    : getGradeInfo(effectiveScore);
  const filteredDongItems = (guDongItems ?? []).filter(
    (item) => item.sggnm === gu,
  );
  const top3 = (guDongItems ?? []).slice(0, 3);
  const myRank = (guDongItems ?? []).findIndex((i) => i.dongName === dong) + 1;

  return (
    <div
      className={`detail-page${mobileSidebarOpen ? " detail-page--sidebar-open" : ""}`}
    >
      {/* 모바일 사이드바 오버레이 */}
      <div
        className="dp-sidebar-overlay"
        onClick={() => setMobileSidebarOpen(false)}
      />

      {/* ── 사이드바 ── */}
      <aside className="dp-sidebar">
        <button className="detail-back" onClick={onBack}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path
              d="M9 3L4 7.5 9 12"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          목록으로 돌아가기
        </button>

        <div className="dp-sb-section">
          <div className="dp-sb-title">구 선택</div>
          <SidebarSelect
            value={gu}
            onChange={(val) => onGuChange?.(val)}
            options={guList}
          />
        </div>

        <div className="dp-sb-section">
          <div className="dp-sb-title">동 선택</div>
          <SidebarSelect
            value={dong}
            onChange={(val) => onDongChange?.(val)}
            options={filteredDongItems.map((item) => ({
              value: item.dongName,
              label: `${item.sggnm} ${item.dongName}`,
            }))}
          />
        </div>

        <div className="dp-sb-section">
          <div className="dp-sb-title">선택한 동 정보</div>
          <div className="dp-sb-info-card">
            <div className="dp-sb-info-row">
              <span className="dp-sb-info-label">자치구</span>
              <span className="dp-sb-info-value">{gu}</span>
            </div>
            <div className="dp-sb-info-row">
              <span className="dp-sb-info-label">행정동</span>
              <span className="dp-sb-info-value">{dong}</span>
            </div>
          </div>
        </div>

        <div className="dp-sb-section">
          <div className="dp-sb-title">종합 쾌적도 점수</div>
          <div className="dp-sb-score">
            {overviewData ? (
              <>
                <CircleScore score={effectiveScore} size={90} stroke={9} color={gradeColor} />
                <div
                  className="dp-sb-score__grade"
                  style={{ color: gradeColor }}
                >
                  {gradeLabel}
                </div>
                {delta !== null && (
                  <div className="dp-sb-score__delta">
                    지난 달 대비{" "}
                    <span
                      style={{
                        color: delta >= 0 ? "#22C55E" : "#EF4444",
                        fontWeight: 700,
                      }}
                    >
                      {delta >= 0 ? `↑ ${delta}점` : `↓ ${Math.abs(delta)}점`}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="dp-chart-empty">데이터 준비 중입니다</div>
            )}
            {/* <div className="dp-security">
              <span>
                <LuShieldCheck size={24} color="#3b82f6" />
              </span>
              <span className="dp-security__label">치안</span>
              <span
                className="dp-security__grade"
                style={{ color: secInfo.color }}
              >
                {secInfo.label}
              </span>
              <span
                className="dp-security__delta"
                style={{ color: secDelta >= 0 ? "#22C55E" : "#EF4444" }}
              >
                {secDelta >= 0
                  ? `↑ ${secDelta}점`
                  : `↓ ${Math.abs(secDelta)}점`}
              </span>
            </div> */}
          </div>
        </div>

        <div className="dp-sb-section">
          <div className="dp-sb-title">종합 쾌적도 TOP 3</div>
          <div className="dp-sb-ranking">
            {top3.map((item, idx) => (
              <div
                key={item.adm_cd}
                className={`dp-sb-rank-item${item.dongName === dong ? " dp-sb-rank-item--active" : ""}`}
                onClick={() => onDongChange?.(item.dongName)}
              >
                <span className="dp-sb-rank-pos">{idx + 1}위</span>
                <span className="dp-sb-rank-name">{item.dongName}</span>
                <span className="dp-sb-rank-score">{item.score}점</span>
              </div>
            ))}
            {myRank > 3 && (
              <div className="dp-sb-rank-item dp-sb-rank-item--active">
                <span className="dp-sb-rank-pos">{myRank}위</span>
                <span className="dp-sb-rank-name">{dong}</span>
                <span className="dp-sb-rank-score">{effectiveScore}점</span>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── 메인 ── */}
      <div className="dp-main" ref={mainRef}>
        <div key={dong} className="dp-main-content">
          {/* 헤더 */}
          <div className="dp-main-header">
            <div>
              <h2 className="dp-main-title">{dong} 분석 결과</h2>
              <p className="dp-main-period">
                {year}년 {month}월 기준
              </p>
            </div>
            <div className="dp-tab-group">
              {["overall", "compare"].map((tab) => (
                <button
                  key={tab}
                  className={`dp-tab${activeTab === tab ? " dp-tab--active" : ""}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab === "overall" ? "종합 점수" : "지표 비교"}
                </button>
              ))}
            </div>
          </div>

          {/* 지도 (종합 탭에서만) */}
          {activeTab === "overall" && (
            <div className="dp-detail-map">
              <NaverMap
                selectedGu={gu}
                selectedDong={dong}
                gradeData={gradeData}
                onDongClick={(clickedGu, clickedDong) => {
                  if (clickedGu !== gu) {
                    onGuChange?.(clickedGu);
                    return;
                  }
                  onDongChange?.(clickedDong);
                }}
              />
            </div>
          )}

          {activeTab === "overall" ? (
            loading ? (
              <div className="cmp-empty">
                <span className="cmp-empty__text">데이터를 불러오는 중...</span>
              </div>
            ) : !overviewData ? (
              <div className="cmp-empty">
                <span className="cmp-empty__text">데이터가 없습니다</span>
              </div>
            ) : (
              <>
                {/* 점수 카드 */}
                <div className="dp-scores">
                  {CATEGORIES.map((cat, i) => {
                    const s = catScores[i];
                    const catGrade = layerDongData?.[cat.key]?.[adm_cd]?.grade;
                    const { label: gl, color: gc } = catGrade
                      ? gradeToInfo(catGrade)
                      : getGradeInfo(s);
                    const prevScore =
                      cat.key === "safety" ? null : prevOverviewData?.[cat.key];
                    const delta = prevScore != null ? Math.round(s - prevScore) : null;
                    const trend =
                      delta == null
                        ? null
                        : delta > 2
                          ? "up"
                          : delta < -2
                            ? "down"
                            : "flat";
                    return (
                      <div key={cat.key} className="dp-score-card">
                        <div className="dp-score-card__header">
                          <span style={{ fontSize: "1rem" }}>{cat.icon}</span>
                          <span className="dp-score-card__title">
                            {cat.label}
                          </span>
                          {cat.key === "safety" && (
                            <span className="dp-score-card__info">
                              <LuInfo size={12} />
                              <span className="dp-score-card__tooltip">
                                치안은 구 기준으로 집계되었습니다.
                              </span>
                            </span>
                          )}
                        </div>
                        <CircleScore score={s} size={80} stroke={8} color={gc} />
                        <div className="dp-score-card__grade-row">
                          <div
                            className="dp-score-card__grade"
                            style={{ color: gc }}
                          >
                            {gl}
                          </div>
                          {trend && (
                            <div
                              className={`dp-score-card__trend dp-score-card__trend--${trend}`}
                            >
                              {trend === "up"
                                ? "▲"
                                : trend === "down"
                                  ? "▼"
                                  : "━"}
                              {delta != null && cat.key !== "safety" && (
                                <span>{Math.abs(delta)}점</span>
                              )}
                            </div>
                          )}
                        </div>
                        {cat.key === "expenses" &&
                          nextExpensesScore != null && (
                            <div className="dp-score-card__next-pred">
                              <span className="dp-score-card__next-label">
                                다음달 예측
                              </span>
                              <span
                                className="dp-score-card__next-score"
                                style={{
                                  color: getGradeInfo(nextExpensesScore).color,
                                }}
                              >
                                {nextExpensesScore}점
                              </span>
                            </div>
                          )}
                        {cat.key === "hvac" &&
                          nextHvacScore != null && (
                            <div className="dp-score-card__next-pred">
                              <span className="dp-score-card__next-label">
                                다음달 예측
                              </span>
                              <span
                                className="dp-score-card__next-score"
                                style={{
                                  color: getGradeInfo(nextHvacScore).color,
                                }}
                              >
                                {nextHvacScore}점
                              </span>
                            </div>
                          )}
                        <button
                          className="dp-score-card__detail-btn"
                          onClick={() => openLayerModal(cat)}
                        >
                          상세 지표
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* 차트 */}
                <div className="dp-charts">
                  <div className="dp-chart-card">
                    <div className="dp-chart-card__title">
                      월별 종합 점수 추이
                    </div>
                    <div className="dp-chart-legend">
                      <span className="dp-chart-legend__dot" style={{ background: "#00B493" }} />
                      <span className="dp-chart-legend__label">{dong}</span>
                      {seoulAvgScores && (
                        <>
                          <span className="dp-chart-legend__dot dp-chart-legend__dot--dashed" style={{ background: "#818CF8" }} />
                          <span className="dp-chart-legend__label">서울 평균</span>
                        </>
                      )}
                    </div>
                    {monthScores?.length > 1 ? (
                      <LineChart
                        scores={monthScores}
                        year={year}
                        month={month}
                        seoulAvgScores={seoulAvgScores}
                      />
                    ) : (
                      <div className="dp-chart-empty">데이터 준비 중입니다</div>
                    )}
                  </div>
                  <div className="dp-chart-card dp-chart-card--ai">
                    <div className="dp-chart-card__title">AI 분석 결과</div>
                    <div className="dp-ai-cta">
                      <p className="dp-ai-cta__desc">
                        AI가 이 동네의 생활환경을 종합적으로 분석해 드립니다.
                      </p>
                      <button className="dp-ai-btn" onClick={openAiModal}>
                        <LuBot size={18} />
                        분석 시작
                      </button>
                    </div>
                  </div>
                </div>

                {/* 지표 설명 */}
                <div className="dp-descs">
                  <div className="dp-desc-card">
                    <span className="dp-desc-card__icon">
                      <LuLayoutDashboard size={24} color="#6366f1" />
                    </span>
                    <div>
                      <div className="dp-desc-card__label">종합지수</div>
                      <div className="dp-desc-card__text">
                        쾌적도·건강·에너지 효율·치안·도시 활력도 5개 지표를 종합하여 산출한 주거 환경 점수입니다.
                      </div>
                    </div>
                  </div>
                  {CATEGORIES.map((cat) => (
                    <div key={cat.key} className="dp-desc-card">
                      <span className="dp-desc-card__icon">{cat.icon}</span>
                      <div>
                        <div className="dp-desc-card__label">{cat.label}</div>
                        <div className="dp-desc-card__text">
                          {CATEGORY_DESC[cat.key]}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )
          ) : (
            /* ── 지표 비교 탭 ── */
            <div className="cmp-view">
              {/* 동 선택 */}
              <div className="cmp-selector">
                <div className="cmp-selector__current">
                  <span className="cmp-selector__tag cmp-selector__tag--a">
                    현재
                  </span>
                  <span className="cmp-selector__name">{dong}</span>
                  <span className="cmp-selector__gu">{gu}</span>
                </div>
                <span className="cmp-selector__vs">VS</span>
                <div className="cmp-selector__picks">
                  <SidebarSelect
                    value={cmpGrade}
                    onChange={(val) => {
                      setCmpGrade(val);
                      setCmpDong("");
                    }}
                    options={[
                      { value: "", label: "전체 등급" },
                      { value: "1", label: "1등급 — 매우 우수" },
                      { value: "2", label: "2등급 — 우수" },
                      { value: "3", label: "3등급 — 보통" },
                      { value: "4", label: "4등급 — 미흡" },
                      { value: "5", label: "5등급 — 불량" },
                    ]}
                    placeholder="등급 선택"
                  />
                  <SidebarSelect
                    value={cmpGu}
                    onChange={(val) => {
                      setCmpGu(val);
                      setCmpDong("");
                    }}
                    options={guList}
                    placeholder="구 선택"
                  />
                  <SidebarSelect
                    value={cmpDong}
                    onChange={setCmpDong}
                    options={cmpDongOptions}
                    placeholder="동 선택"
                    disabled={!cmpGu}
                  />
                </div>
              </div>

              {cmpItem && !catScores ? (
                <div className="cmp-empty">
                  <span className="cmp-empty__text">데이터가 없습니다</span>
                </div>
              ) : cmpItem && cmpLoading ? (
                <div className="cmp-empty">
                  <span className="cmp-empty__text">
                    데이터를 불러오는 중...
                  </span>
                </div>
              ) : cmpItem && !cmpCatScores ? (
                <div className="cmp-empty">
                  <span className="cmp-empty__text">데이터가 없습니다</span>
                </div>
              ) : cmpItem ? (
                <>
                  <div className="cmp-body">
                    {/* 버터플라이 차트 */}
                    <div className="cmp-bars">
                      <div className="cmp-cols-header">
                        <span className="cmp-cols-header__a">{dong}</span>
                        <span className="cmp-cols-header__mid">지표</span>
                        <span className="cmp-cols-header__b">{cmpDong}</span>
                      </div>
                      <CompareBar
                        label="종합"
                        icon={<LuLayoutDashboard size={24} color="#6366f1" />}
                        scoreA={effectiveScore}
                        scoreB={cmpOverviewData?.score ?? cmpItem.score}
                      />
                      <div className="cmp-divider" />
                      {CATEGORIES.map((cat, i) => (
                        <CompareBar
                          key={cat.key}
                          label={cat.label}
                          icon={cat.icon}
                          scoreA={catScores[i]}
                          scoreB={cmpCatScores[i]}
                        />
                      ))}
                    </div>

                    {/* 레이더 비교 */}
                    <div className="cmp-radar">
                      <div className="cmp-radar__legend">
                        <span
                          className="cmp-radar__dot"
                          style={{ background: "#00B493" }}
                        />
                        <span className="cmp-radar__name">{dong}</span>
                        <span
                          className="cmp-radar__dot"
                          style={{ background: "#818CF8" }}
                        />
                        <span className="cmp-radar__name">{cmpDong}</span>
                      </div>
                      <CompareRadar
                        scoresA={catScores}
                        scoresB={cmpCatScores}
                      />
                    </div>
                  </div>

                  {/* 추이 비교 차트 */}
                  {monthScores?.length > 1 ? (
                    <CompareTrendChart
                      trendA={trendA}
                      trendB={trendB}
                      nameA={dong}
                      nameB={cmpDong}
                    />
                  ) : (
                    <div className="dp-chart-empty">데이터 준비 중입니다</div>
                  )}
                </>
              ) : (
                <div className="cmp-empty">
                  <span className="cmp-empty__icon">
                    <LuSearch size={24} />
                  </span>
                  <span className="cmp-empty__text">
                    비교할 동을 선택해주세요
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
        {/* dp-main-content */}
      </div>
      {/* dp-main */}

      {/* ── AI 분석 모달 ── */}
      {aiModal && (
        <div
          className={`layer-modal-overlay${aiModalClosing ? " layer-modal-overlay--closing" : ""}`}
          onClick={closeAiModal}
        >
          <div
            className={`layer-modal layer-modal--ai${aiModalClosing ? " layer-modal--closing" : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="layer-modal__header">
              <span className="layer-modal__icon">
                <LuBot size={18} color="#00B493" />
              </span>
              <span className="layer-modal__title">
                {dong} · AI 분석 결과
              </span>
              <button className="layer-modal__close" onClick={closeAiModal}>
                ✕
              </button>
            </div>
            {aiModal.loading ? (
              <div className="layer-modal__empty ai-modal__loading">
                <span className="ai-modal__spinner" />
                AI가 분석 중입니다...
              </div>
            ) : aiModal.error ? (
              <div className="layer-modal__empty">
                분석 결과를 불러오지 못했습니다.
              </div>
            ) : (
              <div className="layer-modal__body">
                {aiModal.sections.map(({ title, content }) => (
                  <div key={title} className="ai-modal__section">
                    <div className="ai-modal__section-title">{title}</div>
                    <p className="ai-modal__content">{content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 레이어 상세 모달 ── */}
      {layerModal && (
        <div
          className={`layer-modal-overlay${modalClosing ? " layer-modal-overlay--closing" : ""}`}
          onClick={closeLayerModal}
        >
          <div
            className={`layer-modal${modalClosing ? " layer-modal--closing" : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="layer-modal__header">
              <span className="layer-modal__icon">{layerModal.cat.icon}</span>
              <span className="layer-modal__title">
                {dong} · {layerModal.cat.label} 상세 지표
              </span>
              <button className="layer-modal__close" onClick={closeLayerModal}>
                ✕
              </button>
            </div>

            {layerModal.loading ? (
              <div className="layer-modal__empty">데이터를 불러오는 중...</div>
            ) : !layerModal.trend ? (
              <div className="layer-modal__empty">데이터가 없습니다</div>
            ) : (
              <div className="layer-modal__body">
                <div className="layer-modal__score-row">
                  <CircleScore score={layerModal.score} size={80} stroke={8} color={layerModal.grade ? gradeToInfo(layerModal.grade).color : undefined} />
                  <div className="layer-modal__score-info">
                    <div className="layer-modal__score-period">
                      {year}년 {month}월 기준
                    </div>
                    <div
                      className="layer-modal__score-grade"
                      style={{ color: (layerModal.grade ? gradeToInfo(layerModal.grade) : getGradeInfo(layerModal.score)).color }}
                    >
                      {(layerModal.grade ? gradeToInfo(layerModal.grade) : getGradeInfo(layerModal.score)).label}
                    </div>
                  </div>
                </div>
                <div className="layer-modal__chart-title">
                  {layerModal.cat.key === "safety"
                    ? "연도별 점수 추이 (2017~2024)"
                    : "전년도 1월부터 점수 추이"}
                </div>
                <LayerTrendChart
                  trend={layerModal.trend}
                  yearOnly={layerModal.yearOnly ?? false}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
