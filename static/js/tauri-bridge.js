/**
 * Tauri v2 Bridge - Minimal, native decorations handle window controls.
 */
(function() {
    document.body.classList.add('is-standalone');
    
    // Tauri v2 Bridge implementation
    const tauri = window.__TAURI__;
    
    window.nativeBridge = {
        close_window: function() {
            if (tauri && tauri.window) {
                tauri.window.getCurrentWindow().close();
            }
        },
        minimize_window: function() {
            if (tauri && tauri.window) {
                tauri.window.getCurrentWindow().minimize();
            }
        },
        toggle_fullscreen: function() {
            if (tauri && tauri.window) {
                const win = tauri.window.getCurrentWindow();
                win.isMaximized().then(maximized => {
                    if (maximized) win.unmaximize();
                    else win.maximize();
                });
            }
        },
        select_folder: function() {
            if (tauri && tauri.dialog) {
                return tauri.dialog.open({
                    directory: true,
                    multiple: false,
                    title: 'Select Data Directory'
                });
            } else {
                if (window.showToast) {
                    window.showToast('Folder selection is not available in browser mode.');
                }
                return Promise.resolve(null);
            }
        },
        isStandalone: true
    };
})();
