//
//

use std::error::Error;
use futures_util::{StreamExt};
use reqwest::Client;
use reqwest::header::{HeaderName, HeaderMap};

static mut REQUEST_COUNTER: u32 = 0;

#[derive(Clone, serde::Serialize)]
pub struct StreamResponse {
  request_id: u32,
  status: u16,
  status_text: String,
  headers: HashMap<String, String>
}

#[derive(Clone, serde::Serialize)]
pub struct EndPayload {
  request_id: u32,
  status: u16,
}

#[derive(Clone, serde::Serialize)]
pub struct ChunkPayload {
  request_id: u32,
  chunk: bytes::Bytes,
}

use std::collections::HashMap;

#[derive(serde::Serialize)]
pub struct CustomResponse {
  message: String,
  other_val: usize,
}

#[tauri::command]
pub async fn stream_fetch(
  window: tauri::Window,
  method: String,
  url: String,
  headers: HashMap<String, String>,
  body: Vec<u8>,
) -> Result<StreamResponse, String> {

  let mut request_id = 0;
  let event_name = "stream-response";
  unsafe {
    REQUEST_COUNTER += 1;
    request_id = REQUEST_COUNTER;
  }

  let mut _headers = HeaderMap::new();
  for (key, value) in &headers {
    _headers.insert(key.parse::<HeaderName>().unwrap(), value.parse().unwrap());
  }

  println!("method: {:?}", method);
  println!("url: {:?}", url);
  println!("headers: {:?}", headers);
  println!("headers: {:?}", _headers);

  let method = method.parse::<reqwest::Method>().map_err(|err| format!("failed to parse method: {}", err))?;
  let client = Client::builder()
    .user_agent("Mozilla/5.0 (X11; Linux aarch64) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15")
    .default_headers(_headers)
    .build()
    .map_err(|err| format!("failed to generate client: {}", err))?;

  let mut request = client.request(
    method.clone(),
    url.parse::<reqwest::Url>().map_err(|err| format!("failed to parse url: {}", err))?
  );

  if method == reqwest::Method::POST {
    let body = bytes::Bytes::from(body);
    println!("body: {:?}", body);
    request = request.body(body);
  }
  let response_future = request.send();

  let res = response_future.await;
  let response = match res {
    Ok(res) => {
      // get response and emit to client
      let mut headers = HashMap::new();
      for (name, value) in res.headers() {
        headers.insert(
          name.as_str().to_string(),
          std::str::from_utf8(value.as_bytes()).unwrap().to_string()
        );
      }
      let status = res.status().as_u16();

      tauri::async_runtime::spawn(async move {
        let mut stream = res.bytes_stream();

        while let Some(chunk) = stream.next().await {
          match chunk {
            Ok(bytes) => {
              // println!("chunk: {:?}", bytes);
              window.emit(event_name, ChunkPayload{ request_id, chunk: bytes }).unwrap();
            }
            Err(err) => {
              println!("Error: {:?}", err);
            }
          }
        }
        window.emit(event_name, EndPayload { request_id, status: 0 }).unwrap();
      });

      StreamResponse {
        request_id,
        status,
        status_text: "OK".to_string(),
        headers,
      }
    }
    Err(err) => {
      println!("Error: {:?}", err.source().expect("REASON").to_string());
      StreamResponse {
        request_id,
        status: 599,
        status_text: err.source().expect("REASON").to_string(),
        headers: HashMap::new(),
      }
    }
  };
  Ok(response)
}
