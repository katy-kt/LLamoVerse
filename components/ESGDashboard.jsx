import { useState } from "react";

// ─── Types (JSDoc) ─────────────────────────────────────────────────────────────
/**
 * @typedef {Object} ESGData
 * @property {number} score              - 0~100 綜合 ESG 分數
 * @property {ESGMetric[]} metrics       - 各項指標
 * @property {ESGIssue[]} issues         - 問題診斷
 * @property {SDGItem[]} sdgs            - SDGs 對齊指標
 * @property {number[]} monthly          - 近 6 個月 CO₂ 節省（kg）
 */

// ─── Demo Data（實際部署時從 Supabase 查詢替換）──────────────────────────────
const DEMO_ESG = {
  score: 72,
  metrics: [
    { key: "co2",     label: "CO₂ 節省",   val: 45.2, unit: "kg", pct: 62, color: "#14b8a6", trend: "+8%",  trendUp: true  },
    { key: "local",   label: "在地採購率", val: 78,   unit: "%",  pct: 78, color: "#22c55e", trend: "+5%",  trendUp: true  },
    { key: "waste",   label: "格外食材率", val: 23,   unit: "%",  pct: 23, color: "#f59e0b", trend: "-2%",  trendUp: false },
    { key: "recycle", label: "廢棄物減量", val: 41,   unit: "%",  pct: 41, color: "#8b5cf6", trend: "+12%", trendUp: true  },
  ],
  issues: [
    {
      id: "issue1",
      title: "格外食材使用率偏低（23%）",
      severity: "high",
      color: "#ef4444",
      reason: "目前食材採購仍以傳統市場為主，與格外食材供應商尚未建立穩定合作關係；廚房流程調整成本顯示為店家採購障礙。短期量少時品質不穩定也是阻力之一。",
      actions: [
        "洽談萬華區「格外食材媒合平台」建立月訂固定配送，降低採購不確定性",
        "每週固定 1 道菜採用格外食材，逐步訓練廚房流程，避免一次性大幅調整",
        "在 Line Bot 及社群貼文標記格外食材菜色，吸引 ESG 意識消費者，形成正向循環",
      ],
    },
    {
      id: "issue2",
      title: "廢棄物減量率停滯（41%）",
      severity: "mid",
      color: "#f59e0b",
      reason: "備料估算仍依賴師傅經驗，旺季備料過量導致廚餘偏高；外帶包裝尚未轉換為可回收材質，現有存貨仍需消化。",
      actions: [
        "導入 POS 銷售預測，依據近 4 週數據動態調整備料量，目標減少廚餘 30%",
        "外帶袋改用再生牛皮紙袋（年省約 NT$8,000 包材成本，同時提升品牌形象）",
        "設置廚餘公斤數每日記錄表，每月回顧並設定下月減量目標，量化管理",
      ],
    },
    {
      id: "issue3",
      title: "SDG 13 氣候行動得分偏低（61%）",
      severity: "low",
      color: "#6366f1",
      reason: "店內用電未採再生能源，冷藏設備老舊（超過 10 年）導致電耗偏高；碳足跡計算尚未納入食材運輸段，計算基準不完整。",
      actions: [
        "申請台電「綠電憑證」方案，年額外支出約 NT$1,200，可大幅提升 SDG 13 分數",
        "評估汰換老舊冷藏櫃（台北市政府補助最高 NT$30,000，申請窗口：環保局）",
        "與在地供應商協議集中配送，減少每週配送次數，降低食材最後一哩碳排",
      ],
    },
  ],
  sdgs: [
    { id: "SDG 11", label: "永續城市與社區", pct: 72, color: "#f59e0b" },
    { id: "SDG 12", label: "責任消費與生產", pct: 85, color: "#6366f1" },
    { id: "SDG 13", label: "氣候行動",       pct: 61, color: "#14b8a6" },
    { id: "SDG 17", label: "夥伴關係",       pct: 78, color: "#8b5cf6" },
  ],
  monthly: [42, 38, 51, 45, 58, 45.2],
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
function Pill({ label, color }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: `${color}22`, color, border: `1px solid ${color}44`,
    }}>{label}</span>
  );
}

function ProgressBar({ pct, color }) {
  const barColor = pct > 75 ? "#22c55e" : pct > 45 ? color : "#ef4444";
  return (
    <div style={{ height: 5, background: "rgba(255,255,255,0.07)", borderRadius: 3, overflow: "hidden", marginTop: 5 }}>
      <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 3, transition: "width 0.8s" }} />
    </div>
  );
}

function ESGRing({ score }) {
  const r = 36, cx = 42, cy = 42, circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score > 80 ? "#22c55e" : score > 60 ? "#f59e0b" : "#ef4444";
  return (
    <svg width="84" height="84" viewBox="0 0 84 84">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="7"
        strokeDasharray={`${dash.toFixed(1)} ${circ.toFixed(1)}`}
        strokeDashoffset={(circ / 4).toFixed(1)} strokeLinecap="round" />
      <text x={cx} y={cy - 2} textAnchor="middle" fill={color} fontSize="17" fontWeight="800" fontFamily="Outfit,sans-serif">{score}</text>
      <text x={cx} y={cy + 11} textAnchor="middle" fill="#3d4a70" fontSize="9" fontFamily="Outfit,sans-serif">ESG 分</text>
    </svg>
  );
}

const SCARD = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 13, padding: 16,
};

// ─── Main Component ────────────────────────────────────────────────────────────
/**
 * ESGDashboard
 * Props:
 *   shopName  string   - 店家名稱
 *   rank      number   - 全商圈排名
 *   data      ESGData  - ESG 數據（從 Supabase 查詢，預設使用 DEMO_ESG）
 */
