import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 驗證 Line 訊息的簽章，防止惡意攻擊
function verifySignature(body, channelSecret, signature) {
    const hash = crypto.createHmac('sha256', channelSecret).update(body).digest('base64');
    return hash === signature;
}

export async function POST(request) {
    try {
        const rawBody = await request.text();
        const body = JSON.parse(rawBody);
        const signature = request.headers.get('x-line-signature');

        // Line 平台發送 Webhook 時，會帶有 destination (即該 Line 官方帳號的 Bot userId)
        const destination = body.destination; 
        if (!destination) {
            return NextResponse.json({ error: 'Missing destination' }, { status: 400 });
        }

        // 1. 從 Supabase 找出這家店的 line_channel_secret 與 shop_id
        const { data: shop, error: shopError } = await supabase
            .from('shops')
            .select('id, line_channel_secret, line_channel_access_token')
            .eq('line_channel_id', destination)
            .single();

        if (shopError || !shop) {
            return NextResponse.json({ error: 'Shop multi-tenant mapping not found' }, { status: 404 });
        }

        // 2. 安全驗簽
        if (!verifySignature(rawBody, shop.line_channel_secret, signature)) {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        // 3. 處理 Line 事件 (例如：消費者傳送 GPS 定位、或加入好友)
        const events = body.events || [];
        for (const event of events) {
            if (event.type === 'message' && event.message.type === 'location') {
                // 拿到消費者 GPS：event.message.latitude, event.message.longitude
                // TODO: Milestone 2 呼叫導客路徑演算法，傳入 shop.id 作為起點
                console.log(`Shop ${shop.id} received GPS location from user.`);
            }
            
            // 模擬消費者在 Line 領取優惠券的事件
            if (event.type === 'postback' && event.postback.data === 'action=get_coupon') {
                // TODO: 呼叫發券邏輯，產生一筆帶有 security_token 的 coupon 紀錄並回傳給消費者
            }
        }

        return NextResponse.json({ message: 'Webhook processed successfully' });
    } catch (err) {
        console.error('Webhook Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}