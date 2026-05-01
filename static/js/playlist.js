/* ══════════════════════════════════════
   PLAYLIST FEATURE — playlist.js
   Depends on: app.js (ALL_VIDEOS, switchYTMainTab, showScreen, etc.)
══════════════════════════════════════ */
console.log("Playlist Features Module Loaded");

// ──────────────────────────────────────
// State
// ──────────────────────────────────────
let selectedVideoIds = new Set();
let isSelectionMode = false;
let allPlaylists = [];
let currentPlaylistId = null;

// ──────────────────────────────────────
// Init — patch the existing switchYTMainTab to add 'playlist' handling
// ──────────────────────────────────────
const _origSwitchYTMainTab = window.switchYTMainTab;
window.switchYTMainTab = function(tab) {
    if (tab === 'playlist') {
        // Manually handle the tab activation for library/stats
        ['library', 'stats'].forEach(t => {
            const btn = document.getElementById(`yt-tab-${t}`);
            if (btn) btn.classList.remove('active');
        });
        document.getElementById('yt-tab-playlist').classList.add('active');

        // Hide all screens then show playlist screen
        document.querySelectorAll('#app-youtube .screen').forEach(s => s.classList.remove('active'));
        document.getElementById('screen-playlist').classList.add('active');
        loadPlaylists();
    } else {
        // Remove playlist tab active state if switching away
        const plTab = document.getElementById('yt-tab-playlist');
        if (plTab) plTab.classList.remove('active');
        _origSwitchYTMainTab(tab);
    }
};

// ──────────────────────────────────────
// Patch renderLibrary to inject selection checkboxes after each render
// Uses polling because playlist.js loads immediately after app.js
// ──────────────────────────────────────
(function patchRenderLibrary() {
    let attempts = 0;
    const interval = setInterval(() => {
        attempts++;
        if (typeof window.renderLibrary === 'function') {
            const orig = window.renderLibrary;
            window.renderLibrary = function() {
                orig.apply(this, arguments);
                addSelectionCheckboxesToCards();
            };
            // Run once immediately in case library was already rendered
            addSelectionCheckboxesToCards();
            clearInterval(interval);
        }
        if (attempts > 100) clearInterval(interval);
    }, 50);
})();


function addSelectionCheckboxesToCards() {
    const grid = document.getElementById('video-grid');
    if (!grid) return;

    grid.querySelectorAll('.video-card').forEach(card => {
        if (card.querySelector('.video-card-select')) return; // already added

        const checkbox = document.createElement('div');
        checkbox.className = 'video-card-select';
        checkbox.innerHTML = '✓';
        checkbox.title = 'নির্বাচন করুন';
        checkbox.addEventListener('click', (e) => {
            e.stopPropagation();
            const vid = getVidFromCard(card);
            if (vid) toggleVideoSelection(vid, card, checkbox);
        });
        
        // Add a click listener to the card for selection mode
        card.addEventListener('click', (e) => {
            if (isSelectionMode) {
                e.stopPropagation();
                e.preventDefault();
                const vid = getVidFromCard(card);
                if (vid) toggleVideoSelection(vid, card, checkbox);
            }
        }, true); // Use capture phase to intercept before app.js onclick

        card.style.position = 'relative';
        card.appendChild(checkbox);
    });

    // Re-apply selection state
    syncSelectionUI();
}

function toggleVideoSelection(vid, card, checkbox) {
    if (selectedVideoIds.has(vid)) {
        selectedVideoIds.delete(vid);
        card.classList.remove('selected');
        checkbox.classList.remove('selected');
    } else {
        selectedVideoIds.add(vid);
        card.classList.add('selected');
        checkbox.classList.add('selected');

        if (!isSelectionMode) {
            isSelectionMode = true;
            document.body.classList.add('selection-mode');
        }
    }

    if (selectedVideoIds.size === 0) {
        exitSelectionMode();
    } else {
        updateSelectionToolbar();
    }
}

function updateSelectionToolbar() {
    const toolbar = document.getElementById('selection-toolbar');
    const countEl = document.getElementById('selection-count');
    if (!toolbar) return;

    if (selectedVideoIds.size > 0) {
        toolbar.style.display = 'block';
        countEl.textContent = selectedVideoIds.size;
    } else {
        toolbar.style.display = 'none';
    }
}

