import { useState } from "react";

// ─── 常數 ─────────────────────────────────────────────────────────────────────
const TIERS = {
  basic:    { label: "基礎方案", posts: 5  },
  advanced: { label: "進階方案", posts: 15 },
  flagship: { label: "旗艦方案", posts: null },
};

const TONES     = ["溫暖在地", "活動促銷", "ESG 永續", "節慶限定"];
const PLATFORMS = ["Instagram", "Facebook", "Threads", "LINE"];

const C = {
  purple: "#8b5cf6", teal: "#14b8a6", red: "#ef4444",
  border: "rgba(255,255,255,0.1)", borderHi: "rgba(139,92,246,0.4)",
  textMuted: "#9da8c9", textDim: "#5a6490", bg: "rgba(255,255,255,0.05)",
};

// ─── Sub-components ────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div style={{
      width: 22, height: 22, borderRadius: "50%",
      border: "2.5px solid rgba(139,92,246,0.2)",
      borderTopColor: C.purple,
      animation: "spin 0.7s linear infinite",
      display: "inline-block",
    }} />
  );
}

function ProgressBar({ value, max, color = C.purple }) {
  const pct = max ? Math.min((value / max) * 100, 100) : 0;
  const barColor = pct > 80 ? C.red : color;
  return (
    <div style={{ height: 5, background: "rgba(255,255,255,0.07)", borderRadius: 3, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 3, transition: "width 0.5s" }} />
    </div>
  );
}

function Chip({ label, active, activeColor = C.purple, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "5px 13px", borderRadius: 20, cursor: "pointer", fontSize: 12,
      border: `1px solid ${active ? activeColor : C.border}`,
      background: active ? `${activeColor}22` : "transparent",
      color: active ? activeColor : C.textMuted,
      fontFamily: "inherit", transition: "all 0.2s",
    }}>{label}</button>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
/**
 * PostGenerator
 * Props:
 *   shopId     string   - shop UUID (從 Supabase session 取得)
 *   shopName   string   - 店家名稱
 *   shopCat    string   - 店家類別
 *   tier       string   - "basic" | "advanced" | "flagship"
 *   postsUsed  number   - 本月已用篇數 (從 DB 查詢)
 *   onSuccess  function - 生成成功後的 callback (可用於更新父元件的 used count)
 */
