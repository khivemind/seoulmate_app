import { useEffect, useRef } from "react";
import seoulAdmdongGeoJSON from "./seoul-admdong.json";

export const GRADE_COLORS = {
  1: "#22C55E",
  2: "#84CC16",
  3: "#EAB308",
  4: "#F97316",
  5: "#EF4444",
};

const GRADE_MAP_COLORS = {
  1: "#86EFAC",
  2: "#BEF264",
  3: "#FDE047",
  4: "#FDBA74",
  5: "#FCA5A5",
};

export const GRADE_LABELS = {
  1: "1등급",
  2: "2등급",
  3: "3등급",
  4: "4등급",
  5: "5등급",
};

const getDongCentroid = (feature) => {
  const geometry = feature.geometry;
  let coords;
  if (geometry.type === "Polygon") coords = geometry.coordinates[0];
  else if (geometry.type === "MultiPolygon") coords = geometry.coordinates[0][0];
  if (!coords) return null;
  let lat = 0, lng = 0;
  coords.forEach(([lo, la]) => { lat += la; lng += lo; });
  return [lat / coords.length, lng / coords.length];
};

const parseDongName = (adm_nm) => {
  const parts = adm_nm.split(" ");
  return parts[parts.length - 1];
};

const getStrokeWeight = (zoom) => {
  if (zoom <= 9) return 0.5;
  if (zoom <= 11) return 1;
  if (zoom <= 13) return 1.5;
  return 2;
};

/**
 * rAF 루프 대신 Naver Maps 네이티브 panTo + setZoom 사용.
 * JS 프레임당 연산 없이 SDK 내부 GPU 파이프라인이 처리.
 *
 * 흐름: zoom-out(0ms) → pan+zoom-in(300ms) → 완료 콜백(900ms)
 */
const flyTo = (map, naver, targetLat, targetLng, targetZoom, timersRef, animatingRef, onDone) => {
  // 이전 애니메이션 취소
  timersRef.current.forEach(clearTimeout);
  timersRef.current = [];
  animatingRef.current = true;

  const currentZoom = map.getZoom();
  const target = new naver.maps.LatLng(targetLat, targetLng);

  // 이미 줌인된 상태(dong 레벨)에서 다른 곳으로 이동할 때만 줌아웃 dip 적용
  const needsDip = currentZoom >= 14;

  if (needsDip) {
    const dipZoom = Math.max(Math.min(currentZoom, targetZoom) - 1, 8);

    // 1단계: 줌아웃
    map.setZoom(dipZoom, true);

    // 2단계: 목적지로 팬
    const t1 = setTimeout(() => {
      map.panTo(target, { duration: 400, easing: "easeOutCubic" });
    }, 250);

    // 3단계: 팬 완료 후 목적지 위에서 줌인
    const t2 = setTimeout(() => {
      map.setZoom(targetZoom, true);
    }, 700);

    const t3 = setTimeout(() => {
      animatingRef.current = false;
      onDone();
    }, 1100);

    timersRef.current = [t1, t2, t3];
  } else {
    // 기본 화면 또는 구 레벨 → 팬 후 줌인
    map.panTo(target, { duration: 400, easing: "easeOutCubic" });

    const t1 = setTimeout(() => {
      map.setZoom(targetZoom, true);
    }, 450);

    const t2 = setTimeout(() => {
      animatingRef.current = false;
      onDone();
    }, 850);

    timersRef.current = [t1, t2];
  }
};

