-- 1. 啟用 UUID 與 向量擴充功能
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector"; -- 預留給後續 Google Maps 輿情 RAG 使用

-- 2. 建立使用者與商家權限表 (users)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, -- 實際部署時請加鹽雜湊
    role TEXT NOT NULL CHECK (role IN ('admin', 'shop')), -- admin: 冠庭/靖萱, shop: 商家
    subscription_tier TEXT NOT NULL DEFAULT '999' CHECK (subscription_tier IN ('999', '2999', '6999')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. 建立店家基本資料與輿情快取表 (shops)
CREATE TABLE shops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    shop_name TEXT NOT NULL,
    line_channel_id TEXT UNIQUE NOT NULL, -- 用於 Webhook 對接辨識不同的 Line 帳號
    line_channel_secret TEXT NOT NULL,
    line_channel_access_token TEXT NOT NULL,
    google_maps_url TEXT,
    cached_reviews JSONB DEFAULT '[]'::jsonb, -- 存放爬取的 Google Maps 評論 JSON
    reviews_embedding vector(1536), -- 預留給 Llama 3 Embedding
    esg_carbon_weight NUMERIC DEFAULT 1.0, -- ESG 基礎碳加權權重
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. 建立 AI 生成文案紀錄與方案計數器 (posts)
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    platform TEXT NOT NULL, -- FB, IG, Threads
    style TEXT NOT NULL, -- 在地人情味, 文青, 促銷
    generated_content TEXT NOT NULL,
    billing_month TEXT NOT NULL, -- 格式：'YYYY-MM'，用作 permission middleware 的計數索引
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. 建立優惠券與防偽 Token 表 (coupons)
CREATE TABLE coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    coupon_code TEXT NOT NULL,
    title TEXT NOT NULL,
    discount_detail TEXT,
    security_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'), -- 天然防偽 Token
    is_redeemed BOOLEAN DEFAULT FALSE,
    redeemed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 建立索引優化查詢效能
CREATE INDEX idx_posts_shop_month ON posts(shop_id, billing_month);
CREATE INDEX idx_shops_line_channel ON shops(line_channel_id);
CREATE INDEX idx_coupons_token ON coupons(security_token);