import axios from 'axios';

export default async function handler(req, res) {
    const { code, error } = req.query;

    // 1. 如果使用者拒絕授權，導回首頁並帶上錯誤訊息
    if (error) {
        return res.redirect(`/?auth_error=${error}`);
    }

    // 2. 如果沒有取得授權碼，也導回首頁報錯
    if (!code) {
        return res.redirect(`/?auth_error=no_code_provided`);
    }

    try {
        // 自動判斷目前的通訊協定與網域 (本地測試為 http://localhost，正式環境為 https://nhlearn.vercel.app)
        const protocol = req.headers['x-forwarded-proto'] || 'http';
        const redirect_uri = `${protocol}://${req.headers.host}/api/auth/callback`;

        // 3. 拿 code 向 Google 兌換真正的身分憑證 (id_token 與 access_token)
        const response = await axios.post('https://oauth2.googleapis.com/token', {
            client_id: process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET, // 🚨 這是機密，必須在 Vercel 後台設定
            code,
            grant_type: 'authorization_code',
            redirect_uri: redirect_uri, // 必須與 Google Cloud Console 設定的完全一致
        });

        const { access_token, id_token } = response.data;

        // 4. 成功取得 Token，導向回前端首頁
        // 你的 App.jsx 第 539 行會擷取這兩個參數並自動完成 Firebase 登入
        res.redirect(`/?access_token=${access_token}&id_token=${id_token}`);

    } catch (err) {
        console.error("Token exchange failed:", err.response?.data || err.message);
        const errorDetail = err.response?.data?.error || 'exchange_failed';
        res.redirect(`/?auth_error=${errorDetail}`);
    }
}