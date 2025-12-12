(function() {
    console.clear();
    console.log("%c🚀 STARTING AGGRESSIVE SIDEBAR MANAGER...", "background: red; color: white; font-weight: bold; padding: 4px;");

    const CONFIG = {
        PANEL_TITLE: "Sidebar Manager",
        API_BASE: "https://theme-customizer-production.up.railway.app/api", 
        AUTH_TOKEN: window.TOKEN || "" 
    };

    // Global State
    let CACHED_STATE = {
        order: [],
        hidden: [],
        isLoaded: false
    };

    let isApplying = false;

    // ================= 1. HELPERS =================
    function getLocationId() {
        const match = window.location.pathname.match(/\/location\/([a-zA-Z0-9]+)/);
        return (match && match[1]) ? match[1] : 'qzPk2iMXCzGuEt5FA6Ll'; 
    }

    function findSidebar() {
        // Broad search to catch it even if GHL changes IDs
        return document.querySelector('#sidebar-v2 nav') || 
               document.querySelector('.sidebar-v2-location nav') ||
               document.querySelector('.hl_nav-header nav') ||
               document.querySelector('nav'); 
    }

    function getLabel(el) {
        const textNode = el.querySelector('span, div');
        return textNode ? textNode.innerText.trim() : (el.innerText.trim() || el.id);
    }

    // ================= 2. API FUNCTIONS (FIXED PARSING) =================
    async function fetchMenuData() {
        const url = `${CONFIG.API_BASE}/side-menu/${getLocationId()}?t=${Date.now()}`;
        console.log(`📥 Fetching: ${url}`);

        try {
            const res = await fetch(url, {
                headers: { 'Content-Type': 'application/json', 'x-theme-key': CONFIG.AUTH_TOKEN }
            });
            
            if (res.status === 404) return;

            const raw = await res.json();
            console.log("📦 RAW RESPONSE:", raw);

            // ✅ SPECIFIC PARSING FOR YOUR RESPONSE STRUCTURE
            let newOrder = [];
            let newHidden = [];

            if (raw.sideMenuContent) {
                newOrder = raw.sideMenuContent.order || [];
                newHidden = raw.sideMenuContent.hidden || [];
            } else if (raw.order) {
                newOrder = raw.order;
                newHidden = raw.hidden;
            }

            // Update Cache
            CACHED_STATE.order = newOrder;
            CACHED_STATE.hidden = newHidden;
            CACHED_STATE.isLoaded = true;

            console.log("✅ State Loaded:", CACHED_STATE);

            // Force Apply Immediately
            const nav = findSidebar();
            if(nav) applyDOMChanges(nav);

        } catch (err) {
            console.error("API Error:", err);
        }
    }

    function postMenuData(order, hidden) {
        // Update Local Cache Optimistically
        CACHED_STATE.order = order;
        CACHED_STATE.hidden = hidden;
        CACHED_STATE.isLoaded = true;

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
        if(!confirm("Reset layout?")) return;
        fetch(`${CONFIG.API_BASE}/side-menu/${getLocationId()}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', 'x-theme-key': CONFIG.AUTH_TOKEN }
        }).then(() => location.reload());
    }

    // ================= 3. DOM ENFORCER (PERMANENT) =================
    function applyDOMChanges(nav) {
        if (!CACHED_STATE.isLoaded || !nav || isApplying) return;

        // Don't do anything if we have no config
        if (CACHED_STATE.order.length === 0 && CACHED_STATE.hidden.length === 0) return;

        isApplying = true;

        const { order, hidden } = CACHED_STATE;

        // 1. REORDERING
        // We iterate through our saved order and append elements to the end.
        // This effectively sorts them without needing complex logic.
        order.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                // Determine the movable container (usually the LI)
                const container = el.closest('li') || el.closest('a') || el;
                // Only move if it's currently inside the nav
                if (container.parentElement === nav) {
                    nav.appendChild(container);
                }
            }
        });

        // 2. VISIBILITY (Force Hiding)
        // First, ensure non-hidden items are visible (fix for potential GHL flickering)
        nav.querySelectorAll('li, a').forEach(el => {
            if(el.id && !hidden.includes(el.id)) {
                el.style.display = ''; 
            }
        });

        // Now hide the items in our blacklist
        hidden.forEach(id => {
            const el = document.getElementById(id);
            if(el) {
                const container = el.closest('li') || el.closest('a') || el;
                container.style.display = 'none';
            }
        });

        // Unlock after short delay
        setTimeout(() => isApplying = false, 50);
    }

    // ================= 4. UI PANEL =================
    function createPanel(nav) {
        const existing = document.getElementById("ghl-sidebar-manager");
        if (existing) existing.remove();

        const panel = document.createElement("div");
        panel.id = "ghl-sidebar-manager";
        panel.style.cssText = `
            position: fixed; top: 100px; right: 20px; width: 280px; 
            background: white; border: 2px solid #3b82f6; z-index: 99999999; 
            padding: 16px; border-radius: 8px; box-shadow: 0 10px 50px rgba(0,0,0,0.3);
            font-family: sans-serif; max-height: 80vh; overflow-y: auto;
        `;
        
        panel.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
                <h3 style="margin:0; font-size:15px; font-weight:bold;">${CONFIG.PANEL_TITLE}</h3>
                <button id="ghl-close-btn" style="border:none; bg:transparent; cursor:pointer;">❌</button>
            </div>
            <ul id="ghl-sort-list" style="list-style:none; padding:0; margin:0;"></ul>
            <div style="display:flex; gap:10px; margin-top:15px;">
                <button id="ghl-save-btn" style="flex:1; padding:8px; background:#3b82f6; color:white; border:none; border-radius:4px; cursor:pointer;">Save</button>
                <button id="ghl-reset-btn" style="width:30%; padding:8px; background:#ef4444; color:white; border:none; border-radius:4px; cursor:pointer;">Reset</button>
            </div>
        `;
        document.body.appendChild(panel);

        const list = panel.querySelector("#ghl-sort-list");
        const items = Array.from(nav.querySelectorAll('li, a')).filter(el => el.id && (el.id.includes('sb_') || el.id.includes('menu')));

        items.forEach(el => {
            const isHidden = CACHED_STATE.hidden.includes(el.id);
            const li = document.createElement("li");
            li.dataset.id = el.id;
            li.draggable = true;
            li.style.cssText = `
                padding: 10px; margin-bottom: 5px; border-radius: 4px;
                background: ${isHidden ? '#fee2e2' : '#f3f4f6'};
                border: 1px solid #e5e7eb; display: flex; justify-content: space-between; cursor: move;
            `;
            li.innerHTML = `
                <span style="font-size:13px; font-weight:500; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; max-width:180px;">${getLabel(el)}</span>
                <button class="toggle-eye" style="border:none; background:transparent; cursor:pointer;">${isHidden ? '🙈' : '👁️'}</button>
            `;
            
            li.querySelector('.toggle-eye').addEventListener('click', (e) => {
                const btn = e.target;
                const hide = btn.innerText === '👁️';
                btn.innerText = hide ? '🙈' : '👁️';
                li.style.background = hide ? '#fee2e2' : '#f3f4f6';
                
                // Realtime Preview
                const domEl = document.getElementById(el.id);
                const container = domEl ? (domEl.closest('li') || domEl) : null;
                if(container) container.style.display = hide ? 'none' : '';
            });

            li.addEventListener('dragstart', () => li.classList.add('dragging'));
            li.addEventListener('dragend', () => li.classList.remove('dragging'));
            list.appendChild(li);
        });

        // Drag Logic
        list.addEventListener('dragover', e => {
            e.preventDefault();
            const dragging = list.querySelector('.dragging');
            const siblings = [...list.querySelectorAll('li:not(.dragging)')];
            const next = siblings.find(sib => e.clientY <= sib.getBoundingClientRect().top + sib.offsetHeight / 2);
            list.insertBefore(dragging, next);
        });

        // Actions
        document.getElementById('ghl-save-btn').addEventListener('click', () => {
            const newOrder = [...list.querySelectorAll('li')].map(li => li.dataset.id);
            const newHidden = [...list.querySelectorAll('li')].filter(li => li.querySelector('.toggle-eye').innerText === '🙈').map(li => li.dataset.id);
            postMenuData(newOrder, newHidden);
            applyDOMChanges(nav);
        });
        document.getElementById('ghl-close-btn').addEventListener('click', () => panel.remove());
        document.getElementById('ghl-reset-btn').addEventListener('click', resetMenuData);
    }

    // ================= 5. MAIN EXECUTION =================
    
    // We use an interval to "catch" the sidebar whenever GHL renders it
    setInterval(async () => {
        const nav = findSidebar();

        if (nav) {
            // 1. Initial Data Load (Only once)
            if (!CACHED_STATE.isLoaded) {
                console.log("✅ Sidebar detected. Initializing...");
                await fetchMenuData();
                applyDOMChanges(nav);
                createPanel(nav);

                // 2. Start the PERMANENT Watchdog
                // This Observer will fire EVERY time GHL changes the sidebar DOM
                const observer = new MutationObserver(() => {
                    if (!isApplying) {
                        // console.log("GHL reset sidebar -> Re-applying our order...");
                        applyDOMChanges(nav);
                    }
                });
                observer.observe(nav, { childList: true, subtree: true });
            } 
            // 3. Constant Enforcement
            // Even if observer misses something, ensure order is correct every 2 seconds via this loop,
            // but only if we aren't currently dragging/applying.
            else if (!isApplying) {
                applyDOMChanges(nav);
            }
        }
    }, 1000); // Check every 1 second

})();