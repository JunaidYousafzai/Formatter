(function() {
    console.clear();
    console.log("🚀 Starting Sidebar Manager Fixer...");

    const CONFIG = {
        PANEL_TITLE: "Sidebar Manager",
        API_BASE: "https://theme-customizer-production.up.railway.app/api",
        AUTH_TOKEN: window.TOKEN || "test-token"
    };

    // ================= 1. ROBUST SIDEBAR FINDER =================
    function findSidebar() {
        // Method A: Standard GHL Selectors
        let nav = document.querySelector('#sidebar-v2 nav') || 
                  document.querySelector('.sidebar-v2-location nav');

        // Method B: Look for specific GHL classes if ID is missing
        if (!nav) {
            const sidebars = document.querySelectorAll('div[class*="sidebar"]');
            for (let sb of sidebars) {
                const n = sb.querySelector('nav');
                if (n) { nav = n; break; }
            }
        }

        // Method C: Desperation search for any NAV with list items
        if (!nav) {
            const allNavs = document.querySelectorAll('nav');
            for (let n of allNavs) {
                if (n.querySelectorAll('li').length > 3) { // Assuming a real sidebar has items
                    nav = n;
                    break;
                }
            }
        }
        
        return nav;
    }

    // ================= 2. SAFE TEXT EXTRACTOR (Prevents Crash) =================
    function getLabel(el) {
        if (!el) return "Unknown Item";
        // Try getting text from direct span or div children first (cleaner)
        const textNode = el.querySelector('span, div');
        let text = textNode ? textNode.innerText : el.innerText;
        
        return text ? text.trim() : (el.id || "Untitled");
    }

    // ================= 3. API LOGIC =================
    function getLocationId() {
        const match = window.location.pathname.match(/\/location\/([a-zA-Z0-9]+)/);
        return (match && match[1]) ? match[1] : 'qzPk2iMXCzGuEt5FA6Ll';
    }

    async function fetchMenuData() {
        try {
            const res = await fetch(`${CONFIG.API_BASE}/side-menu/${getLocationId()}`, {
                headers: { 'Content-Type': 'application/json', 'x-theme-key': CONFIG.AUTH_TOKEN }
            });
            if (res.status === 404) return null; // Expected for new users
            if (!res.ok) throw new Error('API Error');
            return await res.json();
        } catch (err) {
            console.warn("API unavailable, using local defaults.");
            return null;
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

    // ================= 4. UI CREATION =================
    function createPanel(nav, order, hidden) {
        const existing = document.getElementById("ghl-sidebar-manager");
        if (existing) existing.remove();

        const panel = document.createElement("div");
        panel.id = "ghl-sidebar-manager";
        panel.style.cssText = `
            position: fixed; top: 100px; right: 20px; width: 280px; 
            background: white; border: 1px solid #ccc; z-index: 2147483647; 
            padding: 15px; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            font-family: sans-serif; max-height: 80vh; overflow-y: auto;
        `;

        panel.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                <h3 style="margin:0; font-size:16px;">${CONFIG.PANEL_TITLE}</h3>
                <button id="ghl-close-btn" style="border:none; background:transparent; cursor:pointer;">❌</button>
            </div>
            <button id="ghl-restore-btn" style="width:100%; margin-bottom:10px; padding:5px; background:#ff9800; color:white; border:none; border-radius:4px; cursor:pointer;">⚠️ Fix Missing Sidebar</button>
            <ul id="ghl-sort-list" style="list-style:none; padding:0; margin:0;"></ul>
            <button id="ghl-save-btn" style="width:100%; margin-top:10px; padding:8px; background:#3b82f6; color:white; border:none; border-radius:4px; cursor:pointer;">Save Changes</button>
        `;

        document.body.appendChild(panel);

        // --- Logic to Populate List ---
        const list = panel.querySelector("#ghl-sort-list");
        const items = Array.from(nav.querySelectorAll('a, li')).filter(el => el.id && (el.id.includes('sb_') || el.id.includes('menu')));

        if (items.length === 0) {
            list.innerHTML = "<li style='color:red;'>No valid menu items found (looking for IDs starting with 'sb_')</li>";
        }

        items.forEach(el => {
            const isHidden = hidden.includes(el.id);
            const li = document.createElement("li");
            li.dataset.id = el.id;
            li.draggable = true;
            li.style.cssText = `
                padding: 8px; margin-bottom: 4px; border-radius: 4px;
                background: ${isHidden ? '#fee2e2' : '#f3f4f6'};
                border: 1px solid #e5e7eb; display: flex; justify-content: space-between; cursor: move;
            `;
            
            li.innerHTML = `
                <span style="font-size:13px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:180px;">${getLabel(el)}</span>
                <button class="toggle-eye" style="border:none; background:none; cursor:pointer;">${isHidden ? '🙈' : '👁️'}</button>
            `;

            // Toggle Visibility Logic
            li.querySelector('.toggle-eye').addEventListener('click', (e) => {
                e.stopPropagation();
                const btn = e.target;
                const hide = btn.innerText === '👁️';
                btn.innerText = hide ? '🙈' : '👁️';
                li.style.background = hide ? '#fee2e2' : '#f3f4f6';
                el.style.display = hide ? 'none' : ''; // Real-time preview
            });

            // Drag Events
            li.addEventListener('dragstart', () => li.classList.add('dragging'));
            li.addEventListener('dragend', () => li.classList.remove('dragging'));
            
            list.appendChild(li);
        });

        // --- Drag Over Logic ---
        list.addEventListener('dragover', e => {
            e.preventDefault();
            const dragging = list.querySelector('.dragging');
            const siblings = [...list.querySelectorAll('li:not(.dragging)')];
            const next = siblings.find(sib => e.clientY <= sib.getBoundingClientRect().top + sib.offsetHeight / 2);
            list.insertBefore(dragging, next);
        });

        // --- Button Listeners ---
        document.getElementById('ghl-save-btn').addEventListener('click', () => {
            const newOrder = [...list.querySelectorAll('li')].map(li => li.dataset.id);
            const newHidden = [...list.querySelectorAll('li')].filter(li => li.querySelector('.toggle-eye').innerText === '🙈').map(li => li.dataset.id);
            
            // Apply to DOM
            newOrder.forEach(id => {
                const el = document.getElementById(id);
                // Try to move the LI wrapper if it exists, otherwise the element itself
                const container = el.closest('li') || el; 
                if(container && container.parentElement === nav) nav.appendChild(container);
            });

            postMenuData(newOrder, newHidden);
        });

        document.getElementById('ghl-close-btn').addEventListener('click', () => panel.remove());
        
        // --- EMERGENCY RESTORE ---
        document.getElementById('ghl-restore-btn').addEventListener('click', () => {
             items.forEach(el => el.style.display = '');
             alert("All items unhidden.");
        });
    }

    // ================= 5. MAIN EXECUTION =================
    const nav = findSidebar();
    
    if (nav) {
        console.log("✅ Sidebar Found:", nav);
        fetchMenuData().then(data => {
            const order = data?.order || [];
            const hidden = data?.hidden || [];
            
            // Initial Apply
            if (hidden.length > 0) {
                hidden.forEach(id => {
                    const el = document.getElementById(id);
                    if(el) el.style.display = 'none';
                });
            }
            
            createPanel(nav, order, hidden);
        });
    } else {
        console.error("❌ Sidebar still not found.");
        alert("Sidebar not found. Are you on the right page?");
    }

})();