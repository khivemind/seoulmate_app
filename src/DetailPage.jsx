import { useState, useMemo, useRef, useEffect } from "react";
import SidebarSelect from "./SidebarSelect.jsx";
import NaverMap from "./NaverMap.jsx";
import {
  LuLayoutDashboard,
  LuLeaf,
  LuActivity,
  LuBrain,
  LuThermometerSnowflake,
  LuShieldCheck,
  LuWallet,
  LuAudioLines,
  LuSearch,
  LuInfo,
} from "react-icons/lu";

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
    key: "stress",
    label: "소음",
    icon: <LuAudioLines size={24} color="#f97316" />,
    color: "#F97316",
  },
  {
    key: "hvac",
    label: "냉난방",
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
    label: "생활비용",
    icon: <LuWallet size={24} color="#8b5cf6" />,
    color: "#EAB308",
  },
];

const CATEGORY_DESC = {
  comfort:
    "대기 환경, 소음 수준, 온 ·습도 등을 종합하여 주거 쾌적도를 평가합니다.",
  health: "의료 접근성, 운동 시설, 식품 환경 등 건강 관련 지표를 평가합니다.",
  stress: "교통 혼잡, 소음, 인구 밀도 등 스트레스 유발 요인을 평가합니다.",
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
  if (score >= 90) return { label: "매우 우수", color: "#059669" };
  if (score >= 80) return { label: "우수", color: "#3B82F6" };
  if (score >= 70) return { label: "양호", color: "#7C3AED" };
  if (score >= 60) return { label: "보통", color: "#F59E0B" };
  if (score >= 50) return { label: "미흡", color: "#F97316" };
  return { label: "불량", color: "#EF4444" };
};

const genCategoryScores = (base, adm_cd) => {
  const seed = parseInt(adm_cd, 10) || 1;
  return CATEGORIES.map((_, i) => {
    const noise = (seededRand(seed, i) - 0.5) * 30;
    return Math.min(100, Math.max(0, Math.round(base + noise)));
  });
};

