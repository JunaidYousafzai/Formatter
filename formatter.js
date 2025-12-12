// (function() {
//     console.clear();
//     console.log("%c🚀 STARTING ZERO-LATENCY SIDEBAR MANAGER...", "background: #059669; color: white; font-weight: bold; padding: 4px;");

//     const CONFIG = {
//         PANEL_TITLE: "Sidebar Manager",
//         API_BASE: "https://theme-customizer-production.up.railway.app/api", 
//         AUTH_TOKEN: window.TOKEN || "" 
//     };

//     // Helper to generate a unique cache key per sub-account
//     function getCacheKey() {
//         return `ghl_sidebar_cache_${getLocationId()}`;
//     }

//     let CACHED_STATE = { order: [], hidden: [], isLoaded: false };

//     // ================= 1. HELPERS =================
//     function getLocationId() {
//         const path = window.location.pathname;
//         let match = path.match(/\/location\/([a-zA-Z0-9]+)/);
//         if (match && match[1]) return match[1];

//         const params = new URLSearchParams(window.location.search);
//         if (params.get('locationId')) return params.get('locationId');
        
//         const domain = window.location.hostname;
//         const cleanDomain = domain.replace(/^www\./, '').replace(/\./g, '_');
//         return `agency_${cleanDomain}`;
//     }

//     function findSidebar() {
//         return document.querySelector('#sidebar-v2 nav') || 
//                document.querySelector('.sidebar-v2-location nav') ||
//                document.querySelector('.hl_nav-header nav') ||
//                document.querySelector('nav'); 
//     }

//     function getLabel(el) {
//         const textNode = el.querySelector('span, div');
//         return textNode ? textNode.innerText.trim() : (el.innerText.trim() || el.id);
//     }

//     // ================= 2. DATA MANAGEMENT (CACHE + API) =================
    
//     // Load from LocalStorage (Instant)
//     function loadFromLocalCache() {
//         try {
//             const raw = localStorage.getItem(getCacheKey());
//             if (raw) {
//                 const data = JSON.parse(raw);
//                 CACHED_STATE.order = data.order || [];
//                 CACHED_STATE.hidden = data.hidden || [];
//                 CACHED_STATE.isLoaded = true;
//                 console.log("⚡ Loaded from Local Cache (Instant Apply)");
//                 return true;
//             }
//         } catch (e) {
//             console.warn("Cache parse error", e);
//         }
//         return false;
//     }

//     // Load from API (Background Sync)
//     async function fetchMenuData() {
//         const id = getLocationId();
        
//         // 1. Try applying from cache first for speed
//         const hasCache = loadFromLocalCache();
//         const nav = findSidebar();
//         if (hasCache && nav) applyDOMChanges(nav);

//         console.log(`📥 Syncing with API: ${id}`);
        
//         try {
//             const url = `${CONFIG.API_BASE}/side-menu/${id}?t=${Date.now()}`;
//             const res = await fetch(url, {
//                 headers: { 'Content-Type': 'application/json', 'x-theme-key': CONFIG.AUTH_TOKEN }
//             });
            
//             if (res.status === 404) return;
//             const raw = await res.json();

//             let newOrder = [];
//             let newHidden = [];

//             if (raw.sideMenuContent) {
//                 newOrder = raw.sideMenuContent.order || [];
//                 newHidden = raw.sideMenuContent.hidden || [];
//             } else if (raw.order) {
//                 newOrder = raw.order;
//                 newHidden = raw.hidden;
//             }

//             // Update State
//             CACHED_STATE.order = newOrder;
//             CACHED_STATE.hidden = newHidden;
//             CACHED_STATE.isLoaded = true;

//             // Save to LocalStorage for next time
//             localStorage.setItem(getCacheKey(), JSON.stringify({ order: newOrder, hidden: newHidden }));
            
//             console.log("✅ API Sync Complete");
            
//             // Re-apply in case API had newer data than cache
//             if(nav) {
//                 applyDOMChanges(nav);
//                 // Refresh panel if open
//                 if(document.getElementById("ghl-sidebar-manager")) createPanel(nav);
//             }

//         } catch (err) {
//             console.error("API Error (Using Cache):", err);
//         }
//     }

//     function postMenuData(order, hidden) {
//         const id = getLocationId();
        
