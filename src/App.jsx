import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import NaverMap from "./NaverMap.jsx";
import FilterSelect from "./FilterSelect.jsx";
import DongList from "./DongList.jsx";
import DongInfoCard from "./DongInfoCard.jsx";
import DetailPage from "./DetailPage.jsx";
import seoulAdmdongGeoJSON from "./seoul-admdong.json";

const YEARS = [2025, 2026];
const MONTHS_BY_YEAR = {
  2025: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  2026: [1, 2, 3, 4],
};

const now = new Date();
const CURRENT_YEAR = now.getFullYear();
const CURRENT_MONTH = now.getMonth() + 1;

export const LAYERS = [
  { value: "overall", label: "종합 지수" },
  { value: "safety", label: "치안" },
  { value: "comfort", label: "쾌적도" },
  { value: "health", label: "건강 위험도" },
  { value: "stress", label: "소음 스트레스" },
  { value: "hvac", label: "냉난방 수요" },
  { value: "expenses", label: "생활비" },
];
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

// hvac 레이어는 code가 adm_cd 직접 사용 — 유효성 검증용 Set
const validAdmCds = new Set(seoulAdmdongGeoJSON.features.map((f) => f.properties.adm_cd));

const seededRand = (seed, offset = 0) => {
  const x = Math.sin(seed * 9301 + offset * 49297 + 233) * 10000;
  return x - Math.floor(x);
};

function generateMockData() {
  const data = {};
  LAYERS.forEach(({ value: lk }, li) => {
    data[lk] = {};
    seoulAdmdongGeoJSON.features.forEach((f) => {
      const adm_cd = f.properties.adm_cd;
      const seed = parseInt(adm_cd, 10) || 1;
      const score = Math.floor(seededRand(seed, li * 37 + 5) * 101);
      const grade =
        score >= 80
          ? 1
          : score >= 60
            ? 2
            : score >= 40
              ? 3
              : score >= 20
                ? 4
                : 5;
      data[lk][adm_cd] = { score, grade };
    });
  });
  return data;
}

export default function App() {
  const [year, setYear] = useState(String(CURRENT_YEAR));
  const [month, setMonth] = useState(String(CURRENT_MONTH));
  const [selectedGu, setSelectedGu] = useState("");
  const [selectedDong, setSelectedDong] = useState("");
  const [selectedLayer, setSelectedLayer] = useState("overall");
  const [detailTarget, setDetailTarget] = useState(null);

  const [layerDongData, setLayerDongData] = useState(generateMockData);

  useEffect(() => {
    setLayerDongData(generateMockData());
    // TODO: API 연동 시 아래로 교체 (import에 useRef, useCallback 추가 필요)
    // setLayerDongData({});
    // fetchedRef.current = new Set();
    // fetchLayer("overall", year, month);
    // if (selectedLayer !== "overall") fetchLayer(selectedLayer, year, month);
  }, [year, month]);

  // TODO: API 연동 시 주석 해제 — 레이어 전환 시 미로드 레이어 fetch
  useEffect(() => {
    fetchLayer(selectedLayer, year, month);
  }, [selectedLayer]);

  //TODO: API 연동 시 추가 (useRef, useCallback import 필요)
  const fetchedRef = useRef(new Set());
  const fetchLayer = useCallback(async (layer, yr, mo) => {
    const cacheKey = `${layer}-${yr}-${mo}`;
    if (fetchedRef.current.has(cacheKey)) return;
    fetchedRef.current.add(cacheKey);
    try {
      const base = import.meta.env.VITE_API_BASE ?? "";
      const res = await fetch(
        `${base}/v1/heatmap?layer=${layer}&year=${yr}&month=${mo}`,
        { headers: { "x-api-key": "default-dev-key" } },
      );
      if (res.status === 404) return; // 해당 기간 데이터 없음 — 조용히 종료
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // API 응답: { status, dong_list: [{ code, dong, gu, grade, score }, ...] }
      const { status, dong_list } = await res.json();
      if (status !== 200) throw new Error(`API status ${status}`);
      const byAdmCd = Object.fromEntries(
        dong_list
          .map(({ code, score, grade }) => {
            const key = String(code);
            const adm_cd = layer === "hvac"
              ? (validAdmCds.has(key) ? key : null)
              : admCd2ToAdmCd[key];
            return adm_cd ? [adm_cd, { score, grade }] : null;
          })
          .filter(Boolean),
      );
      console.log(`[heatmap] ${layer} ${yr}-${mo}: API ${dong_list.length}개 → 매핑 ${Object.keys(byAdmCd).length}개`);
      const noData = seoulAdmdongGeoJSON.features
        .filter((f) => !byAdmCd[f.properties.adm_cd])
        .map((f) => f.properties.adm_nm);
      if (noData.length) console.log(`[heatmap] 데이터 없음 동 (${noData.length}개):`, noData);
      setLayerDongData((prev) => ({ ...prev, [layer]: byAdmCd }));
    } catch (e) {
      console.error(`[heatmap] ${layer}:`, e);
    }
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
          sggnm: f.properties.sggnm,
          dongName: parts[parts.length - 1],
          grade: d?.grade ?? (overallData ? 0 : 3),
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
          grade: d?.grade ?? (layerData ? 0 : 3),
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
    return { adm_cd, score: d?.score ?? null, grade: d?.grade ?? (layerData ? 0 : 3) };
  }, [selectedGu, selectedDong, selectedLayer, layerDongData]);

  const openDetail = () => {
    if (!selectedDongData) return;
    // 상세 페이지는 항상 종합 지수 기준
    const overallD = layerDongData["overall"][selectedDongData.adm_cd];
    setDetailTarget({
      gu: selectedGu,
      dong: selectedDong,
      adm_cd: selectedDongData.adm_cd,
      adm_cd2: admCdToAdmCd2[selectedDongData.adm_cd],
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
    const d = layerDongData["overall"][adm_cd];
    setDetailTarget({
      gu: detailTarget.gu,
      dong: dongName,
      adm_cd,
      adm_cd2: admCdToAdmCd2[adm_cd],
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
            const d = layerDongData["overall"][adm_cd];

            setDetailTarget({
              gu,
              dong: dongName,
              adm_cd,
              adm_cd2: admCdToAdmCd2[adm_cd],
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
        <div className="top-search-bar__logo">SeoulMate</div>
        <div className="top-search-bar__subtitle">동네 추천 서비스</div>
        <div className="top-search-bar__filters">
          <FilterSelect
            value={year}
            onChange={(e) => {
              const nextYear = e.target.value;
              setYear(nextYear);
              if (Number(nextYear) === 2026 && Number(month) > 4) setMonth("1");
            }}
            options={YEARS.map((y) => ({
              value: String(y),
              label: `${y}년`,
              disabled: y > CURRENT_YEAR,
            }))}
            placeholder="연도 선택"
          />
          <FilterSelect
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            options={MONTHS_BY_YEAR[Number(year)].map((m) => ({
              value: String(m),
              label: `${m}월`,
            }))}
            placeholder="월 선택"
          />
          <FilterSelect
            value={selectedGu}
            onChange={handleGuChange}
            options={guList}
            placeholder="자치구 선택"
          />
          <FilterSelect
            value={selectedLayer}
            onChange={(e) => setSelectedLayer(e.target.value)}
            options={LAYERS}
            placeholder="레이어 선택"
            showEmpty={false}
            className="fsel--layer"
          />
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
        </div>
      </main>
    </div>
  );
}
