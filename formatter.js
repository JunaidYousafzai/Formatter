
// ================= CONFIG =================
const PANEL_TITLE = "Sidebar Menu Manager";
const API_URL = "https://theme-customizer-production.up.railway.app/api"

// ================= WAIT FOR SIDEBAR =================
function waitForSidebar(callback) {
  const check = setInterval(() => {
    const nav = document.querySelector('#sidebar-v2 nav');
    if (nav) {
      clearInterval(check);
      callback(nav);
    }
  }, 300);
}

// ================= POST DATA TO API =================
function postMenuData(order, hiddenItems) {
  const payload = { order, hidden: hiddenItems };
  
  fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  .then(res => res.json())
  .then(data => console.log("Menu saved:", data))
  .catch(err => console.error("Menu save failed:", err));
}

// ================= APPLY ORDER AND HIDDEN =================
function applySavedOrder(nav, savedOrder, hiddenItems) {
  // Apply order
  savedOrder.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const parent = el.closest('li, a, div');
    if (parent && parent.parentElement === nav) nav.appendChild(parent);
  });

  // Apply hidden
  hiddenItems.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const parent = el.closest('li, a, div');
    if (parent) parent.style.display = 'none';
  });

  // Show all visible items
  nav.querySelectorAll('[id]').forEach(item => {
    const parent = item.closest('li, a, div');
    if (parent && !hiddenItems.includes(item.id)) parent.style.display = '';
  });
}

// ================= CREATE DRAG-DROP PANEL =================
function createDragDropPanel(nav) {
  const savedOrder = JSON.parse(localStorage.getItem("ghl_sidebar_order") || "[]");
  const hiddenItems = JSON.parse(localStorage.getItem("ghl_sidebar_hidden") || "[]");

  const panel = document.createElement("div");
  panel.style = `
    position: fixed;
    top: 80px;
    right: 20px;
    width: 280px;
    max-height: 70vh;
    overflow-y: auto;
    background: #fff;
    box-shadow: 0 4px 12px rgba(0,0,0,0.25);
    z-index: 999999;
    padding: 12px;
    border-radius: 8px;
    font-family: sans-serif;
  `;
  panel.innerHTML = `
    <h3 style="margin:0 0 10px;font-size:16px;">${PANEL_TITLE}</h3>
    <p style="font-size:12px;opacity:0.7;margin-bottom:8px;">Drag to reorder. Click Hide/Show to toggle menus.</p>
    <ul id="orderList" style="list-style:none;margin:0;padding:0;"></ul>
  `;
  document.body.appendChild(panel);

  const list = panel.querySelector("#orderList");

  nav.querySelectorAll("[id]").forEach(item => {
    const li = document.createElement("li");
    li.innerText = item.innerText.trim() || item.id;
    li.setAttribute("data-id", item.id);
    li.style = `
      padding: 8px;
      margin-bottom: 6px;
      background: ${hiddenItems.includes(item.id) ? '#f5c6cb' : '#f1f1f1'};
      border-radius: 6px;
      cursor: grab;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
    `;
    li.draggable = true;

    // Drag events
    li.addEventListener("dragstart", e => {
      e.dataTransfer.setData("text/plain", li.dataset.id);
    });
    li.addEventListener("dragover", e => e.preventDefault());
    li.addEventListener("drop", e => {
      e.preventDefault();
      const draggedId = e.dataTransfer.getData("text/plain");
      const draggedEl = list.querySelector(`[data-id='${draggedId}']`);
      list.insertBefore(draggedEl, li);
      savePanelState(nav);
    });

    // Hide/Show button
    const btn = document.createElement("button");
    btn.innerText = hiddenItems.includes(item.id) ? "Show" : "Hide";
    btn.style = `
      font-size:10px;
      padding:2px 5px;
      border:none;
      border-radius:4px;
      cursor:pointer;
    `;
    btn.addEventListener("click", () => {
      toggleItem(item.id, nav, btn);
    });
    li.appendChild(btn);

    list.appendChild(li);
  });

  savePanelState(nav);
}

// ================= SAVE STATE =================
function savePanelState(nav) {
  const order = [...document.querySelectorAll("#orderList li")].map(li => li.dataset.id);
  const hiddenItems = [...document.querySelectorAll("#orderList li button")].filter(b=>b.innerText==="Show").map(b=>b.parentElement.dataset.id);

  localStorage.setItem("ghl_sidebar_order", JSON.stringify(order));
  localStorage.setItem("ghl_sidebar_hidden", JSON.stringify(hiddenItems));

  applySavedOrder(nav, order, hiddenItems);
  postMenuData(order, hiddenItems); // <-- send to API
}

// ================= TOGGLE HIDE/SHOW =================
function toggleItem(id, nav, btn) {
  const order = [...document.querySelectorAll("#orderList li")].map(li => li.dataset.id);
  let hiddenItems = [...document.querySelectorAll("#orderList li button")].filter(b=>b.innerText==="Show").map(b=>b.parentElement.dataset.id);

  if (btn.innerText === "Hide") {
    btn.innerText = "Show";
    hiddenItems.push(id);
  } else {
    btn.innerText = "Hide";
    hiddenItems = hiddenItems.filter(x => x !== id);
  }

  localStorage.setItem("ghl_sidebar_hidden", JSON.stringify(hiddenItems));
  applySavedOrder(nav, order, hiddenItems);
  postMenuData(order, hiddenItems);
}

// ================= INIT =================
waitForSidebar(nav => {
  const savedOrder = JSON.parse(localStorage.getItem("ghl_sidebar_order") || "[]");
  const hiddenItems = JSON.parse(localStorage.getItem("ghl_sidebar_hidden") || "[]");
  applySavedOrder(nav, savedOrder, hiddenItems);
  createDragDropPanel(nav);
});