export default function NaverMap({ selectedGu, selectedDong, gradeData, onDongClick }) {
  const mapRef          = useRef(null);
  const mapInstance     = useRef(null);
  const polygonItemsRef = useRef([]);
  const animatingRef    = useRef(false);
  const flyTimersRef    = useRef([]);
  const syncStrokeRef   = useRef(null);
  // stale closure 방지 — 항상 최신 onDongClick을 가리킴
  const onDongClickRef  = useRef(onDongClick);
  useEffect(() => { onDongClickRef.current = onDongClick; }, [onDongClick]);

  useEffect(() => {
    const { naver } = window;
    if (!mapRef.current || !naver) return;

    const map = new naver.maps.Map(mapRef.current, {
      center: new naver.maps.LatLng(37.5665, 126.978),
      zoom: 11,
    });
    mapInstance.current = map;

    const syncStrokeWeights = () => {
      if (animatingRef.current) return; // 애니메이션 중 425개 setOptions 방지
      const w = getStrokeWeight(map.getZoom());
      polygonItemsRef.current.forEach(({ polygon }) => {
        polygon.setOptions({ strokeWeight: w });
      });
    };
    syncStrokeRef.current = syncStrokeWeights;

    seoulAdmdongGeoJSON.features.forEach((feature) => {
      const geometry    = feature.geometry;
      const sggnm       = feature.properties.sggnm;
      const dongName    = parseDongName(feature.properties.adm_nm);
      const adm_cd      = feature.properties.adm_cd;
      const initW       = getStrokeWeight(map.getZoom());
      const grade       = gradeData?.[adm_cd] ?? Math.ceil(Math.random() * 5);
      const fillColor   = GRADE_MAP_COLORS[grade] ?? GRADE_MAP_COLORS[3];
      const strokeColor = GRADE_COLORS[grade] ?? GRADE_COLORS[3];

      const createPolygon = (coords) => {
        const paths = coords.map((c) => new naver.maps.LatLng(c[1], c[0]));
        const polygon = new naver.maps.Polygon({
          map,
          paths: [paths],
          fillColor,
          fillOpacity: 0.3,
          strokeColor,
          strokeOpacity: 0.6,
          strokeWeight: initW,
          clickable: true,
          cursor: "pointer",
        });
        naver.maps.Event.addListener(polygon, "click", () => {
          onDongClickRef.current?.(sggnm, dongName);
        });
        polygonItemsRef.current.push({ polygon, sggnm, dongName });
      };

      if (geometry.type === "Polygon") {
        createPolygon(geometry.coordinates[0]);
      } else if (geometry.type === "MultiPolygon") {
        geometry.coordinates.forEach((pc) => createPolygon(pc[0]));
      }
    });

    const zoomListener = naver.maps.Event.addListener(
      map, "zoom_changed", syncStrokeWeights,
    );

    return () => {
      naver.maps.Event.removeListener(zoomListener);
      flyTimersRef.current.forEach(clearTimeout);
    };
  }, []);

  // 폴리곤 표시/숨김
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    polygonItemsRef.current.forEach(({ polygon, sggnm, dongName }) => {
      let visible = true;
      if (selectedGu) {
        visible = sggnm === selectedGu;
        if (visible && selectedDong) visible = dongName === selectedDong;
      }
      polygon.setMap(visible ? map : null);
    });
  }, [selectedGu, selectedDong]);

  // fly-to 이동
  useEffect(() => {
    const { naver } = window;
    const map = mapInstance.current;
    if (!naver || !map) return;

    const done = () => syncStrokeRef.current?.();

    if (selectedDong && selectedGu) {
      const feature = seoulAdmdongGeoJSON.features.find((f) =>
        f.properties.sggnm === selectedGu &&
        parseDongName(f.properties.adm_nm) === selectedDong,
      );
      if (!feature) return;
      const c = getDongCentroid(feature);
      if (!c) return;
      flyTo(map, naver, c[0], c[1], 15, flyTimersRef, animatingRef, done);
    } else if (selectedGu) {
      const features = seoulAdmdongGeoJSON.features.filter(
        (f) => f.properties.sggnm === selectedGu,
      );
      if (!features.length) return;
      let latSum = 0, lngSum = 0, cnt = 0;
      features.forEach((f) => {
        const c = getDongCentroid(f);
        if (c) { latSum += c[0]; lngSum += c[1]; cnt++; }
      });
      if (!cnt) return;
      flyTo(map, naver, latSum / cnt, lngSum / cnt, 13, flyTimersRef, animatingRef, done);
    } else {
      flyTo(map, naver, 37.5665, 126.978, 11, flyTimersRef, animatingRef, done);
    }
  }, [selectedGu, selectedDong]);

  return (
    <div className="map-container">
      <div ref={mapRef} className="map-view" />
      <div className="map-legend">
        {Object.entries(GRADE_COLORS).map(([grade, color]) => (
          <div key={grade} className="map-legend__item">
            <span className="map-legend__swatch" style={{ background: color }} />
            <span className="map-legend__label">{GRADE_LABELS[grade]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
