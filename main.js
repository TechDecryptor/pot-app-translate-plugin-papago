const PAPAGO_URL = "https://papago.naver.com/api/text/translation";

async function translate(text, from, to, options) {
    const { tauriFetch: fetch } = options.utils;
    const res = await fetch(PAPAGO_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
        },
        body: {
            type: "Form",
            payload: {
                source: from,
                target: to,
                text,
                dict: "false",
                useGlossary: "false",
                honorific: "false"
            }
        }
    });

    if (!res.ok) {
        throw `Http Request Error\nHttp Status: ${res.status}\n${JSON.stringify(res.data)}`;
    }

    const result = res.data;
    if (typeof result?.translatedText === "string") {
        return result.translatedText;
    }

    throw JSON.stringify(result);
}