//         // 1. Update State & Cache Immediately
//         CACHED_STATE.order = order;
//         CACHED_STATE.hidden = hidden;
//         CACHED_STATE.isLoaded = true;
//         localStorage.setItem(getCacheKey(), JSON.stringify({ order, hidden }));

//         console.log("📤 Saving Data...");

//         // 2. Send to API in background
//         fetch(`${CONFIG.API_BASE}/side-menu/save/${id}`, {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json', 'x-theme-key': CONFIG.AUTH_TOKEN },
//             body: JSON.stringify({ order, hidden })
//         }).then(async (res) => {
//             const btn = document.getElementById('ghl-save-btn');
//             if(btn) { btn.innerText = "Saved! ✅"; setTimeout(() => btn.innerText = "Save Changes", 2000); }
//         });
//     }

//     function resetMenuData() {
//         if(!confirm("Reset sidebar layout to default?")) return;
//         const id = getLocationId();
        
//         // 1. Clear Cache & State
//         localStorage.removeItem(getCacheKey());
//         CACHED_STATE = { order: [], hidden: [], isLoaded: true };
        
//         // 2. Instant Visual Reset (No Reload needed)
//         const nav = findSidebar();
//         if(nav) {
//             // Reset CSS
//             nav.querySelectorAll('li, a').forEach(el => {
//                 el.style.order = "9999";
//                 el.style.display = "";
//             });
//             // Update Panel if open
//             if(document.getElementById("ghl-sidebar-manager")) createPanel(nav);
//         }

//         // 3. Call API Delete
//         fetch(`${CONFIG.API_BASE}/side-menu/${id}`, {
//             method: 'DELETE',
//             headers: { 'Content-Type': 'application/json', 'x-theme-key': CONFIG.AUTH_TOKEN }
//         }).then(() => {
//             console.log("✅ API Reset Complete");
//         });
//     }

//     // ================= 3. CSS ENFORCER =================
//     function applyDOMChanges(nav) {
//         if (!CACHED_STATE.isLoaded || !nav) return;

//         const { order, hidden } = CACHED_STATE;

//         nav.style.display = "flex";
//         nav.style.flexDirection = "column";

//         // 1. Reset
//         const allItems = nav.querySelectorAll('li, a');
//         allItems.forEach(el => {
//             el.style.order = "9999"; 
//             el.style.display = "";   
//         });

//         // 2. Apply Order
//         order.forEach((id, index) => {
//             const el = document.getElementById(id);
//             if (el) {
//                 const container = el.closest('li') || el.closest('a') || el;
//                 if (container.parentElement === nav) {
//                     container.style.order = index;
//                 }
//             }
//         });

//         // 3. Apply Hidden
//         hidden.forEach(id => {
//             const el = document.getElementById(id);
//             if (el) {
//                 const container = el.closest('li') || el.closest('a') || el;
//                 container.style.display = "none !important";
//                 container.setAttribute('hidden', 'true');
//             }
//         });
//     }

//     // ================= 4. UI PANEL =================
//     function createPanel(nav) {
//         const existing = document.getElementById("ghl-sidebar-manager");
//         if (existing) existing.remove();

//         const panel = document.createElement("div");
//         panel.id = "ghl-sidebar-manager";
//         panel.style.cssText = `
//             position: fixed; top: 100px; right: 20px; width: 280px; 
//             background: white; border: 2px solid #7c3aed; z-index: 99999999; 
//             padding: 16px; border-radius: 8px; box-shadow: 0 10px 50px rgba(0,0,0,0.3);
//             font-family: sans-serif; max-height: 80vh; overflow-y: auto;
//         `;
        
//         panel.innerHTML = `
//             <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
//                 <h3 style="margin:0; font-size:15px; font-weight:bold;">${CONFIG.PANEL_TITLE}</h3>
//                 <button id="ghl-close-btn" style="border:none; bg:transparent; cursor:pointer;">❌</button>
//             </div>
//             <p style="font-size:10px; color:#666; margin-bottom:10px;">ID: <b>${getLocationId()}</b></p>
//             <ul id="ghl-sort-list" style="list-style:none; padding:0; margin:0;"></ul>
//             <div style="display:flex; gap:10px; margin-top:15px;">
//                 <button id="ghl-save-btn" style="flex:1; padding:8px; background:#3b82f6; color:white; border:none; border-radius:4px; cursor:pointer;">Save</button>
//                 <button id="ghl-reset-btn" style="width:30%; padding:8px; background:#ef4444; color:white; border:none; border-radius:4px; cursor:pointer;">Reset</button>
//             </div>
//         `;
//         document.body.appendChild(panel);

