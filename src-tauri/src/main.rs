use std::sync::Mutex;
use std::time::Duration;
use tauri::Manager;
use tauri_plugin_shell::{process::CommandChild, ShellExt};

struct SidecarChild(Mutex<Option<CommandChild>>);

#[tauri::command]
fn select_folder(app: tauri::AppHandle) -> Option<String> {
    use tauri_plugin_dialog::{DialogExt, FilePath};
    let path: Option<FilePath> = app.dialog().file().blocking_pick_folder();
    path.map(|p| p.to_string())
}

fn wait_for_server(url: &str, timeout_secs: u64) -> bool {
    let timeout = Duration::from_secs(timeout_secs);
    let start = std::time::Instant::now();
    loop {
        if start.elapsed() > timeout {
            return false;
        }
        if let Ok(resp) = ureq::get(url).timeout(Duration::from_secs(2)).call() {
            if resp.status() == 200 {
                return true;
            }
        }
        std::thread::sleep(Duration::from_millis(200));
    }
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let is_dev = cfg!(debug_assertions);

            if !is_dev {
                // Find a free port dynamically
                let port = portpicker::pick_unused_port().unwrap_or(8000);
                let url = format!("http://127.0.0.1:{}", port);

                let shell = app.shell();
                let sidecar_command = shell.sidecar("bangla-typer-server")?
                    .args(["--port", &port.to_string()]); // Pass port to Python backend
                
                let (_rx, child) = sidecar_command.spawn()?;
                app.manage(SidecarChild(Mutex::new(Some(child))));

                let window = app.get_webview_window("main").unwrap();
                let loading_html = r#"<html><body style="display:flex;align-items:center;justify-content:center;height:100vh;background:#1a1b26;margin:0;">
                    <div style="color:#a9b1d6;font-family:system-ui;font-size:1.2rem;">Starting Bangla Typer...</div>
                </body></html>"#;
                window.eval(&format!(
                    "document.open(); document.write({}); document.close();",
                    serde_json::to_string(loading_html).unwrap()
                ))?;

                let window_clone = window.clone();
                std::thread::spawn(move || {
                    if wait_for_server(&url, 30) {
                        let _ = window_clone.navigate(url.parse().unwrap());
                    }
                });
            }

            // Mark as standalone mode so the app knows it's running in Tauri
            let window = app.get_webview_window("main").unwrap();
            let _ = window.eval("document.body.classList.add('is-standalone'); window.__IS_TAURI__ = true;");

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                if let Some(state) = window.app_handle().try_state::<SidecarChild>() {
                    if let Some(child) = state.0.lock().unwrap().take() {
                        let _ = child.kill();
                    }
                }
            }
        })
        .invoke_handler(tauri::generate_handler![select_folder])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            if let tauri::RunEvent::ExitRequested { .. } = event {
                if let Some(state) = app_handle.try_state::<SidecarChild>() {
                    if let Some(child) = state.0.lock().unwrap().take() {
                        let _ = child.kill();
                    }
                }
            }
        });
}

fn main() {
    run();
}
