/* DSH Desktop (Tauri) - Rust main-process backend. */
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri::Emitter;
use tokio::sync::Mutex as TMutex;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, ChildStdin, Command};
use uuid::Uuid;

#[derive(Clone, Serialize, Default)]
struct RuntimeStatus { connected: bool, error: Option<String>, provider: String, model: String }

struct AppContext {
    stdin: TMutex<Option<ChildStdin>>,
    child: TMutex<Option<Child>>,
    pending: Arc<Mutex<HashMap<String, tokio::sync::oneshot::Sender<serde_json::Value>>>>,
    status: Arc<Mutex<RuntimeStatus>>,
}

#[derive(Deserialize)]
struct InitParams {
    cwd: String, provider: String, model: String,
    #[serde(default)] max_tokens: Option<u64>,
    #[serde(default)] api_key: Option<String>,
    #[serde(default)] runtime_path: Option<String>,
}
#[derive(Deserialize)]
struct PromptParams { session_id: String, content: String }
#[derive(Serialize)]
struct PromptResult { message_id: String }

async fn rpc_req(stdin: &TMutex<Option<ChildStdin>>, pending: &Mutex<HashMap<String, tokio::sync::oneshot::Sender<serde_json::Value>>>, method: &str, params: serde_json::Value) -> Result<serde_json::Value, String> {
    let id = Uuid::new_v4().to_string();
    let req = serde_json::json!({"jsonrpc":"2.0","id":id,"method":method,"params":params});
    let (tx, rx) = tokio::sync::oneshot::channel();
    { let mut p = pending.lock().unwrap(); p.insert(id.clone(), tx); }
    {
        let mut g = stdin.lock().await;
        let w = g.as_mut().ok_or("runtime not connected")?;
        let mut payload = req.to_string().into_bytes();
        payload.push(10);
        w.write_all(&payload).await.map_err(|e| e.to_string())?;
        w.flush().await.map_err(|e| e.to_string())?;
    }
    rx.await.map_err(|_| "request dropped".into())
}
#[tauri::command]
async fn init_runtime(state: tauri::State<'_, AppContext>, app: tauri::AppHandle, params: InitParams) -> Result<RuntimeStatus, String> {
    {
        let mut child = state.child.lock().await;
        if let Some(c) = child.as_mut() { let _ = c.kill().await; }
    }
    let mut cmd = Command::new("node");
    let mut args = vec!["--import".to_string(), "tsx/esm".to_string()];
    args.push(params.runtime_path.as_ref().map_or_else(|| "../../packages/examples/jsonrpc-demo/src/bin.ts".to_string(), |p| p.clone()));
    cmd.args(args);
    cmd.env("DSH_CWD", &params.cwd);
    if let Some(k) = &params.api_key { cmd.env("DEEPSEEK_API_KEY", k); }
    if let Some(t) = params.max_tokens { cmd.env("DSH_MAX_TOKENS", t.to_string()); }
    cmd.kill_on_drop(true);
    cmd.stdin(std::process::Stdio::piped());
    cmd.stdout(std::process::Stdio::piped());
    cmd.stderr(std::process::Stdio::piped());
    let mut child = cmd.spawn().map_err(|e| e.to_string())?;
    let stdin = child.stdin.take().unwrap();
    let stdout = child.stdout.take().unwrap();
    let stderr = child.stderr.take().unwrap();
    *state.stdin.lock().await = Some(stdin);
    { let mut c = state.child.lock().await; *c = Some(child); }
    let app = app.clone();
    let pending = state.pending.clone();
    let status = state.status.clone();
    let provider = params.provider.clone();
    let model = params.model.clone();
    tokio::spawn(async move {
        let mut reader = BufReader::new(stdout);
        let mut line = String::new();
        loop {
            line.clear();
            let n = match reader.read_line(&mut line).await { Ok(n) => n, Err(_) => break };
            if n == 0 { continue; }
            let line = line.trim().to_string();
            if line.is_empty() { continue; }
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(&line) {
                if let Some(id) = v.get("id").and_then(|x| x.as_str()) {
                    if let Some(tx) = pending.lock().unwrap().remove(id) { let _ = tx.send(v); }
                } else if let Some(m) = v.get("method").and_then(|x| x.as_str()) {
                    let _ = app.emit(m, &v);
                }
            }
        }
        let mut s = status.lock().unwrap();
        s.connected = false; s.error = Some("runtime exited".to_string());
        s.provider = provider; s.model = model;
    });
    let status = state.status.clone();
    tokio::spawn(async move {
        let mut reader = BufReader::new(stderr);
        let mut line = String::new();
        loop {
            line.clear();
            let n = match reader.read_line(&mut line).await { Ok(n) => n, Err(_) => break };
            if n == 0 { break; }
            let l = line.trim().to_string();
            if !l.is_empty() { let mut s = status.lock().unwrap(); s.error = Some(l); }
        }
    });
    let init_params = serde_json::json!({"cwd": params.cwd, "provider": params.provider, "model": params.model, "maxTokens": params.max_tokens});
    {
        let _ = rpc_req(&state.stdin, &state.pending, "initialize", init_params).await;
    }
    let mut st = state.status.lock().unwrap();
    st.connected = true; st.error = None;
    st.provider = params.provider.clone(); st.model = params.model.clone();
    Ok(st.clone())
}
#[tauri::command]
async fn send_prompt(state: tauri::State<'_, AppContext>, params: PromptParams) -> Result<PromptResult, String> {
    let cb = serde_json::json!([{"type":"text","text":params.content}]);
    let p = serde_json::json!({"sessionId":params.session_id,"contentBlocks":cb});
    let resp = rpc_req(&state.stdin, &state.pending, "session/prompt", p).await?;
    let msg_id = resp.get("result").and_then(|r| r.get("messageId")).and_then(|x| x.as_str()).unwrap_or("").to_string();
    Ok(PromptResult{message_id: msg_id})
}

#[tauri::command]
async fn get_status(state: tauri::State<'_, AppContext>) -> Result<RuntimeStatus, String> { Ok(state.status.lock().unwrap().clone()) }

#[tauri::command]
async fn shutdown_runtime(state: tauri::State<'_, AppContext>) -> Result<(), String> {
    let _ = rpc_req(&state.stdin, &state.pending, "shutdown", serde_json::Value::Null).await;
    { let mut child = state.child.lock().await; if let Some(c) = child.as_mut() { let _ = c.wait().await; } *child = None; }
    *state.stdin.lock().await = None;
    let mut st = state.status.lock().unwrap();
    st.connected = false; st.error = Some("shutdown".to_string());
    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(AppContext{
            stdin: TMutex::new(None), child: TMutex::new(None),
            pending: Arc::new(Mutex::new(HashMap::new())),
            status: Arc::new(Mutex::new(RuntimeStatus::default())),
        })
        .setup(|app| { let _ = app.handle().emit("runtime:ready", ""); Ok(()) })
        .invoke_handler(tauri::generate_handler![init_runtime, send_prompt, get_status, shutdown_runtime])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}