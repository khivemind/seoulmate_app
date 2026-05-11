import { useState, useMemo } from "react";
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
  { value: "security", label: "치안" },
  { value: "comfort", label: "쾌적도" },
  { value: "health", label: "건강 위험도" },
  { value: "noise", label: "소음 스트레스" },
  { value: "hvac", label: "냉난방 수요" },
  { value: "cost", label: "생활비" },
];

const seededRand = (seed, offset = 0) => {
  const x = Math.sin(seed * 9301 + offset * 49297 + 233) * 10000;
  return x - Math.floor(x);
};

// 레이어별 행정동 점수/등급 (시드 고정 → 새로고침해도 동일)
const layerDongData = (() => {
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
})();

export default function App() {
  const [year, setYear] = useState(String(CURRENT_YEAR));
  const [month, setMonth] = useState(String(CURRENT_MONTH));
  const [selectedGu, setSelectedGu] = useState("");
  const [selectedDong, setSelectedDong] = useState("");
  const [selectedLayer, setSelectedLayer] = useState("overall");
  const [detailTarget, setDetailTarget] = useState(null);

  const guList = useMemo(() => {
    const gus = [
      ...new Set(seoulAdmdongGeoJSON.features.map((f) => f.properties.sggnm)),
    ];
    return gus.sort().map((g) => ({ value: g, label: g }));
  }, []);

  const activeGradeData = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(layerDongData[selectedLayer]).map(([k, v]) => [
          k,
          v.grade,
        ]),
      ),
    [selectedLayer],
  );
  const allDongItems = useMemo(() => {
    return seoulAdmdongGeoJSON.features
      .map((f) => {
        const parts = f.properties.adm_nm.split(" ");
        const adm_cd = f.properties.adm_cd;
        const d = layerDongData[selectedLayer][adm_cd];

        return {
          adm_cd,
          sggnm: f.properties.sggnm,
          dongName: parts[parts.length - 1],
          grade: d?.grade ?? 3,
          score: d?.score ?? 0,
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [selectedLayer]);
  const sortedDongItems = useMemo(() => {
    const features = selectedGu
      ? seoulAdmdongGeoJSON.features.filter(
          (f) => f.properties.sggnm === selectedGu,
        )
      : seoulAdmdongGeoJSON.features;

    return features
      .map((f) => {
        const parts = f.properties.adm_nm.split(" ");
        const adm_cd = f.properties.adm_cd;
        const d = layerDongData[selectedLayer][adm_cd];
        return {
          adm_cd,
          sggnm: f.properties.sggnm,
          dongName: parts[parts.length - 1],
          grade: d?.grade ?? 3,
          score: d?.score ?? 0,
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [selectedGu, selectedLayer]);

  const handleGuChange = (e) => {
    setSelectedGu(e.target.value);
    setSelectedDong("");
  };

  const handleDongSelect = (gu, dong) => {
    const isSame = selectedGu === gu && selectedDong === dong;
    setSelectedGu(isSame ? "" : gu);
    setSelectedDong(isSame ? "" : dong);
  };

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
    const d = layerDongData[selectedLayer][adm_cd];
    return { adm_cd, score: d?.score ?? 0, grade: d?.grade ?? 3 };
  }, [selectedGu, selectedDong, selectedLayer]);

  const openDetail = () => {
    if (!selectedDongData) return;
    // 상세 페이지는 항상 종합 지수 기준
    const overallD = layerDongData["overall"][selectedDongData.adm_cd];
    setDetailTarget({
      gu: selectedGu,
      dong: selectedDong,
      adm_cd: selectedDongData.adm_cd,
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
