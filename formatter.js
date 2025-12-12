(function() {
    console.clear();
    console.log("%c🚀 STARTING FINAL FIX (Structure Agnostic)...", "background: #7c3aed; color: white; padding: 4px; border-radius: 4px;");

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

    let isApplyingChanges = false;
    let sidebarObserver = null;

    // ================= 1. HELPERS =================
    function getLocationId() {
        const match = window.location.pathname.match(/\/location\/([a-zA-Z0-9]+)/);
        const loc = (match && match[1]) ? match[1] : 'qzPk2iMXCzGuEt5FA6Ll';
        return loc;
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

    // ================= 2. API FUNCTIONS (THE FIX) =================
    async function fetchMenuData() {
        const url = `${CONFIG.API_BASE}/side-menu/${getLocationId()}?t=${Date.now()}`; 
        
        try {
            const res = await fetch(url, {
                headers: { 'Content-Type': 'application/json', 'x-theme-key': CONFIG.AUTH_TOKEN }
            });
            
            if (res.status === 404) {
                console.warn("⚠️ No saved config found (404).");
                return; 
            }

            const rawData = await res.json();
            console.log("📥 RAW API RESPONSE:", rawData);

            // --- 🔎 INTELLIGENT DATA FINDER ---
            // Look for 'order' array anywhere in the response
            let foundOrder = [];
            let foundHidden = [];

            if (Array.isArray(rawData.order)) {
                foundOrder = rawData.order;
                foundHidden = rawData.hidden;
            } else if (rawData.data && Array.isArray(rawData.data.order)) {
                foundOrder = rawData.data.order;
                foundHidden = rawData.data.hidden;
            } else if (rawData.updatedMenu && Array.isArray(rawData.updatedMenu.order)) {
                foundOrder = rawData.updatedMenu.order;
                foundHidden = rawData.updatedMenu.hidden;
            } else if (rawData.menu && Array.isArray(rawData.menu.order)) {
                foundOrder = rawData.menu.order;
                foundHidden = rawData.menu.hidden;
            }

            // Update Cache
            CACHED_STATE.order = foundOrder || [];
            CACHED_STATE.hidden = foundHidden || [];
            CACHED_STATE.isLoaded = true;
            
            console.log("✅ State Loaded:", CACHED_STATE);
            
            // Trigger immediate application
            const nav = findSidebar();
            if(nav) applyDOMChanges(nav);

        } catch (err) {
            console.error("❌ API Fetch Error:", err);
        }
    }

    function postMenuData(order, hidden) {
        // Update Local State Immediately (Optimistic UI)
        CACHED_STATE.order = order;
        CACHED_STATE.hidden = hidden;
        CACHED_STATE.isLoaded = true;

        const url = `${CONFIG.API_BASE}/side-menu/save/${getLocationId()}`;
        const payload = { order, hidden };
        
        console.log(`📤 POST Request: ${url}`, payload);

        fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-theme-key': CONFIG.AUTH_TOKEN },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            console.log("✅ Save Response:", data);
            const btn = document.getElementById('ghl-save-btn');
            if(btn) { 
                btn.innerText = "Saved! ✅"; 
                btn.style.background = "#10B981"; 
                setTimeout(() => {
                    btn.innerText = "Save Changes";
                    btn.style.background = "#3b82f6";
                }, 2000); 
            }
        })
        .catch(err => console.error("❌ Save Failed:", err));
    }

    function resetMenuData() {
        if(!confirm("Reset sidebar to default?")) return;
        const url = `${CONFIG.API_BASE}/side-menu/${getLocationId()}`;

        fetch(url, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', 'x-theme-key': CONFIG.AUTH_TOKEN }
        })
        .then(res => res.json())
        .then(data => {
            console.log("✅ Reset Response:", data);
            location.reload();
        });
    }

    // ================= 3. DOM ENFORCER =================
    function applyDOMChanges(nav) {
        if (!CACHED_STATE.isLoaded || !nav || isApplyingChanges) return;
        
        if (CACHED_STATE.order.length === 0 && CACHED_STATE.hidden.length === 0) {
            return;
        }

        isApplyingChanges = true;
        const { order, hidden } = CACHED_STATE;

        // 1. Enforce Order
        if (order.length > 0) {
            order.forEach(id => {
                const el = document.getElementById(id);
                // Move the LI wrapper if it exists, otherwise the element itself
                const container = el ? (el.closest('li') || el) : null;
                if (container && container.parentElement === nav) {
                     nav.appendChild(container); 
                }
            });
        }

        // 2. Enforce Visibility
        // First unhide all valid menu items
        nav.querySelectorAll('li, a').forEach(el => {
            if(el.id && (el.id.includes('sb_') || el.id.includes('menu'))) {
                 el.style.display = ''; 
            }
        });

        // Then hide specific items
        hidden.forEach(id => {
            const el = document.getElementById(id);
            const container = el ? (el.closest('li') || el) : null;
            if(container) container.style.display = 'none';
        });

        setTimeout(() => isApplyingChanges = false, 50);
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
        
        // Get valid menu items
        const items = Array.from(nav.querySelectorAll('li, a'))
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

    // ================= 5. MAIN LOOP =================
    let initComplete = false;

    const initInterval = setInterval(async () => {
        const nav = findSidebar();
        
        if (nav) {
            if (!initComplete) {
                console.log("✅ Sidebar Found. Initializing...");
                await fetchMenuData();
                applyDOMChanges(nav);
                createPanel(nav);

                // Observer to persist changes
                if (sidebarObserver) sidebarObserver.disconnect();
                sidebarObserver = new MutationObserver(() => {
                    if (isApplyingChanges) return; 
                    applyDOMChanges(nav);
                });
                sidebarObserver.observe(nav, { childList: true, subtree: true });
                
                initComplete = true;
                clearInterval(initInterval);
            }
        }
    }, 500);

})();