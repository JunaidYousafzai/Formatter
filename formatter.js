(function() {
    console.clear();
    console.log("🚀 Starting Sidebar Manager (Fixed Save)...");

    // ================= CONFIGURATION =================
    const CONFIG = {
        PANEL_TITLE: "Sidebar Manager",
        // ✅ Your Real API Base
        API_BASE: "https://theme-customizer-production.up.railway.app/api", 
        AUTH_TOKEN: window.TOKEN || "test-token" // GHL Token
    };

    // ================= 1. HELPERS =================
    function getLocationId() {
        const match = window.location.pathname.match(/\/location\/([a-zA-Z0-9]+)/);
        return (match && match[1]) ? match[1] : 'qzPk2iMXCzGuEt5FA6Ll'; // Fallback to your test ID
    }

    function findSidebar() {
        return document.querySelector('#sidebar-v2 nav') || 
               document.querySelector('.sidebar-v2-location nav') ||
               document.querySelector('.hl_nav-header nav');
    }

    function getLabel(el) {
        if (!el) return "Unknown";
        // Try getting text from span/div children to avoid grabbing icon text
        const textNode = el.querySelector('span, div');
        return textNode ? textNode.innerText.trim() : (el.innerText.trim() || el.id);
    }

    // ================= 2. API FUNCTIONS =================
    async function fetchMenuData() {
        const locationId = getLocationId();
        const url = `${CONFIG.API_BASE}/side-menu/${locationId}`;
        console.log(`📥 Fetching from: ${url}`);
        
        try {
            const res = await fetch(url, {
                headers: { 'Content-Type': 'application/json', 'x-theme-key': CONFIG.AUTH_TOKEN }
            });
            if (res.status === 404) return null; 
            return await res.json();
        } catch (err) {
            console.warn("API Error (using local defaults):", err);
            return null;
        }
    }

    function postMenuData(order, hidden) {
        const locationId = getLocationId();
        // ✅ CORRECT URL STRUCTURE
        const url = `${CONFIG.API_BASE}/side-menu/save/${locationId}`;
        
        // ✅ CORRECT BODY STRUCTURE
        const payload = { 
            order: order, 
            hidden: hidden 
        };

        console.log(`📤 Sending POST to: ${url}`);
        console.log("📦 Payload Body:", JSON.stringify(payload, null, 2));

        fetch(url, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'x-theme-key': CONFIG.AUTH_TOKEN 
            },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            console.log("✅ API Response:", data);
            const btn = document.getElementById('ghl-save-btn');
            if(btn) { 
                btn.innerText = "Saved! ✅"; 
                btn.style.background = "#10B981"; // Green
                setTimeout(() => {
                    btn.innerText = "Save Changes";
                    btn.style.background = "#3b82f6"; // Blue
                }, 2000); 
            }
        })
        .catch(err => {
            console.error("❌ Save Failed:", err);
            alert("Save failed. Check console.");
        });
    }

    function resetMenuData() {
        const locationId = getLocationId();
        if(!confirm("Reset sidebar to default?")) return;
        
        fetch(`${CONFIG.API_BASE}/side-menu/${locationId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', 'x-theme-key': CONFIG.AUTH_TOKEN }
        }).then(() => location.reload());
    }

    // ================= 3. DOM MANIPULATION =================
    function applyDOMChanges(nav, order, hidden) {
        // 1. Reorder
        if (order && order.length > 0) {
            order.forEach(id => {
                const el = document.getElementById(id);
                // Move the LI wrapper if it exists, otherwise the element
                const container = el ? (el.closest('li') || el) : null;
                if (container && container.parentElement === nav) {
                    nav.appendChild(container);
                }
            });
        }
        // 2. Hide/Show
        if (hidden && hidden.length > 0) {
            hidden.forEach(id => {
                const el = document.getElementById(id);
                const container = el ? (el.closest('li') || el) : null;
                if(container) container.style.display = 'none';
            });
        }
    }

    // ================= 4. UI PANEL CREATION =================
    function createPanel(nav, order, hidden) {
        const existing = document.getElementById("ghl-sidebar-manager");
        if (existing) existing.remove();

        const panel = document.createElement("div");
        panel.id = "ghl-sidebar-manager";
        // Styling to ensure it floats above everything
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
            <div style="margin-bottom:10px; font-size:12px; color:#666;">
                Location ID: <b>${getLocationId()}</b>
            </div>
            <ul id="ghl-sort-list" style="list-style:none; padding:0; margin:0;"></ul>
            <div style="display:flex; gap:10px; margin-top:15px;">
                <button id="ghl-save-btn" style="flex:1; padding:8px; background:#3b82f6; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:bold;">Save Changes</button>
                <button id="ghl-reset-btn" style="width:30%; padding:8px; background:#ef4444; color:white; border:none; border-radius:4px; cursor:pointer;">Reset</button>
            </div>
        `;
        document.body.appendChild(panel);

        // --- Populate List ---
        const list = panel.querySelector("#ghl-sort-list");
        // Get valid menu items (filter out random GHL elements)
        const items = Array.from(nav.querySelectorAll('a, li'))
            .filter(el => el.id && (el.id.startsWith('sb_') || el.id.includes('menu')));

        items.forEach(el => {
            const isHidden = hidden.includes(el.id);
            const li = document.createElement("li");
            li.dataset.id = el.id; // CRITICAL: Storing ID for scraping later
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
                // Immediate preview in DOM
                const domEl = document.getElementById(el.id);
                const container = domEl ? (domEl.closest('li') || domEl) : null;
                if(container) container.style.display = hide ? 'none' : ''; 
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

        // --- SAVE BUTTON LOGIC (THE FIX) ---
        document.getElementById('ghl-save-btn').addEventListener('click', () => {
            console.log("💾 Save button clicked...");
            
            // 1. Scrape Order
            const listItems = Array.from(list.querySelectorAll('li'));
            const newOrder = listItems.map(li => li.dataset.id);

            // 2. Scrape Hidden
            const newHidden = listItems
                .filter(li => li.querySelector('.toggle-eye').innerText === '🙈')
                .map(li => li.dataset.id);

            // 3. Send to API
            postMenuData(newOrder, newHidden);
            
            // 4. Re-apply to DOM to ensure sync (optional but good practice)
            applyDOMChanges(nav, newOrder, newHidden);
        });

        document.getElementById('ghl-close-btn').addEventListener('click', () => panel.remove());
        document.getElementById('ghl-reset-btn').addEventListener('click', resetMenuData);
    }

    // ================= 5. INITIALIZATION =================
    const nav = findSidebar();
    
    if (nav) {
        console.log("✅ Sidebar Found:", nav);
        fetchMenuData().then(data => {
            const order = data?.order || [];
            const hidden = data?.hidden || [];

            // Apply initial state
            applyDOMChanges(nav, order, hidden);
            
            // Draw Panel
            createPanel(nav, order, hidden);
        });
    } else {
        alert("❌ Error: Could not find GHL Sidebar. Is the page fully loaded?");
    }

})();