//         const list = panel.querySelector("#ghl-sort-list");
        
//         // Merge Saved Order with current DOM items
//         const domItems = Array.from(nav.querySelectorAll('li, a')).filter(el => el.id && (el.id.includes('sb_') || el.id.includes('menu')));
//         let displayItems = [];

//         // Add saved items first
//         CACHED_STATE.order.forEach(savedId => {
//             const found = domItems.find(el => el.id === savedId);
//             if (found) displayItems.push(found);
//         });

//         // Add remaining items
//         domItems.forEach(el => {
//             if (!CACHED_STATE.order.includes(el.id)) displayItems.push(el);
//         });

//         // Render List
//         displayItems.forEach(el => {
//             const isHidden = CACHED_STATE.hidden.includes(el.id);
//             const li = document.createElement("li");
//             li.dataset.id = el.id;
//             li.draggable = true;
//             li.style.cssText = `
//                 padding: 10px; margin-bottom: 5px; border-radius: 4px;
//                 background: ${isHidden ? '#fee2e2' : '#f3f4f6'};
//                 border: 1px solid #e5e7eb; display: flex; justify-content: space-between; cursor: move;
//             `;
//             li.innerHTML = `
//                 <span style="font-size:13px; font-weight:500; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; max-width:180px;">${getLabel(el)}</span>
//                 <button class="toggle-eye" style="border:none; background:transparent; cursor:pointer;">${isHidden ? '🙈' : '👁️'}</button>
//             `;
            
//             li.querySelector('.toggle-eye').addEventListener('click', (e) => {
//                 const btn = e.target;
//                 const hide = btn.innerText === '👁️';
//                 btn.innerText = hide ? '🙈' : '👁️';
//                 li.style.background = hide ? '#fee2e2' : '#f3f4f6';
//             });

//             li.addEventListener('dragstart', () => li.classList.add('dragging'));
//             li.addEventListener('dragend', () => li.classList.remove('dragging'));
//             list.appendChild(li);
//         });

//         // Drag Logic
//         list.addEventListener('dragover', e => {
//             e.preventDefault();
//             const dragging = list.querySelector('.dragging');
//             const siblings = [...list.querySelectorAll('li:not(.dragging)')];
//             const next = siblings.find(sib => e.clientY <= sib.getBoundingClientRect().top + sib.offsetHeight / 2);
//             list.insertBefore(dragging, next);
//         });

//         // Actions
//         document.getElementById('ghl-save-btn').addEventListener('click', () => {
//             const newOrder = [...list.querySelectorAll('li')].map(li => li.dataset.id);
//             const newHidden = [...list.querySelectorAll('li')].filter(li => li.querySelector('.toggle-eye').innerText === '🙈').map(li => li.dataset.id);
//             postMenuData(newOrder, newHidden);
//             applyDOMChanges(nav);
//         });
//         document.getElementById('ghl-close-btn').addEventListener('click', () => panel.remove());
//         document.getElementById('ghl-reset-btn').addEventListener('click', resetMenuData);
//     }

//     // ================= 5. MAIN EXECUTION =================
//     fetchMenuData().then(() => {
//         // Run forever to enforce styles against GHL re-renders
//         setInterval(() => {
//             const nav = findSidebar();
//             if (nav) {
//                 applyDOMChanges(nav);
//                 // Draw panel only if sidebar exists and panel is missing
//                 if (!document.getElementById("ghl-sidebar-manager")) {
//                     createPanel(nav);
//                 }
//             }
//         }, 500);
//     });

// })();



