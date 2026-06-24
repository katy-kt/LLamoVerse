import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function POST(request) {
    try {
        const { security_token, shop_id } = await request.json();

        if (!security_token || !shop_id) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. 查詢該防偽 Token 是否存在，且屬於該特定店家（防範跨店竄改/偽造攻擊）
        const { data: coupon, error: queryError } = await supabase
            .from('coupons')
            .select('*')
            .eq('security_token', security_token)
            .eq('shop_id', shop_id)
            .single();

        if (queryError || !coupon) {
            return NextResponse.json({ error: '優惠券不存在，或無權限核銷此店家的優惠券' }, { status: 404 });
        }

        // 2. 檢查是否已經被核銷過
        if (coupon.is_redeemed) {
            return NextResponse.json({ 
                error: '此優惠券已被核銷使用過！', 
                redeemed_at: coupon.redeemed_at 
            }, { status: 400 });
        }

        // 3. 執行核銷更新
        const { error: updateError } = await supabase
            .from('coupons')
            .update({ 
                is_redeemed: true, 
                redeemed_at: new Date().toISOString() 
            })
            .eq('id', coupon.id);

        if (updateError) {
            return NextResponse.json({ error: '核銷失敗，請稍後再試' }, { status: 500 });
        }

        return NextResponse.json({ 
            message: '優惠券核銷成功！', 
            coupon_title: coupon.title,
            discount_detail: coupon.discount_detail
        }, { status: 200 });

    } catch (err) {
        console.error('Coupon Verification Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}