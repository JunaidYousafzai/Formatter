(function() {
    console.clear();
    console.log("🚀 Starting Aggressive Sidebar Manager...");

    const CONFIG = {
        PANEL_TITLE: "Sidebar Manager",
        API_BASE: "https://theme-customizer-production.up.railway.app/api", 
        AUTH_TOKEN: window.TOKEN || "" 
    };

    // ================= 1. AGGRESSIVE SIDEBAR FINDER =================
    function findSidebarElement() {
        // A. Try the standard IDs first (Best)
        let nav = document.querySelector('#sidebar-v2 nav') || 
                  document.querySelector('.sidebar-v2-location nav') ||
                  document.querySelector('.hl_nav-header nav');

        // B. Try searching by generic classes
        if (!nav) {
            console.log("⚠️ Standard ID not found. Searching by class...");
            const sidebars = document.querySelectorAll('[class*="sidebar"], [id*="sidebar"], aside');
            for (let sb of sidebars) {
                // Find a nav inside a sidebar container
                const n = sb.querySelector('nav');
                // Ensure it actually has list items (links)
                if (n && n.querySelectorAll('li, a').length > 3) {
                    nav = n;
                    console.log("✅ Found sidebar via generic class:", sb.className);
                    break;
                }
            }
        }

        // C. Last Resort: Find ANY nav on the left side of the screen
        if (!nav) {
            console.log("⚠️ Class search failed. Searching for ANY vertical nav...");
            const allNavs = document.querySelectorAll('nav');
            for (let n of allNavs) {
                const rect = n.getBoundingClientRect();
                const hasItems = n.querySelectorAll('li, a').length > 3;
                // Check if it's tall and on the left
                if (hasItems && rect.height > 500 && rect.left < 100) {
                    nav = n;
                    console.log("✅ Found sidebar via geometry check.");
                    break;
                }
            }
        }
        
        return nav;
    }

    // ================= 2. HELPERS & API =================
    function getLocationId() {
        const match = window.location.pathname.match(/\/location\/([a-zA-Z0-9]+)/);
        if (match && match[1]) return match[1];
        const params = new URLSearchParams(window.location.search);
        return params.get('locationId') || 'qzPk2iMXCzGuEt5FA6Ll'; 
    }

    async function fetchMenuData() {
        try {
            const res = await fetch(`${CONFIG.API_BASE}/side-menu/${getLocationId()}`, {
                headers: { 'Content-Type': 'application/json', 'x-theme-key': CONFIG.AUTH_TOKEN }
            });
            if (res.status === 404) return { order: [], hidden: [] };
            if (!res.ok) throw new Error('API Error');
            return await res.json();
        } catch (err) {
            console.warn("Using local defaults (API error).");
            return { order: [], hidden: [] };
        }
    }

    function postMenuData(order, hidden) {
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

    // ================= 3. DOM APPLIER =================
    function applySavedOrder(nav, savedOrder, hiddenItems) {
        if (savedOrder && savedOrder.length > 0) {
            savedOrder.forEach(id => {
                const el = document.getElementById(id);
                const container = el ? (el.closest('li') || el.closest('a') || el) : null;
                if (container && container.parentElement === nav) nav.appendChild(container);
            });
        }
        // Force hide hidden items
        if (hiddenItems && hiddenItems.length > 0) {
            hiddenItems.forEach(id => {
                const el = document.getElementById(id);
                const container = el ? (el.closest('li') || el.closest('a') || el) : null;
                if(container) container.style.display = 'none';
            });
        }
        // Force show non-hidden items
        nav.querySelectorAll('[id]').forEach(item => {
            // Only touch items that look like GHL menu items
            if(!item.id.includes('sb_') && !item.id.includes('menu')) return;
            
            const container = item.closest('li') || item.closest('a') || item;
            if (container && (!hiddenItems || !hiddenItems.includes(item.id))) {
                container.style.display = '';
            }
        });
    }

    // ================= 4. UI CREATION =================
    function createDragDropPanel(nav, order, hidden) {
        const existing = document.getElementById("ghl-sidebar-manager");
        if(existing) existing.remove();

        const panel = document.createElement("div");
        panel.id = "ghl-sidebar-manager";
        panel.style.cssText = `
            position: fixed; top: 100px; right: 20px; width: 300px;
            background: white; border: 1px solid #ccc; z-index: 2147483647;
            padding: 16px; border-radius: 8px; box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            font-family: sans-serif; max-height: 80vh; overflow-y: auto;
        `;
        
        panel.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:12px; border-bottom:1px solid #eee; padding-bottom:8px;">
                <h3 style="margin:0; font-size:15px; font-weight:bold;">${CONFIG.PANEL_TITLE}</h3>
                <button id="ghl-close-btn" style="border:none; bg:transparent; cursor:pointer;">❌</button>
            </div>
            <ul id="orderList" style="list-style:none; padding:0; margin:0;"></ul>
            <div style="display:flex; gap:10px; margin-top:15px;">
                <button id="ghl-save-btn" style="flex:1; padding:8px; background:#3b82f6; color:white; border:none; border-radius:4px; cursor:pointer;">Save</button>
                <button id="ghl-reset-btn" style="width:30%; padding:8px; background:#ef4444; color:white; border:none; border-radius:4px; cursor:pointer;">Reset</button>
            </div>
        `;
        document.body.appendChild(panel);

        const list = panel.querySelector("#orderList");
        
        // Find items in Nav
        const items = Array.from(nav.querySelectorAll('a[id], li[id], div[id]'))
            .filter(el => el.id && (el.id.includes('sb_') || el.id.includes('menu')));

        if(items.length === 0) {
            list.innerHTML = "<li style='color:red;'>Sidebar found, but no ID items detected.</li>";
            return;
        }

        items.forEach(el => {
            const isHidden = hidden.includes(el.id);
            const li = document.createElement("li");
            li.dataset.id = el.id;
            li.draggable = true;
            li.style.cssText = `
                padding: 10px; margin-bottom: 6px; border-radius: 6px;
                background: ${isHidden ? '#fee2e2' : '#f3f4f6'};
                border: 1px solid ${isHidden ? '#fecaca' : '#e5e7eb'};
                display: flex; justify-content: space-between; align-items: center;
                cursor: grab;
            `;
            
            // Get Label logic
            let labelText = el.innerText.trim();
            // If innerText is empty (icon only sidebar), use title or ID
            if(!labelText) labelText = el.getAttribute('title') || el.id; 

            li.innerHTML = `
                <span style="font-size:13px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:180px;">${labelText}</span>
                <button class="toggle-eye" style="border:none; background:transparent; cursor:pointer;">${isHidden ? '🙈' : '👁️'}</button>
            `;

            // Toggle Logic
            li.querySelector('.toggle-eye').addEventListener('click', (e) => {
                const btn = e.target;
                const hide = btn.innerText === '👁️';
                btn.innerText = hide ? '🙈' : '👁️';
                li.style.background = hide ? '#fee2e2' : '#f3f4f6';
                
                // Live preview
                const domEl = document.getElementById(el.id);
                const container = domEl ? (domEl.closest('li') || domEl.closest('a') || domEl) : null;
                if(container) container.style.display = hide ? 'none' : '';
            });

            // Drag Logic
            li.addEventListener('dragstart', () => li.classList.add('dragging'));
            li.addEventListener('dragend', () => li.classList.remove('dragging'));

            list.appendChild(li);
        });

        // Drag Over
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
            applySavedOrder(nav, newOrder, newHidden);
            postMenuData(newOrder, newHidden);
        });

        document.getElementById('ghl-close-btn').addEventListener('click', () => panel.remove());
        document.getElementById('ghl-reset-btn').addEventListener('click', resetMenuData);
    }

    // ================= 5. MAIN LOOP =================
    let attempts = 0;
    const initInterval = setInterval(async () => {
        attempts++;
        const nav = findSidebarElement();
        
        if (nav) {
            clearInterval(initInterval);
            console.log("✅ Sidebar Successfully Located:", nav);
            
            // 1. Fetch
            const data = await fetchMenuData();
            const order = data?.order || [];
            const hidden = data?.hidden || [];

            // 2. Apply
            applySavedOrder(nav, order, hidden);

            // 3. Render
            createDragDropPanel(nav, order, hidden);
        } else if (attempts > 20) {
            clearInterval(initInterval);
            console.error("❌ Failed to find sidebar after 6 seconds.");
            alert("Script Error: Cannot find Sidebar. \n\nPlease tell the developer which GHL page you are on (e.g. Dashboard, Settings, Automations).");
        }
    }, 300);

})();