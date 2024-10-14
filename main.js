// Papago 翻譯 API 的 URL
const PAPAGO_URL = "https://papago.naver.com/apis/n2mt/translate";

// 注意：確保 CryptoJS 已正確引入，假設它已在全局範圍內可用
// 如果使用模塊化系統，請使用適當的導入方式
// 例如：const CryptoJS = require("crypto-js");

// 獲取 Papago 版本號
async function getVersion() {
    try {
        const mainUrl = "https://papago.naver.com";
        const mainRe = /\/main\.([^"]+)/;
        const scriptRe = /v1\.([^"]+)/;

        // 獲取主頁面內容
        const res = await fetch(mainUrl, {
            method: "GET"
        });
        if (res.ok) {
            const html = await res.text();
            console.log("Main HTML:", html.substring(0, 200));
            
            // 提取腳本 URL
            const scriptUrlMatch = html.match(mainRe);
            if (!scriptUrlMatch) {
                throw new Error("Failed to find script URL");
            }
            const scriptUrl = `${mainUrl}${scriptUrlMatch[0]}`;
            console.log("Script URL:", scriptUrl);
            
            // 獲取腳本內容
            const scriptRes = await fetch(scriptUrl, {
                method: "GET"
            });
            if (scriptRes.ok) {
                const script = await scriptRes.text();
                console.log("Script content:", script.substring(0, 200));
                
                // 提取版本號
                const versionMatch = script.match(scriptRe);
                if (!versionMatch) {
                    throw new Error("Failed to find version");
                }
                return versionMatch[0];
            }
        }
        throw new Error("Failed to get version");
    } catch (error) {
        console.error("Error in getVersion:", error);
        throw error;
    }
}

// 生成 UUID
function generateUUID() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

// 使用 CryptoJS 計算 HMAC-MD5 並轉換為 URL 安全的 Base64
function hmacMD5(key, message) {
    const hash = CryptoJS.HmacMD5(CryptoJS.enc.Utf8.parse(message), CryptoJS.enc.Utf8.parse(key));
    const base64Hash = CryptoJS.enc.Base64.stringify(hash);
    return base64Hash.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// 獲取認證 Token
async function getToken() {
    try {
        const uuid = crypto.randomUUID();
        const time = Date.now();
        const version = await getVersion();
        console.log("Version:", version);
        
        // 計算 HMAC
        const key = CryptoJS.enc.Utf8.parse(version);
        const data = `${uuid}\n${PAPAGO_URL}\n${time}`;
        const dataBytes = CryptoJS.enc.Utf8.parse(data);
        const hash = CryptoJS.HmacMD5(dataBytes, key);
        const base64Hash = CryptoJS.enc.Base64.stringify(hash);

        console.log("Generated HMAC:", base64Hash);
        return [base64Hash, uuid, time];
    } catch (error) {
        console.error("Error in getToken:", error);
        throw error;
    }
}

// 執行翻譯
async function translate(text, from, to, options) {
    const { utils, detect } = options;
    const { tauriFetch: fetch } = utils;

    try {
        // 獲取認證信息
        const [hash, uuid, time] = await getToken();

        // 準備請求數據
        const formData = {
            deviceId: uuid,
            locale: to,
            dict: "false",
            dictDisplay: "30",
            honorific: "false",
            instant: "false",
            paging: "false",
            source: from,
            target: to,
            text: text,
            usageAgreed: "false"
        };

        console.log("Request Body:", formData);

        // 發送翻譯請求
        const res = await fetch(PAPAGO_URL, {
            method: 'POST',
            headers: {
                "Authorization": `PPG ${uuid}:${hash}`,
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "Timestamp": time.toString(),
                "Device-Type": "pc",
                "X-Apigw-Partnerid": "papago"
            },
            body: {
                type: "Form",
                payload: formData
            }
        });

        console.log("Response Status:", res.status);
        const responseData = res.data;  // Tauri 可能已經解析了 JSON
        console.log("Response Data:", responseData);

        // 處理響應
        if (res.ok) {
            const { translatedText } = responseData;
            if (translatedText) {
                return translatedText;
            } else {
                throw JSON.stringify(responseData);
            }
        } else {
            throw `Http Request Error\nHttp Status: ${res.status}\n${JSON.stringify(responseData)}`;
        }
    } catch (error) {
        console.error("Translation error:", error);
        throw error;
    }
}