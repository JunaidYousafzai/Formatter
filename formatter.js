(function() {
    console.clear();
    console.log("🚀 Starting Persistent Sidebar Manager...");

    const CONFIG = {
        PANEL_TITLE: "Sidebar Manager",
        API_BASE: "https://theme-customizer-production.up.railway.app/api", 
        AUTH_TOKEN: window.TOKEN || "" 
    };

    // Store state globally within closure so we don't have to fetch API constantly
    let CACHED_STATE = {
        order: [],
        hidden: [],
        isLoaded: false
    };

    // ================= 1. HELPERS =================
    function getLocationId() {
        const match = window.location.pathname.match(/\/location\/([a-zA-Z0-9]+)/);
        return (match && match[1]) ? match[1] : 'qzPk2iMXCzGuEt5FA6Ll'; 
    }

    function findSidebar() {
        return document.querySelector('#sidebar-v2 nav') || 
               document.querySelector('.sidebar-v2-location nav') ||
               document.querySelector('.hl_nav-header nav');
    }

    function getLabel(el) {
        const textNode = el.querySelector('span, div');
        return textNode ? textNode.innerText.trim() : (el.innerText.trim() || el.id);
    }

    // ================= 2. API FUNCTIONS =================
    async function fetchMenuData() {
        try {
            const res = await fetch(`${CONFIG.API_BASE}/side-menu/${getLocationId()}`, {
                headers: { 'Content-Type': 'application/json', 'x-theme-key': CONFIG.AUTH_TOKEN }
            });
            if (res.status === 404) return { order: [], hidden: [] };
            const data = await res.json();
            
            // Update Cache
            CACHED_STATE.order = data.order || [];
            CACHED_STATE.hidden = data.hidden || [];
            CACHED_STATE.isLoaded = true;
            
            console.log("✅ Config Loaded:", CACHED_STATE);
            return CACHED_STATE;
        } catch (err) {
            console.warn("API Error, using cache or empty:", err);
            return CACHED_STATE;
        }
    }

    function postMenuData(order, hidden) {
        // Update Cache Immediately for UI responsiveness
        CACHED_STATE.order = order;
        CACHED_STATE.hidden = hidden;

        fetch(`${CONFIG.API_BASE}/side-menu/save/${getLocationId()}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-theme-key': CONFIG.AUTH_TOKEN },
            body: JSON.stringify({ order, hidden })
        }).then(() => {
            const btn = document.getElementById('ghl-save-btn');
            if(btn) { btn.innerText = "Saved! ✅"; setTimeout(() => btn.innerText = "Save Changes", 2000); }
        });
    }

    function resetMenuData() {
        if(!confirm("Reset sidebar to default?")) return;
        fetch(`${CONFIG.API_BASE}/side-menu/${getLocationId()}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', 'x-theme-key': CONFIG.AUTH_TOKEN }
        }).then(() => location.reload());
    }

    // ================= 3. DOM MANIPULATION (The Fix) =================
    function applyDOMChanges(nav) {
        if (!CACHED_STATE.isLoaded || !nav) return;

        const { order, hidden } = CACHED_STATE;

        // 1. Reorder
        if (order && order.length > 0) {
            order.forEach(id => {
                const el = document.getElementById(id);
                const container = el ? (el.closest('li') || el) : null;
                // Only move if it's not already at the bottom (optimization)
                if (container && container.parentElement === nav) {
                    nav.appendChild(container); 
                }
            });
        }

        // 2. Hide/Show
        nav.querySelectorAll('[id]').forEach(item => {
            // Filter valid items
            if(!item.id.includes('sb_') && !item.id.includes('menu')) return;
            
            const container = item.closest('li') || item;
            
            if (hidden.includes(item.id)) {
                container.style.display = 'none';
            } else {
                container.style.display = '';
            }
        });
    }

    // ================= 4. UI PANEL =================
    function createPanel(nav) {
        const existing = document.getElementById("ghl-sidebar-manager");
        if (existing) existing.remove();

        const panel = document.createElement("div");
        panel.id = "ghl-sidebar-manager";
        panel.style.cssText = `
            position: fixed; top: 100px; right: 20px; width: 300px;
            background: white; border: 1px solid #ccc; z-index: 99999999;
            padding: 16px; border-radius: 8px; box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            font-family: sans-serif; max-height: 80vh; overflow-y: auto;
        `;

        panel.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
                <h3 style="margin:0; font-size:16px; font-weight:bold;">${CONFIG.PANEL_TITLE}</h3>
                <button id="ghl-close-btn" style="border:none; bg:transparent; cursor:pointer;">❌</button>
            </div>
            <ul id="ghl-sort-list" style="list-style:none; padding:0; margin:0;"></ul>
            <div style="display:flex; gap:10px; margin-top:15px;">
                <button id="ghl-save-btn" style="flex:1; padding:8px; background:#3b82f6; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:bold;">Save Changes</button>
                <button id="ghl-reset-btn" style="width:30%; padding:8px; background:#ef4444; color:white; border:none; border-radius:4px; cursor:pointer;">Reset</button>
            </div>
        `;
        document.body.appendChild(panel);

        const list = panel.querySelector("#ghl-sort-list");
        const items = Array.from(nav.querySelectorAll('a[id], li[id]'))
            .filter(el => el.id && (el.id.includes('sb_') || el.id.includes('menu')));

        items.forEach(el => {
            const isHidden = CACHED_STATE.hidden.includes(el.id);
            const li = document.createElement("li");
            li.dataset.id = el.id;
            li.draggable = true;
            li.style.cssText = `
                padding: 10px; margin-bottom: 6px; border-radius: 6px;
                background: ${isHidden ? '#fee2e2' : '#f3f4f6'};
                border: 1px solid ${isHidden ? '#fecaca' : '#e5e7eb'};
                display: flex; justify-content: space-between; align-items: center;
                cursor: grab; transition: all 0.2s;
            `;
            
            li.innerHTML = `
                <span style="font-size:13px; font-weight:500;">${getLabel(el)}</span>
                <button class="toggle-eye" style="border:none; background:transparent; cursor:pointer; font-size:16px;">
                    ${isHidden ? '🙈' : '👁️'}
                </button>
            `;

            // Toggle Click
            li.querySelector('.toggle-eye').addEventListener('click', (e) => {
                const btn = e.target;
                const hide = btn.innerText === '👁️';
                btn.innerText = hide ? '🙈' : '👁️';
                li.style.background = hide ? '#fee2e2' : '#f3f4f6';
                li.style.borderColor = hide ? '#fecaca' : '#e5e7eb';
                
                // Immediate Preview
                const domEl = document.getElementById(el.id);
                const container = domEl ? (domEl.closest('li') || domEl) : null;
                if(container) container.style.display = hide ? 'none' : '';
            });

            // Drag Events
            li.addEventListener('dragstart', () => li.classList.add('dragging'));
            li.addEventListener('dragend', () => li.classList.remove('dragging'));

            list.appendChild(li);
        });

        // Drag Over Logic
        list.addEventListener('dragover', e => {
            e.preventDefault();
            const dragging = list.querySelector('.dragging');
            const siblings = [...list.querySelectorAll('li:not(.dragging)')];
            const next = siblings.find(sib => e.clientY <= sib.getBoundingClientRect().top + sib.offsetHeight / 2);
            list.insertBefore(dragging, next);
        });

        // Save
        document.getElementById('ghl-save-btn').addEventListener('click', () => {
            const newOrder = [...list.querySelectorAll('li')].map(li => li.dataset.id);
            const newHidden = [...list.querySelectorAll('li')]
                .filter(li => li.querySelector('.toggle-eye').innerText === '🙈')
                .map(li => li.dataset.id);
            
            postMenuData(newOrder, newHidden);
            applyDOMChanges(nav);
        });

        document.getElementById('ghl-close-btn').addEventListener('click', () => panel.remove());
        document.getElementById('ghl-reset-btn').addEventListener('click', resetMenuData);
    }

    // ================= 5. MAIN LOOP (Watchdog) =================
    // This loop runs continuously to find the sidebar AND re-apply changes if GHL refreshes the DOM
    let initComplete = false;

    setInterval(async () => {
        const nav = findSidebar();

        if (nav) {
            // 1. Initial Load (Runs once)
            if (!initComplete) {
                console.log("✅ Sidebar detected. Initializing...");
                await fetchMenuData(); // Load from API
                applyDOMChanges(nav);  // Apply immediately
                createPanel(nav);      // Draw UI
                initComplete = true;
            } 
            
            // 2. Watchdog: Re-apply if data is loaded but sidebar looks wrong
            // (e.g. GHL re-rendered the menu and reset the order)
            if (CACHED_STATE.isLoaded) {
               applyDOMChanges(nav);
            }
        }
    }, 500); // Check every 500ms

})();