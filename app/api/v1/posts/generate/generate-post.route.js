// app/api/v1/posts/generate/route.js  (Next.js App Router)
// ─── 這是實際部署的後端 API Route，AI 金鑰放在伺服器端 ──────────────────────

import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const TIER_LIMITS = {
  basic:    { monthly_posts: 5  },
  advanced: { monthly_posts: 15 },
  flagship: { monthly_posts: null }, // null = 無限制
};

export async function POST(request) {
  const supabase = createRouteHandlerClient({ cookies });

  // 1. 驗證登入狀態
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  // 2. 取得店家資料與訂閱方案
  const { data: shop, error: shopErr } = await supabase
    .from("shops")
    .select("id, name, category, subscription_tier, subscription_status")
    .eq("id", session.user.user_metadata.shop_id)
    .single();

  if (shopErr || !shop) {
    return NextResponse.json({ error: "SHOP_NOT_FOUND" }, { status: 404 });
  }
  if (shop.subscription_status !== "active") {
    return NextResponse.json({ error: "SUBSCRIPTION_INACTIVE", message: "訂閱已暫停，請聯繫客服" }, { status: 403 });
  }

  // 3. 檢查本月用量
  const limit = TIER_LIMITS[shop.subscription_tier]?.monthly_posts;
  if (limit !== null) {
    const billingMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
    const { count } = await supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("shop_id", shop.id)
      .eq("billing_month", billingMonth);

    if (count >= limit) {
      return NextResponse.json({
        error: "QUOTA_EXCEEDED",
        message: `${shop.subscription_tier === "basic" ? "基礎" : "進階"}方案本月額度（${limit} 篇）已用完`,
        used: count, limit,
        upgrade_url: `${process.env.NEXT_PUBLIC_APP_URL}/upgrade`,
      }, { status: 403 });
    }
  }

  // 4. 取得 Request Body
  const { tone = "溫暖在地", platform = "Instagram", extra_context = "" } = await request.json();

  // 5. 呼叫 Groq API（Llama 3）
  const prompt = `你是一位專為台灣萬華老城商圈微型店家服務的在地行銷文案師。
請為「${shop.name}」（${shop.category}類老店）撰寫一篇${platform}行銷貼文。
文案風格：${tone}。${extra_context ? `額外背景：${extra_context}` : ""}
要求：
- 100-150字繁體中文
- 帶入在地情感與老店文化底蘊
- 結尾附上3個相關 hashtag
- 包含 ESG 永續消費亮點
直接輸出文案，不要任何說明或前綴文字。`;

  const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama3-8b-8192",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000,
      temperature: 0.85,
    }),
  });

  if (!groqRes.ok) {
    const err = await groqRes.json();
    console.error("Groq API error:", err);
    return NextResponse.json({ error: "AI_GENERATION_FAILED" }, { status: 502 });
  }

  const groqData = await groqRes.json();
  const content = groqData.choices?.[0]?.message?.content || "";

  // 6. 寫入 posts 資料表
  const billingMonth = new Date().toISOString().slice(0, 7);
  const { data: post, error: insertErr } = await supabase
    .from("posts")
    .insert({
      shop_id: shop.id,
      generated_by: session.user.id,
      prompt_snapshot: prompt.slice(0, 2000),
      model_used: "llama3-8b-8192",
      tone,
      platform,
      content,
      billing_month: billingMonth,
      status: "draft",
    })
    .select()
    .single();

  if (insertErr) {
    console.error("DB insert error:", insertErr);
    return NextResponse.json({ error: "DB_INSERT_FAILED" }, { status: 500 });
  }

  // 7. 查詢最新用量後回傳
  const { count: usedNow } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true })
    .eq("shop_id", shop.id)
    .eq("billing_month", billingMonth);

  return NextResponse.json({
    post_id: post.id,
    content,
    usage: {
      used_this_month: usedNow,
      limit,
      remaining: limit !== null ? limit - usedNow : null,
    },
  });
}