(function() {
    console.clear();
    console.log("%c🚀 STARTING SPA-READY SIDEBAR MANAGER...", "background: #0ea5e9; color: white; font-weight: bold; padding: 4px;");

    const CONFIG = {
        PANEL_TITLE: "Sidebar Manager",
        API_BASE: "https://theme-customizer-production.up.railway.app/api", 
        AUTH_TOKEN: window.TOKEN || "" 
    };

    // State
    let CACHED_STATE = { order: [], hidden: [], isLoaded: false };
    let activeNav = null; // Tracks the currently active sidebar element
    let sidebarObserver = null; // Watches for GHL re-renders
    let isApplying = false;

    // ================= 1. HELPERS =================
    function getLocationId() {
        const path = window.location.pathname;
        let match = path.match(/\/location\/([a-zA-Z0-9]+)/);
        if (match && match[1]) return match[1];

        const params = new URLSearchParams(window.location.search);
        if (params.get('locationId')) return params.get('locationId');
        
        const domain = window.location.hostname;
        const cleanDomain = domain.replace(/^www\./, '').replace(/\./g, '_');
        return `agency_${cleanDomain}`;
    }

    function findSidebar() {
        // Broad search for any sidebar nav currently on screen
        return document.querySelector('#sidebar-v2 nav') || 
               document.querySelector('.sidebar-v2-location nav') ||
               document.querySelector('.hl_nav-header nav') ||
               document.querySelector('nav'); 
    }

    function getLabel(el) {
        const textNode = el.querySelector('span, div');
        return textNode ? textNode.innerText.trim() : (el.innerText.trim() || el.id);
    }

    // ================= 2. API LOGIC =================
    async function fetchMenuData() {
        const id = getLocationId();
        try {
            const url = `${CONFIG.API_BASE}/side-menu/${id}?t=${Date.now()}`;
            const res = await fetch(url, {
                headers: { 'Content-Type': 'application/json', 'x-theme-key': CONFIG.AUTH_TOKEN }
            });
            
            let newOrder = [];
            let newHidden = [];

            if (res.status !== 404) {
                const raw = await res.json();
                console.log("📥 API Data Recieved:", raw);
                
                // Parse diverse response structures
                if (raw.sideMenuContent) {
                    newOrder = raw.sideMenuContent.order || [];
                    newHidden = raw.sideMenuContent.hidden || [];
                } else if (raw.order) {
                    newOrder = raw.order;
                    newHidden = raw.hidden;
                }
            }

            CACHED_STATE.order = newOrder;
            CACHED_STATE.hidden = newHidden;
            CACHED_STATE.isLoaded = true;

            // Apply immediately to whatever nav is currently active
            if(activeNav) applyDOMChanges(activeNav);

        } catch (err) {
            console.error("API Error:", err);
        }
    }

    function postMenuData(newOrderPartial, newHiddenPartial) {
        const id = getLocationId();
        
        // --- SMART MERGE LOGIC ---
        // We don't want to overwrite 'Dashboard' settings when saving 'Settings' page
        // 1. Start with existing cached state
        let finalOrder = [...CACHED_STATE.order];
        let finalHidden = [...CACHED_STATE.hidden];

        // 2. Remove any items in the new list from the old global lists (to prevent duplicates)
        finalOrder = finalOrder.filter(id => !newOrderPartial.includes(id));
        finalHidden = finalHidden.filter(id => !newOrderPartial.includes(id)); // If it's in the new list, we trust the new hidden state

        // 3. Append the new state
        // (Note: This puts current page items at the end of the global saved list, which is fine)
        finalOrder = [...finalOrder, ...newOrderPartial];
        
        // 4. Update hidden array
        // Add newly hidden items
        newHiddenPartial.forEach(id => {
            if(!finalHidden.includes(id)) finalHidden.push(id);
        });
        // Remove items that are now visible in the new list
        finalHidden = finalHidden.filter(id => {
            // Keep it hidden if it's NOT in the current page's list
            // OR if it IS in the current page's list AND is supposed to be hidden
            if (newOrderPartial.includes(id)) {
                return newHiddenPartial.includes(id);
            }
            return true;
        });

        // Update Cache
        CACHED_STATE.order = finalOrder;
        CACHED_STATE.hidden = finalHidden;
        CACHED_STATE.isLoaded = true;

        console.log("📤 Saving Merged Data...", { finalOrder, finalHidden });

        fetch(`${CONFIG.API_BASE}/side-menu/save/${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-theme-key': CONFIG.AUTH_TOKEN },
            body: JSON.stringify({ order: finalOrder, hidden: finalHidden })
        }).then(async (res) => {
            const btn = document.getElementById('ghl-save-btn');
            if(btn) { btn.innerText = "Saved! ✅"; setTimeout(() => btn.innerText = "Save Changes", 2000); }
        });
    }

    function resetMenuData() {
        if(!confirm("Reset ALL sidebar layouts for this location?")) return;
        const id = getLocationId();
        fetch(`${CONFIG.API_BASE}/side-menu/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', 'x-theme-key': CONFIG.AUTH_TOKEN }
        }).then(() => location.reload());
    }

    // ================= 3. DOM ENFORCER (CSS) =================
    function applyDOMChanges(nav) {
        if (!CACHED_STATE.isLoaded || !nav) return;
        
        // Prevent recursive loop if observer is active
        if(isApplying) return;
        isApplying = true;

        const { order, hidden } = CACHED_STATE;

        nav.style.display = "flex";
        nav.style.flexDirection = "column";

        // 1. Reset everything first
        const allItems = nav.querySelectorAll('li, a');
        allItems.forEach(el => {
            el.style.order = "99999"; 
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

        setTimeout(() => isApplying = false, 50);
    }

    // ================= 4. UI PANEL (DYNAMIC REFRESH) =================
    function renderListItems(nav, listElement) {
        listElement.innerHTML = "";
        
        // Filter DOM items
        const domItems = Array.from(nav.querySelectorAll('li, a')).filter(el => el.id && (el.id.includes('sb_') || el.id.includes('menu')));
        
        // Sort display based on CACHED ORDER
        let displayItems = [];
        
        // Add saved items first
        CACHED_STATE.order.forEach(savedId => {
            const found = domItems.find(el => el.id === savedId);
            if (found) displayItems.push(found);
        });

        // Add remaining items
        domItems.forEach(el => {
            if (!CACHED_STATE.order.includes(el.id)) displayItems.push(el);
        });

        if (displayItems.length === 0) {
            listElement.innerHTML = "<div style='padding:10px; color:#666; text-align:center;'>No menu items found.<br><small>Try refreshing.</small></div>";
            return;
        }

        displayItems.forEach(el => {
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
            listElement.appendChild(li);
        });
    }

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
        
        // Initial Render
        renderListItems(nav, list);

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
            // Get current page order only
            const newOrder = [...list.querySelectorAll('li')].map(li => li.dataset.id);
            const newHidden = [...list.querySelectorAll('li')].filter(li => li.querySelector('.toggle-eye').innerText === '🙈').map(li => li.dataset.id);
            
            postMenuData(newOrder, newHidden);
            applyDOMChanges(nav);
        });
        document.getElementById('ghl-close-btn').addEventListener('click', () => panel.remove());
        document.getElementById('ghl-reset-btn').addEventListener('click', resetMenuData);
    }

    // ================= 5. MAIN LOOP (SPA AWARE) =================
    // Initial fetch
    fetchMenuData().then(() => {
        
        // Continuous check to detect Page Navigation
        setInterval(() => {
            const currentNav = findSidebar();

            // 1. Sidebar found!
            if (currentNav) {
                
                // 2. DETECT NAVIGATION CHANGE:
                // If the sidebar element in the DOM is different from the one we were tracking,
                // it means GHL navigated and replaced the sidebar.
                if (currentNav !== activeNav) {
                    console.log("📍 SPA Navigation Detected: Sidebar Refreshed");
                    activeNav = currentNav;
                    
                    // Re-apply styles immediately
                    applyDOMChanges(activeNav);

                    // Re-attach Observer
                    if (sidebarObserver) sidebarObserver.disconnect();
                    sidebarObserver = new MutationObserver(() => applyDOMChanges(activeNav));
                    sidebarObserver.observe(activeNav, { childList: true, subtree: true });

                    // Update Panel Content if open
                    const panelList = document.querySelector("#ghl-sort-list");
                    if (panelList) {
                        console.log("🔄 Refreshing Panel List...");
                        renderListItems(activeNav, panelList);
                    }
                    
                    // Optional: Create panel if not exists
                    if (!document.getElementById("ghl-sidebar-manager")) {
                         createPanel(activeNav);
                    }
                }
            } else {
                activeNav = null; // Lost sidebar
            }
        }, 500);
    });

})();