function syncSelectionUI() {
    const grid = document.getElementById('video-grid');
    if (!grid) return;
    grid.querySelectorAll('.video-card').forEach(card => {
        const editBtn = card.querySelector('.video-card-btn.edit');
        if (!editBtn) return;
        const onclickStr = editBtn.getAttribute('onclick') || '';
        const match = onclickStr.match(/editVideo\('(.+?)'\)/);
        if (!match) return;
        const vid = match[1];
        const checkbox = card.querySelector('.video-card-select');
        if (selectedVideoIds.has(vid)) {
            card.classList.add('selected');
            if (checkbox) checkbox.classList.add('selected');
        } else {
            card.classList.remove('selected');
            if (checkbox) checkbox.classList.remove('selected');
        }
    });
}

function exitSelectionMode() {
    isSelectionMode = false;
    document.body.classList.remove('selection-mode');
    selectedVideoIds.clear();
    updateSelectionToolbar();
    syncSelectionUI();
}

function clearSelection() {
    exitSelectionMode();
}

function getVidFromCard(card) {
    const editBtn = card.querySelector('.video-card-btn.edit');
    if (!editBtn) return null;
    const onclickStr = editBtn.getAttribute('onclick') || '';
    const match = onclickStr.match(/editVideo\('(.+?)'\)/);
    return match ? match[1] : null;
}

// ──────────────────────────────────────
// Playlist API helpers
// ──────────────────────────────────────
async function fetchPlaylists() {
    const res = await fetch('/api/playlists');
    return res.json();
}

async function fetchPlaylist(pid) {
    const res = await fetch(`/api/playlists/${pid}`);
    return res.json();
}

async function apiCreatePlaylist(name, videoIds) {
    const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, video_ids: videoIds })
    });
    return res.json();
}

async function apiAddVideos(pid, videoIds) {
    const res = await fetch(`/api/playlists/${pid}/videos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_ids: videoIds })
    });
    return res.json();
}

async function apiRemoveVideo(pid, vid) {
    await fetch(`/api/playlists/${pid}/videos/${encodeURIComponent(vid)}`, { method: 'DELETE' });
}

async function apiDeletePlaylist(pid) {
    await fetch(`/api/playlists/${pid}`, { method: 'DELETE' });
}

async function apiRenamePlaylist(pid, name) {
    await fetch(`/api/playlists/${pid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
    });
}

// ──────────────────────────────────────
// Playlist screen
// ──────────────────────────────────────
async function loadPlaylists() {
    allPlaylists = await fetchPlaylists();
    renderPlaylistGrid();
}

function renderPlaylistGrid() {
    const grid = document.getElementById('playlist-grid');
    const empty = document.getElementById('playlist-empty');
    if (!grid) return;
    grid.innerHTML = '';

    if (allPlaylists.length === 0) {
        if (empty) empty.style.display = 'block';
        return;
    }
    if (empty) empty.style.display = 'none';

    allPlaylists.forEach(pl => {
        const card = document.createElement('div');
        card.className = 'video-card playlist-card'; // Use base styling from video-card
        
        // Thumbnail handling: custom or 2x2 collage
        let thumbHtml = '';
        if (pl.thumb_path) {
            const encoded = pl.thumb_path.split('/').map(encodeURIComponent).join('/');
            thumbHtml = `
                <div class="playlist-collage video-thumb" style="display:block">
                    <img src="/thumbs/${encoded}" loading="lazy" style="width:100%;height:100%;object-fit:cover;" onerror="this.outerHTML='<div class=\\'collage-placeholder\\'>▶</div>'">
                </div>
            `;
        } else {
            // Build 2x2 grid using first 4 videos' thumbs
            const topVids = (pl.video_ids || []).slice(0, 4);
            let cells = '';
            for (let i = 0; i < 4; i++) {
                if (i < topVids.length) {
                    const vid = topVids[i];
                    const v = (window.ALL_VIDEOS || []).find(x => x.id === vid);
                    if (v && v.thumb_path) {
                        const encodedPath = v.thumb_path.split('/').map(encodeURIComponent).join('/');
                        cells += `<img src="/thumbs/${encodedPath}" loading="lazy" onerror="this.outerHTML='<div class=\\'collage-placeholder\\'>▶</div>'">`;
                    } else {
                        cells += `<div class="collage-placeholder">▶</div>`;
                    }
                } else {
                    cells += `<div class="collage-placeholder"></div>`;
                }
            }
            thumbHtml = `<div class="playlist-collage video-thumb">${cells}</div>`;
        }
        
        card.innerHTML = `
            ${thumbHtml}
            <div class="video-info">
                <div>
                    <div class="video-title">${escapeHtml(pl.name)}</div>
                </div>
                <div class="video-meta-row">
                    <span class="video-parts">${toBn(pl.video_count)} টি ভিডিও</span>
                </div>
            </div>
            <div class="video-card-actions">
                <button class="video-card-btn edit" title="Edit" onclick="event.stopPropagation(); window.openEditPlaylistModal('${pl.playlist_id}')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                </button>
                <button class="video-card-btn delete" title="Delete" onclick="event.stopPropagation(); deletePlaylist('${pl.playlist_id}')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        <line x1="10" y1="11" x2="10" y2="17"/>
                        <line x1="14" y1="11" x2="14" y2="17"/>
                    </svg>
                </button>
            </div>
        `;
        
        card.addEventListener('click', () => openPlaylistDetail(pl.playlist_id));
        grid.appendChild(card);
    });
}

