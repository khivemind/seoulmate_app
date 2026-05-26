import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import NaverMap from "./NaverMap.jsx";
import FilterSelect from "./FilterSelect.jsx";
import DongList from "./DongList.jsx";
import DongInfoCard from "./DongInfoCard.jsx";
import DetailPage from "./DetailPage.jsx";
import ChatPanel from "./ChatPanel.jsx";
import seoulAdmdongGeoJSON from "./seoul-admdong.json";
import logoUrl from "./assets/logo.png";

const now = new Date();
const CURRENT_YEAR = now.getFullYear();
const CURRENT_MONTH = now.getMonth() + 1;
const PREV_MONTH = CURRENT_MONTH === 1 ? 12 : CURRENT_MONTH - 1;
const PREV_MONTH_YEAR = CURRENT_MONTH === 1 ? CURRENT_YEAR - 1 : CURRENT_YEAR;

const YEARS = [2025, 2026];
const MONTHS_BY_YEAR = Object.fromEntries(
  YEARS.map((y) => [
    y,
    Array.from(
      {
        length:
          y < PREV_MONTH_YEAR ? 12 : y === PREV_MONTH_YEAR ? PREV_MONTH : 0,
      },
      (_, i) => i + 1,
    ),
  ]).filter(([, months]) => months.length > 0),
);
// 도시 활력도는 당월 예측치 포함
const EXPENSES_MONTHS_BY_YEAR = Object.fromEntries(
  YEARS.map((y) => [
    y,
    Array.from(
      {
        length: y < CURRENT_YEAR ? 12 : y === CURRENT_YEAR ? CURRENT_MONTH : 0,
      },
      (_, i) => i + 1,
    ),
  ]).filter(([, months]) => months.length > 0),
);
const SAFETY_YEARS = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];

const BASE_LAYERS = [
  { value: "overall", label: "종합 지수" },
  { value: "safety", label: "치안" },
  { value: "comfort", label: "쾌적도" },
  { value: "health", label: "건강 안전도" },
  { value: "hvac", label: "에너지 효율" },
  { value: "expenses", label: "경제 활력도" },
];
const CUSTOM_LAYER = { value: "custom", label: "맞춤 추천" };
// 서비스별 코드 불일치 보정 (heatmap API code → GeoJSON adm_cd2)
const CODE_ALIASES = {
  1174052500: "1174052000", // 강동구 상일1동
};

// overview API는 GeoJSON adm_cd2가 아닌 별도 코드를 사용하는 동 (GeoJSON adm_cd2 → overview API code)
const OVERVIEW_CODE_ALIASES = {
  1174052000: "1174052500", // 강동구 상일1동
};

// API code(adm_cd2) → GeoJSON adm_cd 변환 테이블
const admCd2ToAdmCd = Object.fromEntries(
  seoulAdmdongGeoJSON.features.map((f) => [
    f.properties.adm_cd2,
    f.properties.adm_cd,
  ]),
);

// GeoJSON adm_cd → adm_cd2 역변환 (overview API 경로용)
const admCdToAdmCd2 = Object.fromEntries(
  seoulAdmdongGeoJSON.features.map((f) => [
    f.properties.adm_cd,
    f.properties.adm_cd2,
  ]),
);

