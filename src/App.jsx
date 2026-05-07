import { useState } from "react";
import NaverMap from "./NaverMap.jsx";

export default function App() {
  const [query, setQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchCount, setSearchCount] = useState(0);

  const handleSubmit = (event) => {
    event.preventDefault();
    const cleaned = query.trim();
    if (!cleaned) return;
    setSearchTerm(cleaned);
    setSearchCount((count) => count + 1);
  };

  return (
    <div className="app-shell">
      <header className="top-search-bar">
        <div className="top-search-bar__logo">SeoulMate</div>
        <form className="top-search-bar__form" onSubmit={handleSubmit}>
          <input
            className="top-search-bar__input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="동 검색ddfsdfsdfsdfs... 예: 강남구 역삼동"
            aria-label="검색어 입력"
          />
          <button className="top-search-bar__button" type="submit">
            검색
          </button>
        </form>
      </header>
      <main className="page-content">
        <NaverMap searchTerm={searchTerm} searchCount={searchCount} />
      </main>
    </div>
  );
}
