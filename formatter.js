(function() {
    console.clear();
    console.log("🚀 Starting Sidebar Enforcer (MutationObserver Version)...");

    const CONFIG = {
        PANEL_TITLE: "Sidebar Manager",
        API_BASE: "https://theme-customizer-production.up.railway.app/api", 
        AUTH_TOKEN: window.TOKEN || "" 
    };

    // Global State to hold data without re-fetching
    let CACHED_STATE = {
        order: [],
        hidden: [],
        isLoaded: false
    };

    // To prevent infinite loops when we modify the DOM
    let isApplyingChanges = false;
    let sidebarObserver = null;

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
            if (res.status === 404) return; 
            const data = await res.json();
            
            // Update Cache
            CACHED_STATE.order = data.order || [];
            CACHED_STATE.hidden = data.hidden || [];
            CACHED_STATE.isLoaded = true;
            console.log("✅ Config Loaded:", CACHED_STATE);
            
            // Trigger immediate application
            const nav = findSidebar();
            if(nav) applyDOMChanges(nav);

        } catch (err) {
            console.warn("API Error:", err);
        }
    }

    function postMenuData(order, hidden) {
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

    // ================= 3. DOM ENFORCER (The Fix) =================
    function applyDOMChanges(nav) {
        if (!CACHED_STATE.isLoaded || !nav || isApplyingChanges) return;

        // Lock to prevent observer loop
        isApplyingChanges = true;

        const { order, hidden } = CACHED_STATE;

        // 1. Enforce Order
        // We appendChild in the saved order. This effectively sorts them.
        if (order && order.length > 0) {
            order.forEach(id => {
                const el = document.getElementById(id);
                // Get the draggable container (usually the LI)
                const container = el ? (el.closest('li') || el) : null;
                
                // Only move if it is not already in the correct position relative to siblings
                if (container && container.parentElement === nav) {
                     nav.appendChild(container); 
                }
            });
        }

        // 2. Enforce Visibility
        // Show everything first to ensure clean state
        nav.querySelectorAll('li, a').forEach(el => el.style.display = '');

        // Hide specific items
        hidden.forEach(id => {
            const el = document.getElementById(id);
            const container = el ? (el.closest('li') || el) : null;
            if(container) container.style.display = 'none';
        });

        // Unlock
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
            <p style="font-size:12px; color:#666; margin-bottom:10px;">Drag to reorder.</p>
            <ul id="ghl-sort-list" style="list-style:none; padding:0; margin:0;"></ul>
            <div style="display:flex; gap:10px; margin-top:15px;">
                <button id="ghl-save-btn" style="flex:1; padding:8px; background:#3b82f6; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:bold;">Save Changes</button>
                <button id="ghl-reset-btn" style="width:30%; padding:8px; background:#ef4444; color:white; border:none; border-radius:4px; cursor:pointer;">Reset</button>
            </div>
        `;
        document.body.appendChild(panel);

        const list = panel.querySelector("#ghl-sort-list");
        // Get items based on current DOM state (which is enforced by applyDOMChanges)
        const items = Array.from(nav.querySelectorAll('li, a')).filter(el => el.id && (el.id.includes('sb_') || el.id.includes('menu')));

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

            li.querySelector('.toggle-eye').addEventListener('click', (e) => {
                const btn = e.target;
                const hide = btn.innerText === '👁️';
                btn.innerText = hide ? '🙈' : '👁️';
                li.style.background = hide ? '#fee2e2' : '#f3f4f6';
                
                // Immediate Preview (handled by UI logic temporarily)
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
            const newHidden = [...list.querySelectorAll('li')].filter(li => li.querySelector('.toggle-eye').innerText === '🙈').map(li => li.dataset.id);
            
            postMenuData(newOrder, newHidden);
            applyDOMChanges(nav); // Force apply immediately
        });

        document.getElementById('ghl-close-btn').addEventListener('click', () => panel.remove());
        document.getElementById('ghl-reset-btn').addEventListener('click', resetMenuData);
    }

    // ================= 5. INITIALIZATION & OBSERVER =================
    // This part ensures we find the sidebar AND keep it updated if GHL refreshes it
    const initInterval = setInterval(async () => {
        const nav = findSidebar();
        
        if (nav) {
            // Only stop interval if we haven't loaded data yet
            if (!CACHED_STATE.isLoaded) {
                console.log("✅ Sidebar Found. Initializing...");
                await fetchMenuData();
                applyDOMChanges(nav);
                createPanel(nav);

                // --- START OBSERVER ---
                // This watches for GHL overwriting our changes
                if (sidebarObserver) sidebarObserver.disconnect();
                
                sidebarObserver = new MutationObserver((mutations) => {
                    if (isApplyingChanges) return; // Ignore our own changes
                    // console.log("GHL updated sidebar. Re-enforcing order...");
                    applyDOMChanges(nav);
                });
                
                sidebarObserver.observe(nav, { childList: true, subtree: true });
                // --- END OBSERVER ---
                
                clearInterval(initInterval);
            }
        }
    }, 500);

})();