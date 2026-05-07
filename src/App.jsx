import { useState, useMemo } from "react";
import NaverMap from "./NaverMap.jsx";
import FilterSelect from "./FilterSelect.jsx";
import DongList from "./DongList.jsx";
import DongInfoCard from "./DongInfoCard.jsx";
import DetailPage from "./DetailPage.jsx";
import seoulAdmdongGeoJSON from "./seoul-admdong.json";

const YEARS = [2025, 2026];
const MONTHS_BY_YEAR = {
  2025: [1,2,3,4,5,6,7,8,9,10,11,12],
  2026: [1,2,3,4],
};

const now = new Date();
const CURRENT_YEAR = now.getFullYear();
const CURRENT_MONTH = now.getMonth() + 1;

const dongData = (() => {
  const data = {};
  seoulAdmdongGeoJSON.features.forEach((f) => {
    const score = Math.floor(Math.random() * 101);
    const grade =
      score >= 80 ? 1 : score >= 60 ? 2 : score >= 40 ? 3 : score >= 20 ? 4 : 5;
    data[f.properties.adm_cd] = { score, grade };
  });
  return data;
})();

const gradeData = Object.fromEntries(
  Object.entries(dongData).map(([k, v]) => [k, v.grade]),
);

export default function App() {
  const [year, setYear] = useState(String(CURRENT_YEAR));
  const [month, setMonth] = useState(String(CURRENT_MONTH));
  const [selectedGu, setSelectedGu] = useState("");
  const [selectedDong, setSelectedDong] = useState("");
  const [detailTarget, setDetailTarget] = useState(null); // { gu, dong, adm_cd, score, grade }

  const guList = useMemo(() => {
    const gus = [
      ...new Set(seoulAdmdongGeoJSON.features.map((f) => f.properties.sggnm)),
    ];
    return gus.sort().map((g) => ({ value: g, label: g }));
  }, []);

  const dongList = useMemo(() => {
    if (!selectedGu) return [];
    return seoulAdmdongGeoJSON.features
      .filter((f) => f.properties.sggnm === selectedGu)
      .map((f) => {
        const parts = f.properties.adm_nm.split(" ");
        return parts[parts.length - 1];
      })
      .sort()
      .map((d) => ({ value: d, label: d }));
  }, [selectedGu]);

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
        return {
          adm_cd,
          sggnm: f.properties.sggnm,
          dongName: parts[parts.length - 1],
          grade: dongData[adm_cd]?.grade ?? 3,
          score: dongData[adm_cd]?.score ?? 0,
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [selectedGu]);

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
    const d = dongData[adm_cd];
    return { adm_cd, score: d?.score ?? 0, grade: d?.grade ?? 3 };
  }, [selectedGu, selectedDong]);

  const openDetail = () => {
    if (!selectedDongData) return;
    setDetailTarget({
      gu: selectedGu,
      dong: selectedDong,
      ...selectedDongData,
    });
  };

  // 상세 페이지 표시 중
  if (detailTarget) {
    return (
      <div className="app-shell">
        <DetailPage
          {...detailTarget}
          year={year}
          month={month}
          onBack={() => setDetailTarget(null)}
        />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="top-search-bar">
        <div className="top-search-bar__logo">SeoulMate</div>
        <div className="top-search-bar__filters">
          <FilterSelect
            value={year}
            onChange={(e) => {
                 const nextYear = e.target.value;
                 setYear(nextYear);

                 if (Number(nextYear) === 2026 && Number(month) > 4) {
                       setMonth("1");
                  }
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
            gradeData={gradeData}
            onDongClick={handleDongSelect}
          />
          {selectedDongData && (
            <DongInfoCard
              gu={selectedGu}
              dong={selectedDong}
              score={selectedDongData.score}
              grade={selectedDongData.grade}
              onDetail={openDetail}
              onClose={() => handleDongSelect(selectedGu, selectedDong)}
            />
          )}
        </div>
      </main>
    </div>
  );
}
