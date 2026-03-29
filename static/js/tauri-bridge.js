/**
 * Tauri v2 Bridge - Minimal, native decorations handle window controls.
 */
(function() {
    document.body.classList.add('is-standalone');
    window.nativeBridge = {
        close_window: function() {},
        minimize_window: function() {},
        toggle_fullscreen: function() {},
        select_folder: function() {
            alert('Folder selection is temporarily unavailable.');
            return Promise.resolve(null);
        },
        isStandalone: true
    };
})();
