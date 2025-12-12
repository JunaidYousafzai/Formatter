(function() {
    console.log("🚀 Script started...");

    // ================= CONFIG =================
    const CONFIG = {
        PANEL_TITLE: "Sidebar Menu Manager",
        API_BASE: "https://theme-customizer-production.up.railway.app/api",
        AUTH_TOKEN: window.TOKEN 
    };

    // ================= HELPER: GET LOCATION ID =================
    function getLocationId() {
        const match = window.location.pathname.match(/\/location\/([a-zA-Z0-9]+)/);
        if (match && match[1]) return match[1];
        const params = new URLSearchParams(window.location.search);
        return params.get('locationId') || 'qzPk2iMXCzGuEt5FA6Ll'; 
    }

    // ================= HELPER: WAIT FOR SIDEBAR =================
    function waitForSidebar(callback) {
        console.log("⏳ Waiting for sidebar...");
        let attempts = 0;
        const check = setInterval(() => {
            attempts++;
            // Try multiple selectors common in GHL
            const nav = document.querySelector('#sidebar-v2 nav') || 
                        document.querySelector('.sidebar-v2-location nav') ||
                        document.querySelector('nav'); 

            if (nav && nav.querySelectorAll('li').length > 0) {
                console.log("✅ Sidebar found!", nav);
                clearInterval(check);
                callback(nav);
            } else if (attempts > 20) {
                console.warn("⚠️ Sidebar not found after 6 seconds. Forcing mount anyway...");
                clearInterval(check);
                // Create a dummy nav just to show the panel if sidebar is missing
                callback(document.body); 
            }
        }, 300);
    }

    // ================= API CALLS =================
    async function fetchMenuData() {
        const locationId = getLocationId();
        try {
            const res = await fetch(`${CONFIG.API_BASE}/side-menu/${locationId}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json', 'x-theme-key': CONFIG.AUTH_TOKEN }
            });
            if (!res.ok) throw new Error('API Error');
            return await res.json();
        } catch (err) {
            console.warn("⚠️ API Load failed, using defaults:", err);
            return null;
        }
    }

    function postMenuData(order, hidden) {
        const locationId = getLocationId();
        fetch(`${CONFIG.API_BASE}/side-menu/save/${locationId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-theme-key': CONFIG.AUTH_TOKEN },
            body: JSON.stringify({ order, hidden })
        }).then(() => console.log("Saved!"));
    }

    // ================= UI CREATION =================
    function createPanel(nav, order, hidden) {
        console.log("🛠️ Creating Management Panel...");
        
        // Remove existing if any
        const existing = document.getElementById("ghl-sidebar-manager");
        if (existing) existing.remove();

        const panel = document.createElement("div");
        panel.id = "ghl-sidebar-manager";
        
        // Force high z-index and fixed positioning
        panel.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            width: 300px;
            background: white;
            border: 2px solid #3b82f6;
            z-index: 2147483647; 
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            font-family: sans-serif;
            max-height: 80vh;
            overflow-y: auto;
        `;

        panel.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                <h3 style="margin:0; font-size:16px;">${CONFIG.PANEL_TITLE}</h3>
                <button onclick="this.parentElement.parentElement.remove()" style="border:none; bg:transparent; cursor:pointer;">❌</button>
            </div>
            <p style="font-size:12px; color:#666;">Drag to reorder. Click eye to toggle.</p>
            <ul id="sortable-list" style="list-style:none; padding:0; margin:0;"></ul>
            <button id="save-btn" style="width:100%; margin-top:10px; padding:8px; background:#3b82f6; color:white; border:none; border-radius:4px; cursor:pointer;">Save Changes</button>
        `;

        document.body.appendChild(panel);
        console.log("✅ Panel injected into DOM");

        const list = panel.querySelector("#sortable-list");
        
        // Get all sidebar items (exclude the manager panel itself)
        const sidebarItems = Array.from(nav.querySelectorAll('[id]'))
            .filter(el => el.id && !el.closest('#ghl-sidebar-manager'));

        if (sidebarItems.length === 0) {
            list.innerHTML = "<li style='color:red;'>No sidebar items found with IDs.</li>";
            return;
        }

        sidebarItems.forEach(el => {
            const isHidden = hidden.includes(el.id);
            const li = document.createElement("li");
            li.dataset.id = el.id;
            li.draggable = true;
            li.style.cssText = `
                padding: 8px;
                margin-bottom: 4px;
                background: ${isHidden ? '#fee2e2' : '#f3f4f6'};
                border: 1px solid #e5e7eb;
                border-radius: 4px;
                display: flex;
                justify-content: space-between;
                cursor: move;
            `;
            
            let label = el.innerText.trim() || el.getAttribute('title') || el.id;
            // Truncate long text
            if(label.length > 25) label = label.substring(0, 22) + '...';

            li.innerHTML = `
                <span>${label}</span>
                <button class="toggle-eye" style="border:none; background:none; cursor:pointer;">
                    ${isHidden ? '🙈' : '👁️'}
                </button>
            `;

            // Drag Events
            li.addEventListener('dragstart', e => {
                e.dataTransfer.setData('text/plain', null);
                li.classList.add('dragging');
            });
            li.addEventListener('dragend', () => li.classList.remove('dragging'));
            
            // Visibility Toggle
            li.querySelector('.toggle-eye').addEventListener('click', (e) => {
                e.stopPropagation(); // prevent triggering drag
                const btn = e.target;
                const currentHidden = btn.innerText === '🙈';
                if (currentHidden) {
                    btn.innerText = '👁️';
                    li.style.background = '#f3f4f6';
                    el.style.display = '';
                } else {
                    btn.innerText = '🙈';
                    li.style.background = '#fee2e2';
                    el.style.display = 'none';
                }
            });

            list.appendChild(li);
        });

        // Simple sortable logic
        list.addEventListener('dragover', e => {
            e.preventDefault();
            const dragging = list.querySelector('.dragging');
            const siblings = [...list.querySelectorAll('li:not(.dragging)')];
            const nextSibling = siblings.find(sibling => {
                return e.clientY <= sibling.getBoundingClientRect().top + sibling.offsetHeight / 2;
            });
            list.insertBefore(dragging, nextSibling);
        });

        // Save Button Logic
        document.getElementById('save-btn').addEventListener('click', () => {
            const newOrder = [...list.querySelectorAll('li')].map(li => li.dataset.id);
            const newHidden = [...list.querySelectorAll('li')]
                .filter(li => li.querySelector('.toggle-eye').innerText === '🙈')
                .map(li => li.dataset.id);
            
            // Apply to DOM
            newOrder.forEach(id => {
                const el = document.getElementById(id);
                if (el && el.parentElement === nav) nav.appendChild(el); // only sort direct children if possible, simplistic approach
            });

            postMenuData(newOrder, newHidden);
        });
    }

    // ================= INIT =================
    waitForSidebar(async (nav) => {
        const data = await fetchMenuData();
        const order = data?.order || [];
        const hidden = data?.hidden || [];
        
        // Initial Apply
        if (hidden.length) {
            hidden.forEach(id => {
                const el = document.getElementById(id);
                if(el) el.style.display = 'none';
            });
        }
        
        createPanel(nav, order, hidden);
    });

})();