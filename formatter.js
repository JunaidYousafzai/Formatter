(function() {
    console.clear();
    console.log("🚀 Starting Sidebar Menu Manager (API Connected)...");

    // ================= CONFIGURATION =================
    const CONFIG = {
        PANEL_TITLE: "Sidebar Menu Manager",
        // ✅ Real API Base URL
        API_BASE: "https://theme-customizer-production.up.railway.app/api", 
        // Get Token from GHL window object or default to empty string if missing
        AUTH_TOKEN: window.TOKEN || "" 
    };

    // ================= 1. HELPER: GET LOCATION ID =================
    function getLocationId() {
        // 1. Try URL path (most reliable for sub-accounts)
        const match = window.location.pathname.match(/\/location\/([a-zA-Z0-9]+)/);
        if (match && match[1]) return match[1];
        
        // 2. Try URL Query Params
        const params = new URLSearchParams(window.location.search);
        if (params.get('locationId')) return params.get('locationId');
        
        // 3. Fallback for testing
        console.warn("Could not detect Location ID. Using fallback.");
        return 'qzPk2iMXCzGuEt5FA6Ll'; 
    }

    // ================= 2. HELPER: ROBUST SIDEBAR FINDER =================
    function waitForSidebar(callback) {
        let attempts = 0;
        const check = setInterval(() => {
            attempts++;
            // Try standard selectors for GHL v1 and v2 sidebars
            const nav = document.querySelector('#sidebar-v2 nav') || 
                        document.querySelector('.sidebar-v2-location nav') ||
                        document.querySelector('.hl_nav-header nav');

            if (nav && nav.querySelectorAll('li').length > 0) {
                clearInterval(check);
                console.log("✅ Sidebar found!");
                callback(nav);
            } else if (attempts > 30) { // Stop after 10 seconds
                clearInterval(check);
                console.error("❌ Sidebar not found. Aborting.");
                alert("Error: Could not find sidebar navigation.");
            }
        }, 300);
    }

    // ================= 3. API FUNCTIONS =================
    
    // --- GET (Load) ---
    async function fetchMenuData() {
        const locationId = getLocationId();
        const url = `${CONFIG.API_BASE}/side-menu/${locationId}`;
        console.log("📥 Fetching config from:", url);

        try {
            const res = await fetch(url, {
                method: 'GET',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-theme-key': CONFIG.AUTH_TOKEN
                }
            });
            
            // If 404, it just means no config exists yet (clean slate)
            if (res.status === 404) return { order: [], hidden: [] };
            if (!res.ok) throw new Error(`API Error ${res.status}`);
            
            return await res.json();
        } catch (err) {
            console.warn("⚠️ API Fetch failed (using defaults):", err);
            return { order: [], hidden: [] };
        }
    }

    // --- POST (Save) ---
    function postMenuData(order, hiddenItems) {
        const locationId = getLocationId();
        const url = `${CONFIG.API_BASE}/side-menu/save/${locationId}`;
        const payload = { order: order, hidden: hiddenItems };

        console.log("📤 Saving config to:", url);

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
            console.log("✅ Data saved:", data);
            const title = document.querySelector("#drag-drop-title");
            if(title) {
                const oldText = title.innerText;
                title.innerText = "Saved Successfully! ✅";
                title.style.color = "green";
                setTimeout(() => {
                    title.innerText = oldText;
                    title.style.color = "inherit";
                }, 2000);
            }
        })
        .catch(err => {
            console.error("❌ Save failed:", err);
            alert("Failed to save menu configuration.");
        });
    }

    // --- DELETE (Reset) ---
    function resetMenuData() {
        const locationId = getLocationId();
        const url = `${CONFIG.API_BASE}/side-menu/${locationId}`;

        if(!confirm("Are you sure you want to reset the sidebar to default?")) return;

        console.log("🗑️ Resetting config at:", url);

        fetch(url, {
            method: 'DELETE',
            headers: { 
                'Content-Type': 'application/json',
                'x-theme-key': CONFIG.AUTH_TOKEN
            }
        })
        .then(() => {
            console.log("✅ Reset successful. Reloading...");
            location.reload(); 
        })
        .catch(err => {
            console.error("❌ Reset failed:", err);
            alert("Failed to reset menu.");
        });
    }

    // ================= 4. DOM MANIPULATION =================
    function applySavedOrder(nav, savedOrder, hiddenItems) {
        if (!nav) return;

        // 1. Apply Order (Move elements)
        if (savedOrder && savedOrder.length > 0) {
            savedOrder.forEach(id => {
                const el = document.getElementById(id);
                if (!el) return;
                // Move the LI wrapper if it exists, otherwise the element itself
                const parent = el.closest('li') || el.closest('a');
                if (parent && parent.parentElement === nav) {
                    nav.appendChild(parent);
                }
            });
        }

        // 2. Apply Visibility (Hide items)
        // First reset all to visible
        nav.querySelectorAll('[id]').forEach(item => {
            if(!item.id.startsWith('sb_') && !item.id.includes('menu')) return;
            const parent = item.closest('li') || item.closest('a');
            if (parent) parent.style.display = '';
        });

        // Then hide specific ones
        if (hiddenItems && hiddenItems.length > 0) {
            hiddenItems.forEach(id => {
                const el = document.getElementById(id);
                if (!el) return;
                const parent = el.closest('li') || el.closest('a');
                if (parent) parent.style.display = 'none';
            });
        }
    }

    // ================= 5. UI PANEL CREATION =================
    function createDragDropPanel(nav, initialOrder, initialHidden) {
        // Clean up previous instances
        const existing = document.getElementById("ghl-sidebar-manager");
        if(existing) existing.remove();

        const panel = document.createElement("div");
        panel.id = "ghl-sidebar-manager";
        panel.style.cssText = `
            position: fixed; top: 100px; right: 20px; width: 300px;
            background: white; border: 1px solid #ccc; z-index: 99999999;
            padding: 16px; border-radius: 8px; box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            font-family: sans-serif; max-height: 80vh; overflow-y: auto;
        `;

        panel.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:12px; border-bottom:1px solid #eee; padding-bottom:8px;">
                <h3 id="drag-drop-title" style="margin:0; font-size:16px; font-weight:bold;">${CONFIG.PANEL_TITLE}</h3>
                <button id="ghl-close-btn" style="border:none; bg:transparent; cursor:pointer;">❌</button>
            </div>
            <p style="font-size:12px; color:#666; margin-bottom:10px;">
                Drag to reorder. Click eye to toggle visibility.<br>
                <b>Location:</b> ${getLocationId()}
            </p>
            <ul id="orderList" style="list-style:none; padding:0; margin:0;"></ul>
            <div style="display:flex; gap:10px; margin-top:15px;">
                <button id="save-btn" style="flex:1; padding:8px; background:#3b82f6; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:bold;">Save Changes</button>
                <button id="reset-btn" style="width:30%; padding:8px; background:#ef4444; color:white; border:none; border-radius:4px; cursor:pointer;">Reset</button>
            </div>
        `;
        document.body.appendChild(panel);

        const list = panel.querySelector("#orderList");
        
        // Populate List from DOM (which is already ordered by applySavedOrder)
        // We filter for elements that have IDs starting with 'sb_' or containing 'menu' to avoid grabbing random UI elements
        const sidebarItems = Array.from(nav.querySelectorAll('[id]')).filter(el => {
            return (el.id.startsWith('sb_') || el.id.includes('menu')) && el.offsetParent !== null; // attempt to only get visible structural items
        });

        // Fallback if filter is too strict: get all LIs with IDs
        const itemsToProcess = sidebarItems.length > 0 ? sidebarItems : nav.querySelectorAll('li[id], a[id]');

        itemsToProcess.forEach(item => {
            const li = document.createElement("li");
            li.dataset.id = item.id;
            li.draggable = true;
            
            const isHidden = initialHidden.includes(item.id);
            
            // Get label text safely
            let label = item.innerText.trim();
            if(!label) label = item.getAttribute('title') || item.id;
            if(label.length > 25) label = label.substring(0, 22) + "...";

            li.style.cssText = `
                padding: 10px; margin-bottom: 6px; border-radius: 6px;
                background: ${isHidden ? '#fee2e2' : '#f3f4f6'};
                border: 1px solid ${isHidden ? '#fecaca' : '#e5e7eb'};
                display: flex; justify-content: space-between; align-items: center;
                cursor: grab; transition: all 0.2s;
            `;

            li.innerHTML = `
                <span style="font-size:13px; font-weight:500;">${label}</span>
                <button class="toggle-eye" style="border:none; background:transparent; cursor:pointer; font-size:16px;">
                    ${isHidden ? '🙈' : '👁️'}
                </button>
            `;

            // --- Toggle Visibility ---
            li.querySelector('.toggle-eye').addEventListener('click', (e) => {
                e.stopPropagation();
                const btn = e.target;
                const nowHidden = btn.innerText === '👁️';
                
                btn.innerText = nowHidden ? '🙈' : '👁️';
                li.style.background = nowHidden ? '#fee2e2' : '#f3f4f6';
                li.style.border = nowHidden ? '1px solid #fecaca' : '1px solid #e5e7eb';
                
                // Immediate Preview
                const domEl = document.getElementById(item.id);
                const domParent = domEl ? (domEl.closest('li') || domEl.closest('a')) : null;
                if(domParent) domParent.style.display = nowHidden ? 'none' : '';
            });

            // --- Drag Events ---
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

        // --- Save Button Click ---
        document.getElementById('save-btn').addEventListener('click', () => {
            // Scrape Order
            const newOrder = [...list.querySelectorAll('li')].map(li => li.dataset.id);
            // Scrape Hidden
            const newHidden = [...list.querySelectorAll('li')]
                .filter(li => li.querySelector('.toggle-eye').innerText === '🙈')
                .map(li => li.dataset.id);

            console.log("💾 Save Clicked. Order:", newOrder.length, "Hidden:", newHidden.length);
            
            // 1. Send to API
            postMenuData(newOrder, newHidden);
            
            // 2. Ensure DOM is perfectly synced
            applySavedOrder(nav, newOrder, newHidden);
        });

        // --- Reset & Close ---
        document.getElementById('reset-btn').addEventListener('click', resetMenuData);
        document.getElementById('ghl-close-btn').addEventListener('click', () => panel.remove());
    }

    // ================= 6. INIT SEQUENCE =================
    waitForSidebar(async (nav) => {
        // 1. Get Data
        const apiData = await fetchMenuData();
        const savedOrder = apiData.order || [];
        const hiddenItems = apiData.hidden || [];

        // 2. Apply Data (Visual Update)
        applySavedOrder(nav, savedOrder, hiddenItems);

        // 3. Render Panel
        createDragDropPanel(nav, savedOrder, hiddenItems);
    });

})();