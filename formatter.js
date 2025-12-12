(function() {
    console.clear();
    console.log("%c🚀 STARTING UNIVERSAL SIDEBAR MANAGER...", "background: #7c3aed; color: white; font-weight: bold; padding: 4px;");

    const CONFIG = {
        PANEL_TITLE: "Sidebar Manager",
        API_BASE: "https://theme-customizer-production.up.railway.app/api", 
        AUTH_TOKEN: window.TOKEN || "" 
    };

    let CACHED_STATE = { order: [], hidden: [], isLoaded: false };
    let isApplying = false;

    // ================= 1. UNIVERSAL ID LOGIC =================
    function getLocationId() {
        // 1. Try Sub-Account (URL Path)
        // Matches /v2/location/xxxx or /location/xxxx
        const match = window.location.pathname.match(/\/location\/([a-zA-Z0-9]+)/);
        if (match && match[1]) {
            return match[1];
        }

        // 2. Try Query Params (common in older GHL pages)
        const params = new URLSearchParams(window.location.search);
        if (params.get('locationId')) {
            return params.get('locationId');
        }

        // 3. Agency Fallback (Derived from Hostname)
        // If we are NOT in a location, we assume we are in Agency View.
        // We generate the ID based on the domain (e.g., sandbox.100msaas.com -> agency_sandbox_100msaas_com)
        const domain = window.location.hostname;
        const cleanDomain = domain.replace(/^www\./, '').replace(/\./g, '_');
        return `agency_${cleanDomain}`;
    }

    function findSidebar() {
        // Broad search to match both Agency and Sub-account sidebars
        return document.querySelector('#sidebar-v2 nav') || 
               document.querySelector('.sidebar-v2-location nav') ||
               document.querySelector('.hl_nav-header nav') ||
               document.querySelector('nav'); // Fallback
    }

    function getLabel(el) {
        const textNode = el.querySelector('span, div');
        return textNode ? textNode.innerText.trim() : (el.innerText.trim() || el.id);
    }

    // ================= 2. API FUNCTIONS =================
    async function fetchMenuData() {
        const id = getLocationId();
        console.log(`📥 Fetching config for: ${id}`);
        
        try {
            const url = `${CONFIG.API_BASE}/side-menu/${id}?t=${Date.now()}`;
            const res = await fetch(url, {
                headers: { 'Content-Type': 'application/json', 'x-theme-key': CONFIG.AUTH_TOKEN }
            });
            
            if (res.status === 404) return;
            const raw = await res.json();

            let newOrder = [];
            let newHidden = [];

            // Handle your specific response structure
            if (raw.sideMenuContent) {
                newOrder = raw.sideMenuContent.order || [];
                newHidden = raw.sideMenuContent.hidden || [];
            } else if (raw.order) {
                newOrder = raw.order;
                newHidden = raw.hidden;
            }

            CACHED_STATE.order = newOrder;
            CACHED_STATE.hidden = newHidden;
            CACHED_STATE.isLoaded = true;
            console.log("✅ Config Loaded:", CACHED_STATE);
            
            // Force apply immediately
            const nav = findSidebar();
            if(nav) applyDOMChanges(nav);

        } catch (err) {
            console.error("API Error:", err);
        }
    }

    function postMenuData(order, hidden) {
        const id = getLocationId();
        CACHED_STATE.order = order;
        CACHED_STATE.hidden = hidden;
        CACHED_STATE.isLoaded = true;

        fetch(`${CONFIG.API_BASE}/side-menu/save/${id}`, {
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

    // ================= 3. CSS ENFORCER (STABLE) =================
    function applyDOMChanges(nav) {
        if (!CACHED_STATE.isLoaded || !nav) return;

        const { order, hidden } = CACHED_STATE;

        // Ensure flex container
        nav.style.display = "flex";
        nav.style.flexDirection = "column";

        // 1. Reset
        const allItems = nav.querySelectorAll('li, a');
        allItems.forEach(el => {
            el.style.order = "9999"; 
            el.style.display = "";   
        });

        // 2. Apply Order
        order.forEach((id, index) => {
            const el = document.getElementById(id);
            if (el) {
                const container = el.closest('li') || el.closest('a') || el;
                if (container.parentElement === nav) {
                    container.style.order = index;
                }
            }
        });

        // 3. Apply Hidden
        hidden.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                const container = el.closest('li') || el.closest('a') || el;
                container.style.display = "none !important";
                container.setAttribute('hidden', 'true');
            }
        });
    }

    // ================= 4. UI PANEL =================
    function createPanel(nav) {
        if (document.getElementById("ghl-sidebar-manager")) return;

        const panel = document.createElement("div");
        panel.id = "ghl-sidebar-manager";
        panel.style.cssText = `
            position: fixed; top: 100px; right: 20px; width: 280px; 
            background: white; border: 2px solid #7c3aed; z-index: 99999999; 
            padding: 16px; border-radius: 8px; box-shadow: 0 10px 50px rgba(0,0,0,0.3);
            font-family: sans-serif; max-height: 80vh; overflow-y: auto;
        `;
        
        panel.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
                <h3 style="margin:0; font-size:15px; font-weight:bold;">${CONFIG.PANEL_TITLE}</h3>
                <button id="ghl-close-btn" style="border:none; bg:transparent; cursor:pointer;">❌</button>
            </div>
            <p style="font-size:10px; color:#666; margin-bottom:10px;">ID: <b>${getLocationId()}</b></p>
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
    fetchMenuData().then(() => {
        // Run forever to enforce styles against GHL re-renders
        setInterval(() => {
            const nav = findSidebar();
            if (nav) {
                applyDOMChanges(nav);
                // Draw panel only if sidebar exists and panel is missing
                if (!document.getElementById("ghl-sidebar-manager")) {
                    createPanel(nav);
                }
            }
        }, 500);
    });

})();