async function openPlaylistDetail(pid) {
    currentPlaylistId = pid;
    const pl = await fetchPlaylist(pid);
    document.getElementById('pl-detail-name').textContent = pl.name;
    document.getElementById('pl-detail-title').textContent = '🎵 ' + pl.name;

    document.querySelectorAll('#app-youtube .screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-playlist-detail').classList.add('active');
    renderPlaylistDetailCards(pl);
}

function renderPlaylistDetailCards(pl) {
    const grid = document.getElementById('pl-video-grid');
    const empty = document.getElementById('pl-detail-empty');
    if (!grid) return;
    grid.innerHTML = '';

    const videoIds = pl.video_ids || [];
    if (videoIds.length === 0) {
        if (empty) empty.style.display = 'block';
        return;
    }
    if (empty) empty.style.display = 'none';

    videoIds.forEach(vid => {
        const v = (window.ALL_VIDEOS || []).find(x => x.id === vid);
        if (!v) return;

        const encodedPath = v.thumb_path ? v.thumb_path.split('/').map(encodeURIComponent).join('/') : '';
        const thumbHtml = encodedPath
            ? `<img class="video-thumb" src="/thumbs/${encodedPath}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="video-thumb-placeholder" style="display:none">▶</div>`
            : `<div class="video-thumb-placeholder">▶</div>`;

        const channelDisplay = v.source === 'YouTube' ? `<div class="video-channel">${v.channel}</div>` : '';
        const totalWordsBn = typeof toBn === 'function' ? toBn((v.total_words || 0).toLocaleString('en-US')) : (v.total_words || 0);

        const card = document.createElement('div');
        card.className = 'video-card';
        card.style.position = 'relative';
        card.innerHTML = `
            ${thumbHtml}
            <div class="video-info">
                <div>
                    <div class="video-title">${v.title}</div>
                    ${channelDisplay}
                </div>
                <div class="video-meta-row">
                    <span class="video-parts">${totalWordsBn} শব্দ</span>
                </div>
            </div>
            <div class="video-card-actions">
                <button class="video-card-btn remove-from-playlist" title="প্লেলিস্ট থেকে সরান" onclick="event.stopPropagation(); removeVideoFromCurrentPlaylist('${vid}')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
        `;
        card.addEventListener('click', () => {
            if (typeof openDetail === 'function') openDetail(vid);
        });
        grid.appendChild(card);
    });
}

function showPlaylistScreen() {
    document.querySelectorAll('#app-youtube .screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-playlist').classList.add('active');
    // Update tab active state
    ['library', 'stats'].forEach(t => {
        const btn = document.getElementById(`yt-tab-${t}`);
        if (btn) btn.classList.remove('active');
    });
    const plTab = document.getElementById('yt-tab-playlist');
    if (plTab) plTab.classList.add('active');
    loadPlaylists();
}

// ──────────────────────────────────────
// Modals
// ──────────────────────────────────────
function closeModal(id) {
    document.getElementById(id).classList.remove('open');
}

