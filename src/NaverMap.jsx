import { useEffect, useRef } from "react";
import seoulAdmdongGeoJSON from "./seoul-admdong.json";

// 색상 팔레트
const COLOR_PALETTE = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#FFA07A",
  "#98D8C8",
  "#F7DC6F",
  "#BB8FCE",
  "#85C1E2",
  "#F8B88B",
  "#52C4A1",
  "#FF8A7B",
  "#6C5CE7",
  "#A29BFE",
  "#74B9FF",
  "#81ECEC",
  "#55EFC4",
  "#FD79A8",
  "#FDCB6E",
  "#6C7A89",
  "#E17055",
];

const getRandomColor = () => {
  return COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
};

export default function NaverMap({ searchTerm, searchCount }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const polygonsRef = useRef([]);

  useEffect(() => {
    const { naver } = window;
    if (!mapRef.current || !naver) return;

    const location = new naver.maps.LatLng(37.5665, 126.978); // 서울 시청

    const map = new naver.maps.Map(mapRef.current, {
      center: location,
      zoom: 11,
    });

    mapInstance.current = map;

    // 줌 레벨에 따라 strokeWeight 계산
    const getStrokeWeight = (zoom) => {
      if (zoom <= 9) return 0.5;
      if (zoom <= 11) return 1;
      if (zoom <= 13) return 1.5;
      return 2;
    };

    // 줌 변경 시 strokeWeight 업데이트
    const updateStrokeWeights = () => {
      const currentZoom = map.getZoom();
      const weight = getStrokeWeight(currentZoom);
      polygonsRef.current.forEach((polygon) => {
        polygon.setOptions({ strokeWeight: weight });
      });
    };

    // GeoJSON에서 폴리곤 생성
    seoulAdmdongGeoJSON.features.forEach((feature) => {
      const geometry = feature.geometry;
      const initialWeight = getStrokeWeight(map.getZoom());
      const randomColor = getRandomColor();

      if (geometry.type === "Polygon") {
        const paths = geometry.coordinates[0].map(
          (coord) => new naver.maps.LatLng(coord[1], coord[0]),
        );

        const polygon = new naver.maps.Polygon({
          map: map,
          paths: [paths],
          fillColor: randomColor,
          fillOpacity: 0.4,
          strokeColor: randomColor,
          strokeOpacity: 0.8,
          strokeWeight: initialWeight,
        });

        polygonsRef.current.push(polygon);
      } else if (geometry.type === "MultiPolygon") {
        geometry.coordinates.forEach((polygonCoords) => {
          const paths = polygonCoords[0].map(
            (coord) => new naver.maps.LatLng(coord[1], coord[0]),
          );

          const polygon = new naver.maps.Polygon({
            map: map,
            paths: [paths],
            fillColor: randomColor,
            fillOpacity: 0.4,
            strokeColor: randomColor,
            strokeOpacity: 0.8,
            strokeWeight: initialWeight,
          });

          polygonsRef.current.push(polygon);
        });
      }
    });

    // 줌 변경 이벤트 리스너 등록
    const zoomListener = naver.maps.Event.addListener(
      map,
      "zoom_changed",
      updateStrokeWeights,
    );

    return () => {
      naver.maps.Event.removeListener(zoomListener);
    };
  }, []);

  useEffect(() => {
    const { naver } = window;
    const map = mapInstance.current;
    if (!naver || !map || !searchTerm) return;

    const Geocoder = naver.maps.ServiceGeocoder ?? naver.maps.Service?.Geocoder;
    if (!Geocoder) return;

    const geocoder = new Geocoder();
    geocoder.geocode({ query: searchTerm }, (status, response) => {
      if (status !== naver.maps.Service.Status.OK) return;
      const items = response?.result?.items;
      if (!Array.isArray(items) || items.length === 0) return;
      const item = items[0];
      const location = new naver.maps.LatLng(item.point.y, item.point.x);
      map.setCenter(location);
      map.setZoom(15);
    });
  }, [searchTerm, searchCount]);

  return <div ref={mapRef} className="map-view" />;
}