const genMonthlyScores = (base, adm_cd, year) => {
  const seed = (parseInt(adm_cd, 10) || 1) + Number(year);
  return Array.from({ length: 12 }, (_, i) => {
    const noise = (seededRand(seed, i + 20) - 0.5) * 20;
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
function CircleScore({ score, size = 100, stroke = 10 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const { color } = getGradeInfo(score);
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
function LineChart({ scores, currentMonth }) {
  const PAD = { t: 24, b: 28, l: 28, r: 10 };
  const W = 360,
    H = 160;
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const n = scores.length;
  const minV = Math.min(...scores) - 8;
  const maxV = Math.max(...scores) + 8;

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
        const cur = i + 1 === Number(currentMonth);
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
              {i + 1}월
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── 레이더 차트 ──────────────────────────── */
function RadarChart({ scores }) {
  const SIZE = 220,
    center = SIZE / 2,
    maxR = center - 38,
    n = scores.length;
  const ang = (i) => (i / n) * 2 * Math.PI - Math.PI / 2;
  const pt = (i, r) => [
    center + r * Math.cos(ang(i)),
    center + r * Math.sin(ang(i)),
  ];

  const dataPts = scores.map((s, i) => pt(i, (s / 100) * maxR));
  const poly = dataPts.map(([x, y]) => `${x},${y}`).join(" ");

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
        points={poly}
        fill="#00B493"
        fillOpacity="0.2"
        stroke="#00B493"
        strokeWidth="2"
      />
      {dataPts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="4" fill="#00B493" />
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
      {dataPts.map(([x, y], i) => (
        <text
          key={i}
          x={x}
          y={y - 9}
          textAnchor="middle"
          fontSize="10"
          fill="#00B493"
          fontWeight="700"
        >
          {scores[i]}
        </text>
      ))}
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
  const PAD = { t: 28, b: 32, l: 32, r: 16 };
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
        <circle
          cx={px(n - 1)}
          cy={py(trendA[n - 1].score)}
          r="3.5"
          fill="#00B493"
        />
        <circle
          cx={px(n - 1)}
          cy={py(trendB[n - 1].score)}
          r="3.5"
          fill="#818CF8"
        />
      </svg>
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
  grade,
  year,
  month,
  guDongItems,
  guList = [],
  selectedGu,
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
  const mainRef = useRef(null);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [dong]);

  useEffect(() => {
    if (!adm_cd2) return;
    setOverviewData(null);
    const base = import.meta.env.VITE_API_BASE ?? "";
    fetch(`${base}/v1/overview/${adm_cd2}?year=${year}`, {
      headers: { "x-api-key": "default-dev-key" },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.status === 200) setOverviewData(data); })
      .catch(() => {});
  }, [adm_cd2, year]);

  const cmpDongOptions = useMemo(
    () =>
      !cmpGu
        ? []
        : (guDongItems ?? [])
            .filter(
              (item) =>
                item.sggnm === cmpGu &&
                (!cmpGrade || String(item.grade) === cmpGrade),
            )
            .map((item) => ({ value: item.dongName, label: item.dongName })),
    [cmpGu, cmpGrade, guDongItems],
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
  const cmpCatScores = useMemo(
    () => (cmpItem ? genCategoryScores(cmpItem.score, cmpItem.adm_cd) : null),
    [cmpItem],
  );
  const trendA = useMemo(
    () => genTrendScores(effectiveScore, adm_cd, Number(year) - 1, Number(month)),
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

  const effectiveScore = overviewData?.average_score ?? score;

  const catScores = useMemo(() => {
    if (overviewData) {
      return CATEGORIES.map((cat) => overviewData[cat.key] ?? 0);
    }
    return genCategoryScores(score, adm_cd);
  }, [overviewData, score, adm_cd]);

  const monthScores = useMemo(
    () => genMonthlyScores(effectiveScore, adm_cd, year),
    [effectiveScore, adm_cd, year],
  );

  const prevScore = monthScores[Number(month) - 2] ?? effectiveScore;
  const mockDelta = monthScores[Number(month) - 1] - prevScore;
  const delta = overviewData?.recent_trend ?? mockDelta;

  const { label: gradeLabel, color: gradeColor } = getGradeInfo(effectiveScore);
  const secInfo = getGradeInfo(catScores[4]);
  const secSeed = parseInt(adm_cd, 10) || 1;
  const secDelta = Math.round((seededRand(secSeed, 99) - 0.3) * 16);
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
            <CircleScore score={effectiveScore} size={90} stroke={9} />
            <div className="dp-sb-score__grade" style={{ color: gradeColor }}>
              {gradeLabel}
            </div>
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
          <div className="dp-sb-title">동별 쾌적도 요약</div>
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
            <>
              {/* 점수 카드 */}
              <div className="dp-scores">
                {CATEGORIES.map((cat, i) => {
                  const s = catScores[i];
                  const seed = parseInt(adm_cd, 10) || 1;
                  const d = Math.round((seededRand(seed, i + 60) - 0.4) * 14);
                  const { label: gl, color: gc } = getGradeInfo(s);
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
                      <CircleScore score={s} size={80} stroke={8} />
                      <div
                        className="dp-score-card__grade"
                        style={{ color: gc }}
                      >
                        {gl}
                      </div>
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
                  <LineChart scores={monthScores} currentMonth={month} />
                </div>
                <div className="dp-chart-card">
                  <div className="dp-chart-card__title">지표별 점수 분포</div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      paddingTop: 4,
                    }}
                  >
                    <RadarChart scores={catScores} />
                  </div>
                </div>
              </div>

              {/* 지표 설명 */}
              <div className="dp-descs">
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

              {cmpItem ? (
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
                        scoreB={cmpItem.score}
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
                  <CompareTrendChart
                    trendA={trendA}
                    trendB={trendB}
                    nameA={dong}
                    nameB={cmpDong}
                  />
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
    </div>
  );
}
