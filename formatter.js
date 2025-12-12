(function() {
    console.clear();
    console.log("%c🚀 STARTING CSS-BASED SIDEBAR ENFORCER...", "background: #059669; color: white; font-weight: bold; padding: 4px;");

    const CONFIG = {
        PANEL_TITLE: "Sidebar Manager",
        API_BASE: "https://theme-customizer-production.up.railway.app/api", 
        AUTH_TOKEN: window.TOKEN || "" 
    };

    let CACHED_STATE = { order: [], hidden: [], isLoaded: false };

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

    // ================= 2. API =================
    async function fetchMenuData() {
        try {
            const url = `${CONFIG.API_BASE}/side-menu/${getLocationId()}?t=${Date.now()}`;
            const res = await fetch(url, {
                headers: { 'Content-Type': 'application/json', 'x-theme-key': CONFIG.AUTH_TOKEN }
            });
            if (res.status === 404) return;
            const raw = await res.json();

            let newOrder = [];
            let newHidden = [];

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
            
            // Apply immediately upon load
            const nav = findSidebar();
            if(nav) applyDOMChanges(nav);

        } catch (err) {
            console.error("API Error:", err);
        }
    }

    function postMenuData(order, hidden) {
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

    // ================= 3. CSS ENFORCER (THE FIX) =================
    function applyDOMChanges(nav) {
        if (!CACHED_STATE.isLoaded || !nav) return;

        const { order, hidden } = CACHED_STATE;

        // Ensure the container is a flex container
        nav.style.display = "flex";
        nav.style.flexDirection = "column";

        // 1. Reset all items first
        const allItems = nav.querySelectorAll('li, a');
        allItems.forEach(el => {
            el.style.order = "9999"; // Default to bottom
            el.style.display = "";   // Default to visible
        });

        // 2. Apply Order using CSS 'order' property
        // This is much more stable than moving DOM elements
        order.forEach((id, index) => {
            const el = document.getElementById(id);
            if (el) {
                // Apply to the direct child of the flex container (nav)
                const container = el.closest('li') || el.closest('a') || el;
                if (container.parentElement === nav) {
                    container.style.order = index; // CSS Order ID
                }
            }
        });

        // 3. Apply Hidden using CSS
        hidden.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                const container = el.closest('li') || el.closest('a') || el;
                container.style.display = "none !important";
                container.setAttribute('hidden', 'true'); // Helper attribute
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
            background: white; border: 2px solid #059669; z-index: 99999999; 
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
        document.getElementById('ghl-reset-btn').addEventListener('click', () => {
             if(confirm("Reset?")) {
                 fetch(`${CONFIG.API_BASE}/side-menu/${getLocationId()}`, { method: 'DELETE', headers: {'x-theme-key': CONFIG.AUTH_TOKEN }})
                 .then(()=>location.reload());
             }
        });
    }

    // ================= 5. MAIN EXECUTION =================
    // Initialize once
    fetchMenuData().then(() => {
        // Continuous check to enforce CSS rules
        setInterval(() => {
            const nav = findSidebar();
            if (nav) {
                // Ensure our styles stick
                applyDOMChanges(nav);
                
                // Keep panel alive if sidebar exists
                if (!document.getElementById("ghl-sidebar-manager")) {
                    createPanel(nav);
                }
            }
        }, 500);
    });

})();