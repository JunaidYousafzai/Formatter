(function() {
    // ================= CONFIG =================
    const CONFIG = {
        PANEL_TITLE: "Sidebar Menu Manager",
        // ✅ FIXED: Pointing to your real backend
        API_BASE: "https://theme-customizer-production.up.railway.app/api", 
        // Get Token from GHL window object
        AUTH_TOKEN: window.TOKEN 
    };

    // ================= HELPER: GET LOCATION ID =================
    function getLocationId() {
        // 1. Try URL path
        const match = window.location.pathname.match(/\/location\/([a-zA-Z0-9]+)/);
        if (match && match[1]) return match[1];
        
        // 2. Try URL Query Params
        const params = new URLSearchParams(window.location.search);
        if (params.get('locationId')) return params.get('locationId');
        if (params.get('location')) return params.get('location');

        // 3. Try GHL DOM elements (Agency/Subaccount switchers)
        const switcher = document.querySelector('.hl_switcher-loc-name');
        if (switcher && switcher.dataset && switcher.dataset.locationId) {
            return switcher.dataset.locationId;
        }

        // 4. Fallback (If checking in generic area)
        console.warn("Could not detect Location ID. Using default fallback.");
        return 'qzPk2iMXCzGuEt5FA6Ll'; 
    }

    // ================= HELPER: WAIT FOR SIDEBAR =================
    function waitForSidebar(callback) {
        const check = setInterval(() => {
            const nav = document.querySelector('#sidebar-v2 nav') || document.querySelector('.sidebar-v2-location nav');
            if (nav && nav.querySelectorAll('li').length > 0) {
                clearInterval(check);
                callback(nav);
            }
        }, 300);
    }

    // ================= API: GET MENU DATA =================
    async function fetchMenuData() {
        const locationId = getLocationId();
        const url = `${CONFIG.API_BASE}/side-menu/${locationId}`;
        console.log("Fetching menu from:", url);

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-theme-key': CONFIG.AUTH_TOKEN
                }
            });
            
            if (!response.ok) throw new Error(`API Error: ${response.status}`);
            return await response.json();
        } catch (err) {
            console.warn("Could not fetch menu (using local/default):", err);
            return null;
        }
    }

    // ================= API: POST DATA (SAVE) =================
    function postMenuData(order, hiddenItems) {
        const locationId = getLocationId();
        const url = `${CONFIG.API_BASE}/side-menu/save/${locationId}`;
        const payload = { order, hidden: hiddenItems };

        console.log("Saving to:", url);

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
            console.log("Menu saved successfully:", data);
            // Visual feedback on the panel title
            const title = document.querySelector("#drag-drop-title");
            if(title) {
                const oldText = title.innerText;
                title.innerText = "Saved! ✅";
                title.style.color = "green";
                setTimeout(() => {
                    title.innerText = oldText;
                    title.style.color = "inherit";
                }, 2000);
            }
        })
        .catch(err => {
            console.error("Menu save failed:", err);
            alert("Failed to save menu order. Check console for details.");
        });
    }

    // ================= API: DELETE DATA (RESET) =================
    function resetMenuData() {
        const locationId = getLocationId();
        const url = `${CONFIG.API_BASE}/side-menu/${locationId}`;
        
        if(!confirm("Are you sure you want to reset the sidebar to default?")) return;

        console.log("Resetting menu at:", url);

        fetch(url, {
            method: 'DELETE',
            headers: { 
                'Content-Type': 'application/json',
                'x-theme-key': CONFIG.AUTH_TOKEN
            }
        })
        .then(() => {
            console.log("Menu reset successfully");
            // Clear local cache just in case
            localStorage.removeItem("ghl_sidebar_order");
            localStorage.removeItem("ghl_sidebar_hidden");
            location.reload(); // Reload to restore DOM
        })
        .catch(err => console.error("Menu reset failed:", err));
    }

    // ================= DOM: APPLY ORDER AND HIDDEN =================
    function applySavedOrder(nav, savedOrder, hiddenItems) {
        // 1. Apply order
        if (savedOrder && savedOrder.length > 0) {
            savedOrder.forEach(id => {
                const el = document.getElementById(id);
                if (!el) return;
                const parent = el.closest('li') || el.closest('a');
                if (parent && parent.parentElement === nav) nav.appendChild(parent);
            });
        }

        // 2. Apply hidden
        if (hiddenItems && hiddenItems.length > 0) {
            hiddenItems.forEach(id => {
                const el = document.getElementById(id);
                if (!el) return;
                const parent = el.closest('li') || el.closest('a');
                if (parent) parent.style.display = 'none';
            });
        }

        // 3. Ensure visible items are shown (if unhidden)
        nav.querySelectorAll('[id]').forEach(item => {
            // Filter out internal GHL ids that aren't menu items
            if(!item.id.startsWith('sb_') && !item.id.includes('menu')) return; 

            const parent = item.closest('li') || item.closest('a');
            if (parent && (!hiddenItems || !hiddenItems.includes(item.id))) {
                parent.style.display = '';
            }
        });
    }

    // ================= UI: CREATE DRAG-DROP PANEL =================
    function createDragDropPanel(nav, initialOrder, initialHidden) {
        // Clean up any existing panel
        const existing = document.getElementById("ghl-sidebar-manager-panel");
        if(existing) existing.remove();

        const hiddenItems = initialHidden || [];

        const panel = document.createElement("div");
        panel.id = "ghl-sidebar-manager-panel";
        panel.style = `
            position: fixed;
            top: 80px;
            right: 20px;
            width: 280px;
            max-height: 70vh;
            overflow-y: auto;
            background: #fff;
            box-shadow: 0 10px 25px rgba(0,0,0,0.15);
            z-index: 999999;
            padding: 16px;
            border-radius: 12px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            border: 1px solid #e5e7eb;
        `;
        
        panel.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid #eee; padding-bottom:8px;">
                <h3 id="drag-drop-title" style="margin:0; font-size:15px; font-weight:600; color:#111827;">${CONFIG.PANEL_TITLE}</h3>
                <button id="btn-reset-api" style="font-size:11px; background:#FEE2E2; color:#B91C1C; border:1px solid #FECACA; padding:4px 8px; border-radius:4px; cursor:pointer; font-weight:500;">Reset</button>
            </div>
            <p style="font-size:12px; color:#6B7280; margin-bottom:12px;">Drag items to reorder. Click the eye icon to hide/show.</p>
            <ul id="orderList" style="list-style:none; margin:0; padding:0;"></ul>
        `;
        document.body.appendChild(panel);

        // Attach Reset Event
        document.getElementById('btn-reset-api').addEventListener('click', resetMenuData);

        const list = panel.querySelector("#orderList");

        // Build list from DOM (which is already sorted by applySavedOrder)
        nav.querySelectorAll("[id]").forEach(item => {
            // Filter: Only process valid sidebar IDs
            if ((!item.id.startsWith('sb_') && !item.id.includes('menu'))) return;

            const li = document.createElement("li");
            
            // Get clean label
            let label = item.innerText.trim();
            if(!label) label = item.getAttribute('title') || item.id;

            li.setAttribute("data-id", item.id);
            const isHidden = hiddenItems.includes(item.id);

            li.style = `
                padding: 10px;
                margin-bottom: 6px;
                background: ${isHidden ? '#FEF2F2' : 'white'};
                border: 1px solid ${isHidden ? '#FECACA' : '#E5E7EB'};
                border-radius: 6px;
                cursor: grab;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 13px;
                transition: all 0.2s ease;
            `;
            li.draggable = true;

            // HTML content for list item
            li.innerHTML = `
                <div style="display:flex; align-items:center; gap:8px; overflow:hidden;">
                    <span style="color:#9CA3AF; font-size:12px;">☰</span>
                    <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-weight:500; color:${isHidden ? '#991B1B' : '#374151'}">${label}</span>
                </div>
                <button class="toggle-btn" style="border:none; background:transparent; cursor:pointer; font-size:14px;">
                    ${isHidden ? '🙈' : '👁️'}
                </button>
            `;

            // Drag events
            li.addEventListener("dragstart", e => {
                e.dataTransfer.setData("text/plain", li.dataset.id);
                e.dataTransfer.effectAllowed = 'move';
                li.style.opacity = '0.5';
            });
            li.addEventListener("dragend", e => {
                li.style.opacity = '1';
                // Remove drag-over styles
                list.querySelectorAll('li').forEach(el => el.style.borderTop = '');
            });
            li.addEventListener("dragover", e => {
                e.preventDefault();
            });
            li.addEventListener("drop", e => {
                e.preventDefault();
                const draggedId = e.dataTransfer.getData("text/plain");
                const draggedEl = list.querySelector(`[data-id='${draggedId}']`);
                if(draggedEl && draggedEl !== li) {
                    list.insertBefore(draggedEl, li);
                    savePanelState(nav);
                }
            });

            // Toggle Visibility Event
            const btn = li.querySelector(".toggle-btn");
            btn.addEventListener("click", (e) => {
                e.stopPropagation(); 
                toggleItem(item.id, nav, btn, li);
            });

            list.appendChild(li);
        });
    }

    // ================= STATE HANDLER =================
    function savePanelState(nav) {
        // Scrape the state from the UI Panel
        const order = [...document.querySelectorAll("#orderList li")].map(li => li.dataset.id);
        
        // Find items that are visually marked as hidden
        const hiddenItems = [...document.querySelectorAll("#orderList li")]
            .filter(li => li.querySelector(".toggle-btn").innerText.includes('🙈'))
            .map(li => li.dataset.id);

        // Update Real Sidebar DOM immediately
        applySavedOrder(nav, order, hiddenItems);
        
        // Send to API
        postMenuData(order, hiddenItems); 
    }

    function toggleItem(id, nav, btn, li) {
        const isCurrentlyHidden = btn.innerText.includes('🙈');

        if (isCurrentlyHidden) {
            // Unhide it
            btn.innerText = "👁️";
            li.style.background = 'white';
            li.style.border = '1px solid #E5E7EB';
            li.querySelector('span:nth-child(2)').style.color = '#374151';
        } else {
            // Hide it
            btn.innerText = "🙈";
            li.style.background = '#FEF2F2';
            li.style.border = '1px solid #FECACA';
            li.querySelector('span:nth-child(2)').style.color = '#991B1B';
        }

        // Now save the state based on the UI
        savePanelState(nav);
    }

    // ================= INIT =================
    waitForSidebar(async (nav) => {
        console.log("🚀 Sidebar detected. Initializing Manager...");
        
        // 1. Get Data from API
        let apiData = await fetchMenuData();
        
        let savedOrder = [];
        let hiddenItems = [];

        if (apiData && (apiData.order || apiData.hidden)) {
            console.log("✅ Config loaded from API");
            savedOrder = apiData.order || [];
            hiddenItems = apiData.hidden || [];
        } else {
            console.log("⚠️ No API config found (or error), checking local storage...");
            savedOrder = JSON.parse(localStorage.getItem("ghl_sidebar_order") || "[]");
            hiddenItems = JSON.parse(localStorage.getItem("ghl_sidebar_hidden") || "[]");
        }

        // 2. Apply to DOM immediately
        applySavedOrder(nav, savedOrder, hiddenItems);

        // 3. Render the Management Panel
        createDragDropPanel(nav, savedOrder, hiddenItems);
    });

})();