export default function ESGDashboard({
  shopName = "阿龍號滷肉飯",
  rank = 3,
  data = DEMO_ESG,
}) {
  const [openIssue, setOpenIssue] = useState(null);
  const maxMonthly = Math.max(...data.monthly);
  const severityLabel = { high: "高優先", mid: "中優先", low: "待改善" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, color: "#f0f0ff" }}>

      {/* Score Header */}
      <div style={{ ...SCARD, borderColor: "rgba(139,92,246,0.4)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <ESGRing score={data.score} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{shopName}</div>
            <div style={{ fontSize: 12, color: "#7a8ab0", margin: "3px 0 9px" }}>
              全商圈永續排行：第 {rank} 名 🏆
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <Pill label="在地採購" color="#22c55e" />
              <Pill label="減量包裝" color="#22c55e" />
              <Pill label="跨店引流" color="#22c55e" />
              <Pill label="格外食材待改善" color="#f59e0b" />
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {data.metrics.map((m) => (
          <div key={m.key} style={{ ...SCARD }}>
            <div style={{ fontSize: 11, color: "#7a8ab0", marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: m.color }}>
              {m.val}<span style={{ fontSize: 12, fontWeight: 500, marginLeft: 3 }}>{m.unit}</span>
            </div>
            <div style={{ fontSize: 10, color: m.trendUp ? "#22c55e" : "#ef4444", marginBottom: 4 }}>
              {m.trend} 較上月
            </div>
            <ProgressBar pct={m.pct} color={m.color} />
          </div>
        ))}
      </div>

      {/* Monthly Chart */}
      <div style={SCARD}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#3d4a70", textTransform: "uppercase", marginBottom: 10 }}>
          近 6 個月 CO₂ 節省趨勢（kg）
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 7, height: 90, padding: "0 2px" }}>
          {data.monthly.map((v, i) => {
            const h = Math.round((v / maxMonthly) * 75);
            const isLast = i === data.monthly.length - 1;
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <div style={{ fontSize: 9, color: "#5a6490" }}>{Math.round(v)}</div>
                <div style={{
                  width: "100%", height: h,
                  background: isLast ? "linear-gradient(180deg,#8b5cf6,#4a6cf7)" : "rgba(99,102,241,0.25)",
                  borderRadius: "4px 4px 0 0",
                  border: `1px solid ${isLast ? "rgba(139,92,246,0.5)" : "rgba(99,102,241,0.2)"}`,
                }} />
                <div style={{ fontSize: 9, color: "#3d4a70" }}>
                  {["1月","2月","3月","4月","5月","6月"][i]}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SDGs */}
      <div style={SCARD}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#3d4a70", textTransform: "uppercase", marginBottom: 10 }}>
          SDGs 對齊指標
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
          {data.sdgs.map((s) => (
            <div key={s.id} style={{ padding: "10px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                <Pill label={s.id} color={s.color} />
                <span style={{ fontSize: 11, color: "#7a8ab0" }}>{s.label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: s.color, marginLeft: "auto" }}>{s.pct}%</span>
              </div>
              <ProgressBar pct={s.pct} color={s.color} />
            </div>
          ))}
        </div>
      </div>

      {/* Issue Diagnosis */}
      <div style={{ fontSize: 15, fontWeight: 700, color: "#f0f0ff", marginBottom: -4 }}>
        ⚠️ 問題診斷與優化策略
      </div>

      {data.issues.map((issue) => {
        const isOpen = openIssue === issue.id;
        return (
          <div key={issue.id} style={{
            borderRadius: 12, border: `1px solid ${issue.color}44`,
            background: `${issue.color}0a`, overflow: "hidden",
          }}>
            {/* Issue header – click to expand */}
            <button
              onClick={() => setOpenIssue(isOpen ? null : issue.id)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "13px 15px", border: "none", background: "transparent",
                cursor: "pointer", textAlign: "left", fontFamily: "inherit",
              }}
            >
              <Pill label={severityLabel[issue.severity]} color={issue.color} />
              <span style={{ fontSize: 13, fontWeight: 700, color: issue.color, flex: 1 }}>{issue.title}</span>
              <span style={{ fontSize: 14, color: "#5a6490", transition: "transform 0.2s", transform: isOpen ? "rotate(90deg)" : "none" }}>▶</span>
            </button>

            {/* Expanded content */}
            {isOpen && (
              <div style={{ padding: "0 15px 15px" }}>
                {/* Reason */}
                <div style={{
                  fontSize: 12, color: "#9da8c9", lineHeight: 1.75,
                  padding: "10px 12px", background: "rgba(0,0,0,0.2)", borderRadius: 9, marginBottom: 12,
                }}>
                  <span style={{ fontWeight: 700, color: "#7a8ab0" }}>原因分析：</span> {issue.reason}
                </div>

                {/* Actions */}
                <div style={{ fontSize: 11, fontWeight: 700, color: "#5a6490", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
                  具體優化行動
                </div>
                {issue.actions.map((a, i) => (
                  <div key={i} style={{
                    display: "flex", gap: 10, alignItems: "flex-start",
                    padding: "7px 0",
                    borderBottom: i < issue.actions.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                  }}>
                    <span style={{
                      background: `${issue.color}33`, color: issue.color,
                      borderRadius: "50%", width: 20, height: 20,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, fontWeight: 700, flexShrink: 0, marginTop: 1,
                    }}>{i + 1}</span>
                    <span style={{ fontSize: 12, color: "#c0caf5", lineHeight: 1.7 }}>{a}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