export default function PostGenerator({
  shopId = "demo",
  shopName = "阿龍號滷肉飯",
  shopCat = "餐飲",
  tier = "basic",
  postsUsed: initUsed = 3,
  onSuccess,
}) {
  const tierConfig = TIERS[tier] || TIERS.basic;
  const [used, setUsed] = useState(initUsed);
  const [tone, setTone] = useState("溫暖在地");
  const [platform, setPlatform] = useState("Instagram");
  const [extra, setExtra] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const remaining = tierConfig.posts === null ? Infinity : tierConfig.posts - used;
  const quota = tierConfig.posts;

  const generate = async () => {
    if (quota !== null && used >= quota) {
      setError(`${tierConfig.label}本月額度（${quota} 篇）已用完，請聯繫管理員升級方案。`);
      return;
    }
    setLoading(true);
    setError("");
    setResult("");

    try {
      // ── 實際部署：改成呼叫自己的 Next.js Server Action / API Route ──────────
      // const res = await fetch("/api/v1/posts/generate", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` },
      //   body: JSON.stringify({ shop_id: shopId, tone, platform, extra_context: extra }),
      // });
      // const data = await res.json();
      // if (!res.ok) throw new Error(data.detail?.message || "生成失敗");
      // setResult(data.content);

      // ── 暫時：直接呼叫 Anthropic API（部署前須移到後端）──────────────────────
      const prompt = `你是一位專為台灣萬華老城商圈微型店家服務的在地行銷文案師。
請為「${shopName}」（${shopCat}類老店）撰寫一篇${platform}行銷貼文。
文案風格：${tone}。${extra ? `額外背景：${extra}` : ""}
要求：
- 100-150字繁體中文
- 帶入在地情感與老店文化底蘊
- 結尾附上3個相關 hashtag
- 包含 ESG 永續消費亮點
直接輸出文案，不要任何說明或前綴文字。`;

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const text = data.content?.map((b) => b.text || "").join("") || "";
      setResult(text);
      setUsed((u) => u + 1);
      onSuccess?.({ content: text, used: used + 1 });
    } catch (e) {
      setError(`生成失敗：${e.message}`);
    }
    setLoading(false);
  };

  const s = {
    card: {
      background: "rgba(255,255,255,0.05)",
      border: `1px solid ${C.border}`, borderRadius: 13, padding: 18,
    },
    lbl: { fontSize: 11, color: C.textMuted, fontWeight: 600, letterSpacing: "0.04em", marginBottom: 5, display: "block" },
    input: {
      width: "100%", background: "rgba(255,255,255,0.05)",
      border: `1px solid ${C.border}`, borderRadius: 9,
      padding: "9px 13px", color: "#f0f0ff", fontSize: 13,
      fontFamily: "inherit", outline: "none", boxSizing: "border-box",
    },
    btn: {
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "9px 20px", borderRadius: 9, border: "none", cursor: "pointer",
      fontSize: 13, fontWeight: 600, fontFamily: "inherit",
      background: "linear-gradient(135deg,#6c3fc5,#4a6cf7)", color: "#fff",
      transition: "all 0.2s",
    },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, color: "#f0f0ff" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 19, fontWeight: 700 }}>✍️ AI 文案生成</div>
          <div style={{ fontSize: 12, color: C.textDim, marginTop: 3 }}>Groq Llama 3 × 萬華在地輿情庫</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, color: C.textDim }}>本月用量</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: quota && used / quota > 0.8 ? C.red : C.purple }}>
            {used}{quota ? `/${quota}` : " 篇"}
          </div>
        </div>
      </div>

      {/* Progress */}
      {quota && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.textDim }}>
            <span>已用 {used} 篇</span>
            <span>剩餘 {remaining} 篇</span>
          </div>
          <ProgressBar value={used} max={quota} />
        </>
      )}

      {/* Settings */}
      <div style={s.card}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: C.textDim, textTransform: "uppercase", marginBottom: 10 }}>文案設定</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          <div>
            <label style={s.lbl}>風格</label>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {TONES.map((t) => <Chip key={t} label={t} active={tone === t} onClick={() => setTone(t)} />)}
            </div>
          </div>
          <div>
            <label style={s.lbl}>發布平台</label>
            <div style={{ display: "flex", gap: 7 }}>
              {PLATFORMS.map((p) => <Chip key={p} label={p} active={platform === p} activeColor={C.teal} onClick={() => setPlatform(p)} />)}
            </div>
          </div>
          <div>
            <label style={s.lbl}>額外說明（選填）</label>
            <textarea
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
              placeholder="例：本週推出限定甜湯、使用格外食材、母親節特惠…"
              rows={2}
              style={{ ...s.input, resize: "vertical" }}
            />
          </div>

          {error && (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 9, padding: "9px 13px", fontSize: 12, color: "#f87171" }}>
              {error}
            </div>
          )}

          {remaining <= 0 ? (
            <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 9, padding: "10px 14px", fontSize: 12, color: "#f87171" }}>
              ⚠️ {tierConfig.label}本月額度（{quota} 篇）已用完，請聯繫管理員升級方案。
            </div>
          ) : (
            <button onClick={generate} disabled={loading} style={s.btn}>
              {loading ? <Spinner /> : "✨ 生成文案"}
            </button>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ ...s.card, textAlign: "center", padding: 28 }}>
          <Spinner />
          <div style={{ fontSize: 13, color: C.textMuted, marginTop: 12 }}>🦙 正在融合萬華老店文化與在地情感…</div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div style={{ ...s.card, borderColor: C.borderHi }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: C.textDim, textTransform: "uppercase" }}>生成結果</div>
            <div style={{ display: "flex", gap: 7 }}>
              <button
                onClick={() => navigator.clipboard?.writeText(result)}
                style={{ ...s.btn, background: "rgba(139,92,246,0.15)", color: C.purple, border: `1px solid rgba(139,92,246,0.3)`, fontSize: 11, padding: "5px 11px" }}
              >📋 複製</button>
              <button
                onClick={() => setResult("")}
                style={{ ...s.btn, background: "transparent", color: C.textMuted, border: `1px solid ${C.border}`, fontSize: 11, padding: "5px 11px" }}
              >✕ 清除</button>
            </div>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.85, color: "#e0e7ff", whiteSpace: "pre-wrap" }}>{result}</div>
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}`, display: "flex", gap: 14, fontSize: 11, color: C.textDim }}>
            <span>🌱 預估減碳 0.05 kg CO₂</span>
            <span>📱 {platform}</span>
            <span>🎨 {tone}</span>
          </div>
        </div>
      )}
    </div>
  );
}
