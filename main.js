async function translate(text, from, to, options) {
    const { utils, detect } = options;
    const { tauriFetch: fetch } = utils;

    async function getVersion() {
        let main_url = "https://papago.naver.com";
        let main_re = /\/main.([^"]+)/;
        let script_re = /v1.([^"]+)/
        let res = await fetch(main_url,{
            method: "GET",
            reponseType: 2
        });
        if (res.ok){
            let html = res.data;
            let script_url = `${main_url}${html.match(main_re)[0]}`;
            let script_res = await fetch(script_url,{
                method: "GET",
                reponseType: 2
            });
            if (script_res.ok) {
                let script = script_res.data;
                let version = script.match(script_re)[0];
                return version;
            }
        }
    }

    async function getToken() {
        let uuid = crypto.randomUUID();
        let time = Date.now()
        let version = await getVersion();
        let key = CryptoJS.enc.Utf8.parse(version);
        let data = `${uuid}\n${URL}\n${time}`;
        let dataBytes = CryptoJS.enc.Utf8.parse(data);

        const hash = CryptoJS.HmacMD5(dataBytes, key);
        const base64Hash = CryptoJS.enc.Base64.stringify(hash);

        return[base64Hash, uuid, time];
    }
    let [hash,uuid,time] = getToken();

    let formData = new FormData();
    formData.insert("deviceId", uuid);
    formData.insert("locale", to);
    formData.insert("dict", "false");
    formData.insert("dictDisplay", "30");
    formData.insert("honorific", "false");
    formData.insert("instant", "false");
    formData.insert("paging", "false");
    formData.insert("source", from);
    formData.insert("target", to);
    formData.insert("text", text);

    const res = await fetch("https://papago.naver.com/apis/n2mt/translate", {
        method: 'POST',
        headers: {
            "Authorization": `PPG ${uuid}:${hash}`,
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "Timestamp": time
        },
        body: {
            type: "Form",
            payload: formData
        }
    });

    if (res.ok) {
        let result = res.data;
        const { translatedText } = result;
        if (translatedText) {
            return translatedText;
        } else {
            throw JSON.stringify(result);
        }
    } else {
        throw `Http Request Error\nHttp Status: ${res.status}\n${JSON.stringify(res.data)}`;
    }
}