function openAddToPlaylistModal() {
    if (selectedVideoIds.size === 0) return;
    // Populate existing playlists
    const list = document.getElementById('existing-playlists-list');
    list.innerHTML = '';

    if (allPlaylists.length === 0) {
        // Directly open new playlist modal
        openNewPlaylistModal();
        return;
    }

    allPlaylists.forEach(pl => {
        const item = document.createElement('div');
        item.className = 'playlist-pick-item';
        item.innerHTML = `
            <span class="pl-icon">🎵</span>
            <span class="pl-name">${escapeHtml(pl.name)}</span>
            <span class="pl-count">${pl.video_count} টি</span>
        `;
        item.addEventListener('click', () => addToExistingPlaylist(pl.playlist_id));
        list.appendChild(item);
    });

    document.getElementById('modal-add-to-playlist').classList.add('open');
}

function switchToNewPlaylistModal() {
    closeModal('modal-add-to-playlist');
    openNewPlaylistModal();
}

function openNewPlaylistModal() {
    document.getElementById('new-playlist-name-input').value = '';
    // Update description based on context
    const descEl = document.querySelector('#modal-new-playlist .modal-desc');
    if (descEl) {
        if (selectedVideoIds.size > 0) {
            descEl.textContent = `নির্বাচিত ${selectedVideoIds.size} টি ভিডিও এই নতুন প্লেলিস্টে যোগ হবে।`;
        } else {
            descEl.textContent = 'একটি নতুন খালি প্লেলিস্ট তৈরি করুন।';
        }
    }
    document.getElementById('modal-new-playlist').classList.add('open');
    setTimeout(() => document.getElementById('new-playlist-name-input').focus(), 100);
}

// Called from the playlist screen's "নতুন প্লেলিস্ট" button
window.openNewPlaylistModal = openNewPlaylistModal;

async function createNewPlaylist() {
    console.log("createNewPlaylist called");
    const nameInput = document.getElementById('new-playlist-name-input');
    const name = nameInput.value.trim();
    if (!name) {
        nameInput.focus();
        nameInput.style.borderColor = 'var(--wrong)';
        return;
    }
    nameInput.style.borderColor = '';

    try {
        const videoIds = Array.from(selectedVideoIds);
        console.log("Creating playlist with videos:", videoIds);
        const result = await apiCreatePlaylist(name, videoIds);
        console.log("API Result:", result);
        
        if (result.status === 'ok') {
            closeModal('modal-new-playlist');
            if (videoIds.length > 0) exitSelectionMode();
            showToast(`✅ "${name}" প্লেলিস্ট তৈরি হয়েছে!`);
            await loadPlaylists();
        } else {
            showToast(`❌ ভুল হয়েছে: ${result.error || 'Unknown error'}`);
        }
    } catch (err) {
        console.error("Failed to create playlist:", err);
        showToast(`❌ সার্ভারে যান্ত্রিক সমস্যা হয়েছে।`);
    }
}
window.createNewPlaylist = createNewPlaylist;

async function addToExistingPlaylist(pid) {
    closeModal('modal-add-to-playlist');
    const videoIds = [...selectedVideoIds];
    await apiAddVideos(pid, videoIds);
    exitSelectionMode();
    const pl = allPlaylists.find(p => p.playlist_id === pid);
    showToast(`✅ ${videoIds.length} টি ভিডিও "${pl ? pl.name : 'প্লেলিস্ট'}" এ যোগ হয়েছে!`);
    await loadPlaylists();
}

async function removeVideoFromCurrentPlaylist(vid) {
    if (!currentPlaylistId) return;
    await apiRemoveVideo(currentPlaylistId, vid);
    const updated = await fetchPlaylist(currentPlaylistId);
    document.getElementById('pl-detail-name').textContent = updated.name;
    renderPlaylistDetailCards(updated);
    showToast('✅ ভিডিও প্লেলিস্ট থেকে সরানো হয়েছে।');
    loadPlaylists();
}

async function deletePlaylist(pid) {
    await apiDeletePlaylist(pid);
    showToast('🗑 প্লেলিস্ট মুছে ফেলা হয়েছে।');
    await loadPlaylists();
}

async function deleteCurrentPlaylist() {
    if (!currentPlaylistId) return;
    const pl = allPlaylists.find(p => p.playlist_id === currentPlaylistId);
    await apiDeletePlaylist(currentPlaylistId);
    currentPlaylistId = null;
    showToast(`🗑 "${pl ? pl.name : 'প্লেলিস্ট'}" মুছে ফেলা হয়েছে।`);
    showPlaylistScreen();
}