export default function App() {
  const [year, setYear] = useState(String(CURRENT_YEAR));
  const DEFAULT_MONTH = String(
    MONTHS_BY_YEAR[CURRENT_YEAR]?.at(-1) ?? CURRENT_MONTH,
  );
  const [month, setMonth] = useState(DEFAULT_MONTH);
  const [selectedGu, setSelectedGu] = useState("");
  const [selectedDong, setSelectedDong] = useState("");
  const [selectedLayer, setSelectedLayer] = useState("overall");
  const [detailTarget, setDetailTarget] = useState(null);
  const [customLayerData, setCustomLayerData] = useState(null);
  const [filterOpenCount, setFilterOpenCount] = useState(0);
  const handleFilterOpen = useCallback((isOpen) => {
    setFilterOpenCount((c) => c + (isOpen ? 1 : -1));
  }, []);

  const [layerDongData, setLayerDongData] = useState({});
  const [loading, setLoading] = useState(false);
  const pendingRef = useRef(0);

  const fetchedRef = useRef(new Set());
  const fetchLayer = useCallback(async (layer, yr, mo) => {
    const isSafetyLayer = layer === "safety";
    const cacheKey = isSafetyLayer ? `safety-${yr}` : `${layer}-${yr}-${mo}`;
    if (fetchedRef.current.has(cacheKey)) return;
    fetchedRef.current.add(cacheKey);
    pendingRef.current += 1;
    setLoading(true);
    try {
      const base = import.meta.env.VITE_API_BASE ?? "";
      const url = isSafetyLayer
        ? `${base}/v1/heatmap/safety?year=${yr}`
        : `${base}/v1/heatmap?layer=${layer}&year=${yr}&month=${mo}`;
      console.log(`[fetch] heatmap →`, url);
      const res = await fetch(url, {
        headers: { "x-api-key": "v9WzP1xF7K8lQ2mR4sT6uY8aB0cD3eF9GhJkLmNo" },
      });
      if (res.status === 404) return;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { status, dong_list } = await res.json();
      if (status !== 200) throw new Error(`API status ${status}`);
      const byAdmCd = Object.fromEntries(
        dong_list
          .map(({ code, score, grade }) => {
            const key = CODE_ALIASES[String(code)] ?? String(code);
            const adm_cd = admCd2ToAdmCd[key];
            return adm_cd ? [adm_cd, { score, grade }] : null;
          })
          .filter(Boolean),
      );
      const mappedCount = Object.keys(byAdmCd).length;
      console.log(
        `[heatmap] ${layer} ${yr}-${mo}: API ${dong_list.length}개 → 매핑 ${mappedCount}개`,
      );

      const unmapped = dong_list.filter(({ code }) => {
        const key = CODE_ALIASES[String(code)] ?? String(code);
        return !admCd2ToAdmCd[key];
      });
      if (unmapped.length > 0)
        console.warn(
          `[heatmap] ${layer} 매핑 실패 (${unmapped.length}개):`,
          unmapped.map(({ code, dong, gu }) => `${gu} ${dong}(${code})`),
        );

      const noData = seoulAdmdongGeoJSON.features.filter(
        (f) => !byAdmCd[f.properties.adm_cd],
      );
      if (noData.length > 0)
        console.warn(
          `[heatmap] ${layer} 데이터 없는 동 (${noData.length}개):`,
          noData.map((f) => f.properties.adm_nm),
        );

      setLayerDongData((prev) => ({ ...prev, [layer]: byAdmCd }));
    } catch (e) {
      console.error(`[heatmap] ${layer}:`, e);
    } finally {
      pendingRef.current -= 1;
      if (pendingRef.current === 0) setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLayerDongData({});
    fetchedRef.current = new Set();
    fetchLayer("overall", year, month);
    if (selectedLayer !== "overall") fetchLayer(selectedLayer, year, month);
  }, [year, month]);

  useEffect(() => {
    if (selectedLayer !== "custom") fetchLayer(selectedLayer, year, month);
  }, [selectedLayer]);

  const LAYERS = useMemo(
    () => (customLayerData ? [...BASE_LAYERS, CUSTOM_LAYER] : BASE_LAYERS),
    [customLayerData],
  );

  const handleChatResult = useCallback((data) => {
    const byAdmCd = Object.fromEntries(
      (data.dong_list ?? [])
        .map(({ code, score, grade }) => {
          const key = CODE_ALIASES[String(code)] ?? String(code);
          const adm_cd = admCd2ToAdmCd[key];
          return adm_cd ? [adm_cd, { score, grade }] : null;
        })
        .filter(Boolean),
    );
    setCustomLayerData(byAdmCd);
    setLayerDongData((prev) => ({ ...prev, custom: byAdmCd }));
    setSelectedLayer("custom");
  }, []);

  const handleChatReset = useCallback(() => {
    setCustomLayerData(null);
    setLayerDongData((prev) => {
      const next = { ...prev };
      delete next.custom;
      return next;
    });
    setSelectedLayer("overall");
  }, []);

  const guList = useMemo(() => {
    const gus = [
      ...new Set(seoulAdmdongGeoJSON.features.map((f) => f.properties.sggnm)),
    ];
    return gus.sort().map((g) => ({ value: g, label: g }));
  }, []);

  // 지도 폴리곤 색상용 — 로드 전엔 빈 객체, 로드 후 없는 동은 0(데이터 없음)
  const activeGradeData = useMemo(() => {
    const layerData = layerDongData[selectedLayer];
    if (!layerData) return {};
    return Object.fromEntries(
      seoulAdmdongGeoJSON.features.map((f) => [
        f.properties.adm_cd,
        layerData[f.properties.adm_cd]?.grade ?? 0,
      ]),
    );
  }, [selectedLayer, layerDongData]);

  const scoreSort = (a, b) => {
    if (a.score === null && b.score === null) return 0;
    if (a.score === null) return 1;
    if (b.score === null) return -1;
    return b.score - a.score;
  };

  // 상세 페이지 비교 동 목록용 — 항상 종합 지수 기준 등급
  const allDongItems = useMemo(() => {
    const overallData = layerDongData["overall"];
    return seoulAdmdongGeoJSON.features
      .map((f) => {
        const parts = f.properties.adm_nm.split(" ");
        const adm_cd = f.properties.adm_cd;
        const d = overallData?.[adm_cd];
        return {
          adm_cd,
          adm_cd2:
            OVERVIEW_CODE_ALIASES[admCdToAdmCd2[adm_cd]] ??
            admCdToAdmCd2[adm_cd],
          sggnm: f.properties.sggnm,
          dongName: parts[parts.length - 1],
          grade: d?.grade ?? 0,
          score: d?.score ?? null,
        };
      })
      .sort(scoreSort);
  }, [layerDongData]);

  // 메인 화면 동 목록 — 선택 레이어 기준 점수/등급
  const sortedDongItems = useMemo(() => {
    const layerData = layerDongData[selectedLayer];
    const features = selectedGu
      ? seoulAdmdongGeoJSON.features.filter(
          (f) => f.properties.sggnm === selectedGu,
        )
      : seoulAdmdongGeoJSON.features;

    return features
      .map((f) => {
        const parts = f.properties.adm_nm.split(" ");
        const adm_cd = f.properties.adm_cd;
        const d = layerData?.[adm_cd];
        return {
          adm_cd,
          sggnm: f.properties.sggnm,
          dongName: parts[parts.length - 1],
          grade: d?.grade ?? 0,
          score: d?.score ?? null,
        };
      })
      .sort(scoreSort);
  }, [selectedGu, selectedLayer, layerDongData]);

  const handleGuChange = (e) => {
    setSelectedGu(e.target.value);
    setSelectedDong("");
  };

  const handleDongSelect = (gu, dong) => {
    const isSame = selectedGu === gu && selectedDong === dong;
    setSelectedGu(isSame ? "" : gu);
    setSelectedDong(isSame ? "" : dong);
  };

  // 선택 동 정보 — 선택 레이어 기준 (지도·카드 표시용)
  const selectedDongData = useMemo(() => {
    if (!selectedGu || !selectedDong) return null;
    const feature = seoulAdmdongGeoJSON.features.find((f) => {
      const parts = f.properties.adm_nm.split(" ");
      return (
        f.properties.sggnm === selectedGu &&
        parts[parts.length - 1] === selectedDong
      );
    });
    if (!feature) return null;
    const adm_cd = feature.properties.adm_cd;
    const layerData = layerDongData[selectedLayer];
    const d = layerData?.[adm_cd];
    return {
      adm_cd,
      score: d?.score ?? null,
      grade: d?.grade ?? 0,
    };
  }, [selectedGu, selectedDong, selectedLayer, layerDongData]);

  const toOverviewCode = (adm_cd) => {
    const raw = admCdToAdmCd2[adm_cd];
    return OVERVIEW_CODE_ALIASES[raw] ?? raw;
  };

  const openDetail = () => {
    if (!selectedDongData) return;
    // 상세 페이지는 항상 종합 지수 기준
    const overallD = layerDongData["overall"]?.[selectedDongData.adm_cd];
    setDetailTarget({
      gu: selectedGu,
      dong: selectedDong,
      adm_cd: selectedDongData.adm_cd,
      adm_cd2: toOverviewCode(selectedDongData.adm_cd),
      score: overallD?.score ?? 0,
      grade: overallD?.grade ?? 3,
    });
  };

  const handleDetailDongChange = (dongName) => {
    if (!detailTarget) return;
    const feature = seoulAdmdongGeoJSON.features.find((f) => {
      const parts = f.properties.adm_nm.split(" ");
      return (
        f.properties.sggnm === detailTarget.gu &&
        parts[parts.length - 1] === dongName
      );
    });
    if (!feature) return;
    const adm_cd = feature.properties.adm_cd;
    const d = layerDongData["overall"]?.[adm_cd];
    setDetailTarget({
      gu: detailTarget.gu,
      dong: dongName,
      adm_cd,
      adm_cd2: toOverviewCode(adm_cd),
      score: d?.score ?? 0,
      grade: d?.grade ?? 3,
    });
  };

  if (detailTarget) {
    return (
      <div className="app-shell">
        <DetailPage
          {...detailTarget}
          year={year}
          month={month}
          guDongItems={allDongItems}
          layerDongData={layerDongData}
          guList={guList}
          selectedGu={detailTarget.gu}
          gradeData={activeGradeData}
          onGuChange={(gu) => {
            const feature = seoulAdmdongGeoJSON.features.find(
              (f) => f.properties.sggnm === gu,
            );

            if (!feature) return;

            const parts = feature.properties.adm_nm.split(" ");
            const dongName = parts[parts.length - 1];
            const adm_cd = feature.properties.adm_cd;
            const d = layerDongData["overall"]?.[adm_cd];

            setDetailTarget({
              gu,
              dong: dongName,
              adm_cd,
              adm_cd2: toOverviewCode(adm_cd),
              score: d?.score ?? 0,
              grade: d?.grade ?? 3,
            });
          }}
          onDongChange={handleDetailDongChange}
          onBack={() => setDetailTarget(null)}
        />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="top-search-bar">
        <div className="top-search-bar__brand">
          <span className="top-search-bar__logo">
            <img src={logoUrl} alt="SeoulMate" />
          </span>
          <span className="top-search-bar__title">seoul mate</span>
        </div>
        <div className="top-search-bar__subtitle"></div>
        <div className="top-search-bar__filters">
          <div className="filter-field">
            <span className="filter-field__label">연도</span>
            <FilterSelect
              value={year}
              onChange={(e) => {
                const nextYear = e.target.value;
                setYear(nextYear);
                const monthMap =
                  selectedLayer === "expenses"
                    ? EXPENSES_MONTHS_BY_YEAR
                    : MONTHS_BY_YEAR;
                const availableMonths = monthMap[Number(nextYear)] ?? [];
                if (
                  selectedLayer !== "safety" &&
                  !availableMonths.includes(Number(month))
                )
                  setMonth(String(availableMonths.at(-1) ?? 1));
              }}
              options={(selectedLayer === "safety" ? SAFETY_YEARS : YEARS).map(
                (y) => ({
                  value: String(y),
                  label: `${y}년`,
                  disabled: selectedLayer !== "safety" && y > CURRENT_YEAR,
                }),
              )}
              placeholder="연도 선택"
              disabled={selectedLayer === "custom"}
              onOpenChange={handleFilterOpen}
            />
          </div>
          {selectedLayer !== "safety" && (
            <div className="filter-field">
              <span className="filter-field__label">월</span>
              <FilterSelect
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                options={(
                  (selectedLayer === "expenses"
                    ? EXPENSES_MONTHS_BY_YEAR
                    : MONTHS_BY_YEAR)[Number(year)] ?? []
                ).map((m) => ({
                  value: String(m),
                  label: `${m}월${m === CURRENT_MONTH && selectedLayer === "expenses" ? " (예측)" : ""}`,
                }))}
                placeholder="월 선택"
                disabled={selectedLayer === "custom"}
                onOpenChange={handleFilterOpen}
              />
            </div>
          )}
          <div className="filter-field">
            <span className="filter-field__label">자치구</span>
            <FilterSelect
              value={selectedGu}
              onChange={handleGuChange}
              options={guList}
              placeholder="자치구 선택"
              onOpenChange={handleFilterOpen}
            />
          </div>
          <div className="filter-field">
            <span className="filter-field__label">지표</span>
            <FilterSelect
              value={selectedLayer}
              onChange={(e) => {
                const nextLayer = e.target.value;
                setSelectedLayer(nextLayer);
                if (nextLayer === "safety") {
                  setYear("2024");
                } else if (selectedLayer === "safety" && nextLayer !== "custom") {
                  setYear(String(CURRENT_YEAR));
                  setMonth(DEFAULT_MONTH);
                } else if (
                  nextLayer !== "expenses" &&
                  Number(month) === CURRENT_MONTH
                ) {
                  // expenses → 다른 레이어: 이번 달 예측치는 다른 레이어에 없으므로 전월로 복원
                  setMonth(String(PREV_MONTH));
                }
              }}
              options={LAYERS}
              placeholder="레이어 선택"
              showEmpty={false}
              className="fsel--layer"
              onOpenChange={handleFilterOpen}
            />
          </div>
        </div>
      </header>
      <main className="page-content">
        <DongList
          items={sortedDongItems}
          selectedGu={selectedGu}
          selectedDong={selectedDong}
          onSelect={handleDongSelect}
        />
        <div className="map-wrapper">
          <NaverMap
            selectedGu={selectedGu}
            selectedDong={selectedDong}
            gradeData={activeGradeData}
            onDongClick={handleDongSelect}
          />
          {loading && (
            <div className="map-loading">
              <span className="map-loading__text">데이터를 불러오는 중...</span>
            </div>
          )}
          {selectedDongData && (
            <DongInfoCard
              gu={selectedGu}
              dong={selectedDong}
              score={selectedDongData.score}
              grade={selectedDongData.grade}
              layerLabel={LAYERS.find((l) => l.value === selectedLayer)?.label}
              onDetail={openDetail}
              onClose={() => handleDongSelect(selectedGu, selectedDong)}
            />
          )}
          <ChatPanel
            year={year}
            month={month}
            onResult={handleChatResult}
            onReset={handleChatReset}
            filterOpen={filterOpenCount > 0}
          />
        </div>
      </main>
    </div>
  );
}
