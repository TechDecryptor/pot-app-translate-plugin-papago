use serde_json::Value;
use std::collections::HashMap;
use std::error::Error;

const URL: &str = "https://papago.naver.com/apis/n2mt/translate";

#[no_mangle]
pub fn translate(
    text: &str,
    from: &str,
    to: &str,
    _detect: &str,
    _needs: HashMap<String, String>,
) -> Result<Value, Box<dyn Error>> {
    let client = reqwest::blocking::ClientBuilder::new().build()?;

    let (hash, uuid, time) = get_token()?;

    let mut form_data = HashMap::new();
    form_data.insert("deviceId", uuid.as_str());
    form_data.insert("locale", to);
    form_data.insert("dict", "false");
    form_data.insert("dictDisplay", "30");
    form_data.insert("honorific", "false");
    form_data.insert("instant", "false");
    form_data.insert("paging", "false");
    form_data.insert("source", from);
    form_data.insert("target", to);
    form_data.insert("text", text);

    let res = client
        .post(URL)
        .header("Authorization", format!("PPG {}:{}", uuid, hash))
        .header(
            "Content-Type",
            "application/x-www-form-urlencoded; charset=UTF-8",
        )
        .header("Timestamp", time)
        .form(&form_data)
        .send()?
        .json()?;

    fn parse_result(res: Value) -> Option<String> {
        let result = res
            .as_object()?
            .get("translatedText")?
            .as_str()?
            .to_string();

        Some(result)
    }
    if let Some(result) = parse_result(res) {
        return Ok(Value::String(result));
    } else {
        return Err("Response Parse Error".into());
    }
}

fn get_version() -> Result<String, Box<dyn Error>> {
    use regex::Regex;
    let main_url = "https://papago.naver.com";
    let main_re = Regex::new(r#"\/main.([^"]+)"#)?;
    let script_re = Regex::new(r#"v1.([^"]+)"#)?;
    let client = reqwest::blocking::ClientBuilder::new().build()?;
    let data = client.get(main_url).send()?.text()?;
    let script_url = format!("{main_url}{}", main_re.find(&data).unwrap().as_str());
    let script = client.get(script_url).send()?.text()?;
    let version = script_re.find(&script).unwrap().as_str();
    return Ok(version.to_string());
}

fn get_token() -> Result<(String, String, i64), Box<dyn Error>> {
    use base64::{engine::general_purpose, Engine as _};
    use chrono::prelude::*;
    use hmac::{Hmac, Mac};
    use md5::Md5;
    use uuid::Uuid;

    let uuid = Uuid::new_v4().to_string();
    let time = Local::now().timestamp_millis();
    let version = get_version()?;
    let key = version.as_bytes();
    let data = format!("{uuid}\n{URL}\n{time}");
    let data = data.as_bytes();
    type HmacMd5 = Hmac<Md5>;
    let mut mac = HmacMd5::new_from_slice(key)?;
    mac.update(data);
    let hash = general_purpose::STANDARD.encode(mac.finalize().into_bytes());
    return Ok((hash, uuid, time));
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn try_request() {
        let needs = HashMap::new();
        let result = translate("你好 世界！", "auto", "pt", "", needs);
        println!("{result:?}");
    }
}
