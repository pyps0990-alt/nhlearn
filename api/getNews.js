import axios from 'axios';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    try {
        // 1. 取得首頁 HTML 與 Cookie
        const homeRes = await axios.get("https://www.nhsh.tp.edu.tw/", {
            headers: { 'User-Agent': userAgent },
            timeout: 10000
        });
        const cookies = homeRes.headers['set-cookie']?.join('; ') || '';
        const $home = cheerio.load(homeRes.data);

        const combinedLinks = [];

        // 🎯 策略 A：從首頁過濾雜訊，"只"抓取帶有「置頂」特徵的連結
        $home('a[href*="/content?a="]').each((i, el) => {
            const href = $home(el).attr('href');
            if (!href) return;

            const fullLink = href.startsWith('http') ? href : `https://www.nhsh.tp.edu.tw${href}`;

            // 擴大偵測範圍：本身的 HTML 或父層的 HTML 是否包含「置頂」字眼或圖片
            const elementHtml = $home(el).html() || "";
            const parentHtml = $home(el).parent().html() || "";
            const isPinned = elementHtml.includes('置頂') || parentHtml.includes('置頂') ||
                elementHtml.includes('top') || parentHtml.includes('top') ||
                elementHtml.includes('Top') || parentHtml.includes('Top');

            // 只有「確定是置頂的」，才從 HTML 加入清單，完美避開處室介紹等雜訊網頁
            if (isPinned && !combinedLinks.some(item => item.link === fullLink)) {
                combinedLinks.push({ link: fullLink, isPinned: true });
            }
        });

        // 🎯 策略 B：呼叫 API 專心補足「最新一般公告」
        const targetUrl = "https://www.nhsh.tp.edu.tw/lazyloadnews?LoadingAmount=T0RESTVpbnRlbHk%3D&NodeId=T0RESTc1NDQxODkzNDkzOTE2MVRDaW50ZWx5&categorystate=&blocktype=T0RESTYyaW50ZWx5&blockId=T0RESTc4NDI1MDM1NjkzOTE2MUJOaW50ZWx5&CurrentUsers=";
        try {
            const apiResponse = await axios.get(targetUrl, {
                headers: { 'User-Agent': userAgent, 'Cookie': cookies, 'X-Requested-With': 'XMLHttpRequest' },
                timeout: 10000
            });
            const rawDataList = apiResponse.data?.data || [];

            rawDataList.forEach(item => {
                const link = `https://www.nhsh.tp.edu.tw/content?a=${item.NodeId}&c=${apiResponse.data.Category}`;
                const isPinned = (item.SetTop && item.SetTop.length > 0);

                if (!combinedLinks.some(x => x.link === link)) {
                    combinedLinks.push({ link, isPinned });
                }
            });
        } catch (apiErr) {
            console.warn("API 撈取失敗，將僅使用首頁 HTML 抓取的連結");
        }

        // 4. 序列化進入內頁，抓取真實標題與日期
        const finalNews = [];
        const noise = ["參考資料", "相關連結", "附件下載", "回上一頁", "最新消息", "首頁", "內湖高中", "列印", "網站導覽"];

        for (const item of combinedLinks) {
            // 🎯 強制煞車：只要湊滿 5 筆就立刻停手，節省效能
            if (finalNews.length >= 5) break;

            try {
                const detailRes = await axios.get(item.link, {
                    headers: { 'User-Agent': userAgent, 'Cookie': cookies },
                    timeout: 10000
                });
                const $ = cheerio.load(detailRes.data);

                let realTitle = "";
                const pageTitle = $('title').text().trim();
                const titleMatch = pageTitle.replace(/\s*-\s*臺北市立內湖高級中學.*/, '').trim();

                if (titleMatch && !titleMatch.includes("首頁")) {
                    realTitle = titleMatch;
                } else {
                    const targets = ['.content_title', 'h3', 'h2'];
                    for (let selector of targets) {
                        const text = $(selector).first().text().trim();
                        if (text.length > 5 && !noise.some(k => text.includes(k))) {
                            realTitle = text;
                            break;
                        }
                    }
                }

                const isGenuine = realTitle.length > 5 &&
                    !noise.some(k => realTitle.includes(k)) &&
                    !realTitle.startsWith('NN');

                if (isGenuine) {
                    const pageText = $('body').text();
                    const dateMatch = pageText.match(/20\d{2}-\d{2}-\d{2}/);
                    const cleanDate = dateMatch ? dateMatch[0] : "最新";

                    finalNews.push({
                        title: realTitle,
                        date: cleanDate,
                        link: item.link,
                        isPinned: item.isPinned
                    });
                }
            } catch (e) {
                continue;
            }
        }

        // 5. 回傳前做最後的排序（置頂強制排前面，其餘按日期由新到舊）
        finalNews.sort((a, b) => {
            if (a.isPinned !== b.isPinned) return (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0);
            return b.date.localeCompare(a.date);
        });

        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');

        // 🎯 雙重保險：確保最終輸出的 JSON 絕對只有 5 筆
        return res.status(200).json(finalNews.slice(0, 5));

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}