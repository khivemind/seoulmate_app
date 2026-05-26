import { useState, useRef, useEffect } from "react";
import { LuSend, LuMessageCircle, LuX, LuBot, LuUser } from "react-icons/lu";

export default function ChatPanel({
  year,
  month,
  onResult,
  onReset,
  filterOpen = false,
}) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: '안녕하세요! 원하는 주거 환경을 말씀해 주시면 맞춤 동네를 추천해 드릴게요.\n\n예) "치안이 좋고 쾌적한 곳", "생활비가 적게 드는 동네"',
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const send = async () => {
    const message = input.trim();
    if (!message || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: message }]);
    setLoading(true);

    try {
      const base = import.meta.env.VITE_API_BASE ?? "";
      const url = `${base}/v1/chat`;
      console.log(`[fetch] chat →`, url, { message, year, month });
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "v9WzP1xF7K8lQ2mR4sT6uY8aB0cD3eF9GhJkLmNo",
        },
        body: JSON.stringify({
          message: message,
          year: Number(year),
          month: Number(month),
        }),
      });
      const data = res.ok ? await res.json() : null;

      if (data?.dong_list) {
        setMessages((prev) => [
          ...prev,
          {
            role: "bot",
            text: data.message ?? `${data.dong_list.length}개 동네를 추천해 드렸어요. 지도에서 확인해 보세요!`,
            weights: data.weights,
          },
        ]);
        setHasResult(true);
        onResult(data);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "bot",
            text: "요청을 처리하지 못했습니다. 다시 시도해 주세요.",
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: "오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
        },
      ]);
    }
    setLoading(false);
  };

  const reset = () => {
    setMessages([
      {
        role: "bot",
        text: "초기화했습니다. 새로운 조건을 말씀해 주세요.",
      },
    ]);
    setHasResult(false);
    onReset();
  };

  const close = () => {
    setClosing(true);
    setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 200);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      {/* 플로팅 버튼 */}
      {!open && (
        <button
          className={`chat-fab${filterOpen ? " chat-fab--hidden" : ""}`}
          onClick={() => setOpen(true)}
        >
          <LuMessageCircle size={24} />
          {hasResult && <span className="chat-fab__badge" />}
        </button>
      )}

      {/* 채팅 패널 */}
      {open && (
        <div className={`chat-panel${closing ? " chat-panel--closing" : ""}`}>
          <div className="chat-panel__header">
            <LuBot size={18} />
            <span className="chat-panel__title">동네 추천 AI</span>
            <div className="chat-panel__header-actions">
              {hasResult && (
                <button className="chat-panel__reset" onClick={reset}>
                  초기화
                </button>
              )}
              <button className="chat-panel__close" onClick={close}>
                <LuX size={18} />
              </button>
            </div>
          </div>

          <div className="chat-panel__body">
            {messages.map((msg, i) => (
              <div key={i} className={`chat-msg chat-msg--${msg.role}`}>
                <span className="chat-msg__icon">
                  {msg.role === "bot" ? (
                    <LuBot size={14} />
                  ) : (
                    <LuUser size={14} />
                  )}
                </span>
                <div className="chat-msg__bubble">
                  <p className="chat-msg__text">{msg.text}</p>
                  {msg.weights && (
                    <div className="chat-msg__weights">
                      {Object.entries(msg.weights).map(([k, v]) => (
                        <div key={k} className="chat-msg__weight-row">
                          <span className="chat-msg__weight-label">
                            {WEIGHT_LABELS[k] ?? k}
                          </span>
                          <div className="chat-msg__weight-bar">
                            <div
                              className="chat-msg__weight-fill"
                              style={{ width: `${Math.round(v * 100)}%` }}
                            />
                          </div>
                          <span className="chat-msg__weight-pct">
                            {Math.round(v * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="chat-msg chat-msg--bot">
                <span className="chat-msg__icon">
                  <LuBot size={14} />
                </span>
                <div className="chat-msg__bubble chat-msg__bubble--loading">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="chat-panel__footer">
            <textarea
              ref={inputRef}
              className="chat-panel__input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="원하는 조건을 입력하세요..."
              rows={1}
              disabled={loading}
            />
            <button
              className="chat-panel__send"
              onClick={send}
              disabled={!input.trim() || loading}
            >
              <LuSend size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const WEIGHT_LABELS = {
  comfort: "쾌적도",
  health: "건강 안전도",
  hvac: "냉난방 효율",
  safety: "치안",
  expenses: "경제 활력도",
};