let editPlThumbData = null;
let editPlThumbExt = null;

function handleEditPlaylistThumbnailSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const base64 = e.target.result.split(',')[1];
        editPlThumbData = base64;
        editPlThumbExt = '.' + file.name.split('.').pop().toLowerCase();

        // Preview the new thumbnail
        const thumbPreview = document.getElementById('edit-pl-thumb-preview');
        const thumbPlaceholder = document.getElementById('edit-pl-thumb-placeholder');
        thumbPreview.src = e.target.result;
        thumbPreview.style.display = 'block';
        thumbPlaceholder.style.display = 'none';
    };
    reader.readAsDataURL(file);
}
window.handleEditPlaylistThumbnailSelect = handleEditPlaylistThumbnailSelect;

async function openEditPlaylistModal(pid = null) {
    const targetPid = pid || currentPlaylistId;
    if (!targetPid) return;
    
    // Fetch latest to get thumb and name
    const pl = await fetchPlaylist(targetPid);
    if (pl.error) return;
    
    document.getElementById('edit-playlist-id').value = targetPid;
    document.getElementById('edit-playlist-name-input').value = pl.name || '';
    
    // Set thumbnail preview
    const thumbPreview = document.getElementById('edit-pl-thumb-preview');
    const thumbPlaceholder = document.getElementById('edit-pl-thumb-placeholder');

    if (pl.thumb_path) {
        thumbPreview.src = `/thumbs/${pl.thumb_path.split('/').map(encodeURIComponent).join('/')}`;
        thumbPreview.style.display = 'block';
        thumbPlaceholder.style.display = 'none';
    } else {
        thumbPreview.style.display = 'none';
        thumbPlaceholder.style.display = 'flex';
        thumbPreview.src = '';
    }

    // Reset stored thumbnail data
    editPlThumbData = null;
    editPlThumbExt = null;

    document.getElementById('modal-edit-playlist').classList.add('open');
    setTimeout(() => document.getElementById('edit-playlist-name-input').focus(), 100);
}

async function confirmEditPlaylist() {
    const pid = document.getElementById('edit-playlist-id').value;
    const nameInput = document.getElementById('edit-playlist-name-input');
    const name = nameInput.value.trim();
    if (!name) {
        nameInput.focus();
        nameInput.style.borderColor = 'var(--wrong)';
        return;
    }
    nameInput.style.borderColor = '';

    const body = { name: name };
    if (editPlThumbData && editPlThumbExt) {
        body.thumbnail_base64 = editPlThumbData;
        body.thumbnail_ext = editPlThumbExt;
    }

    try {
        const res = await fetch(`/api/playlists/${pid}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        
        if (res.ok && data.status === 'ok') {
            closeModal('modal-edit-playlist');
            if (currentPlaylistId === pid) {
                document.getElementById('pl-detail-name').textContent = name;
                document.getElementById('pl-detail-title').textContent = '🎵 ' + name;
            }
            showToast(`✅ প্লেলিস্ট আপডেট হয়েছে: "${name}"`);
            await loadPlaylists();
        } else {
            showToast(`❌ আপডেট ব্যর্থ হয়েছে: ${data.error || 'Unknown error'}`);
        }
    } catch (e) {
        console.error('Error updating playlist:', e);
        showToast(`❌ সার্ভারে যান্ত্রিক সমস্যা হয়েছে।`);
    }
}



// ──────────────────────────────────────
// Utility
// ──────────────────────────────────────
window.switchToNewPlaylistModal = switchToNewPlaylistModal;
window.openAddToPlaylistModal = openAddToPlaylistModal;
window.addToExistingPlaylist = addToExistingPlaylist;
window.removeVideoFromCurrentPlaylist = removeVideoFromCurrentPlaylist;
window.deletePlaylist = deletePlaylist;
window.deleteCurrentPlaylist = deleteCurrentPlaylist;
window.openEditPlaylistModal = openEditPlaylistModal;
window.confirmEditPlaylist = confirmEditPlaylist;
window.showPlaylistScreen = showPlaylistScreen;
window.clearSelection = clearSelection;
window.closeModal = closeModal;

function escapeHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}


// ──────────────────────────────────────
// Wire up keyboard: Escape exits selection mode
// ──────────────────────────────────────
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isSelectionMode) {
        exitSelectionMode();
    }
});

// (patching is done at the top of the file)
