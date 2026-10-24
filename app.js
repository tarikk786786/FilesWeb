/**
 * Files Web - Business Edition (Chrome MV3)
 * Full-featured modern WinUI-styled File Manager for Chrome
 */

// IndexedDB Storage Helper for FileSystemDirectoryHandle persistence
const DB_NAME = "FilesWebDB";
const STORE_NAME = "handles";

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveHandleToDB(id, handle, name) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({ id, handle, name, timestamp: Date.now() });
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn("IndexedDB save failed:", err);
    return false;
  }
}

async function getSavedHandlesFromDB() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    return new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch (err) {
    return [];
  }
}

// Global Application State
const state = {
  tabs: [],
  activeTabId: null,
  currentSort: "name",
  sortAsc: true,
  viewMode: "grid", // 'grid' | 'details'
  searchQuery: "",
  tagFilter: "all",
  tags: JSON.parse(localStorage.getItem("files_web_tags") || "{}"),
  contextTarget: null,
  activePreviewFile: null,
  activePreviewHandle: null,
};

// Tag Color Map
const TAG_COLORS = {
  red: "#ff4d4f",
  blue: "#1890ff",
  green: "#52c41a",
  purple: "#722ed1"
};

// Virtual Demo File System (fallback / instant test)
const DEMO_FS = {
  name: "My Business Workspace",
  isDir: true,
  children: [
    {
      name: "Documents",
      isDir: true,
      children: [
        { name: "Q4_Business_Strategy.md", isDir: false, size: 4096, type: "text/markdown", content: "# Q4 Business Strategy\n\n- Scale e-commerce partnerships\n- Optimize SEO backlink performance\n- Modernize local file workflows in Chrome" },
        { name: "Client_Agreements.txt", isDir: false, size: 2120, type: "text/plain", content: "Client Agreement 2026\nAccount: Tarik Business Services\nStatus: Active & Verified" }
      ]
    },
    {
      name: "Projects",
      isDir: true,
      children: [
        { name: "CommerceCalc_Specs.json", isDir: false, size: 1024, type: "application/json", content: '{\n  "version": "1.0.0",\n  "name": "CommerceCalc",\n  "status": "Production"\n}' },
        { name: "Automations_Workflow.py", isDir: false, size: 3150, type: "text/x-python", content: '# Automation Worker\nimport os\n\ndef run_pipeline():\n    print("Automating business operations...")\n\nif __name__ == "__main__":\n    run_pipeline()\n' }
      ]
    },
    { name: "README.md", isDir: false, size: 1450, type: "text/markdown", content: "# Files Web Business Edition\n\nWelcome to your modern workspace files hub in Google Chrome!" },
    { name: "app_config.json", isDir: false, size: 512, type: "application/json", content: '{\n  "theme": "dark",\n  "profile": "Tarik Business",\n  "engine": "WinUI3-Fluent"\n}' }
  ]
};

// --- Initialization ---
document.addEventListener("DOMContentLoaded", async () => {
  setupEventListeners();
  await loadPinnedWorkspaces();
  
  // Create first default tab
  createNewTab("Home", null, []);
});

// Setup DOM event handlers
function setupEventListeners() {
  document.getElementById("btnAddTab").addEventListener("click", () => {
    createNewTab("New Tab", null, []);
  });

  document.getElementById("btnOpenFolder").addEventListener("click", () => handleSelectDirectory());
  document.getElementById("welcomeOpenBtn").addEventListener("click", () => handleSelectDirectory());
  document.getElementById("sidebarOpenFolderBtn").addEventListener("click", () => handleSelectDirectory());
  document.getElementById("btnLoadDemoWorkspace").addEventListener("click", () => loadDemoWorkspace());

  // View switchers
  document.getElementById("btnViewGrid").addEventListener("click", () => setViewMode("grid"));
  document.getElementById("btnViewDetails").addEventListener("click", () => setViewMode("details"));

  // Navigation
  document.getElementById("btnNavBack").addEventListener("click", () => navigateBack());
  document.getElementById("btnNavForward").addEventListener("click", () => navigateForward());
  document.getElementById("btnNavUp").addEventListener("click", () => navigateUp());
  document.getElementById("btnNavRefresh").addEventListener("click", () => refreshCurrentDirectory());

  // Search
  const searchInput = document.getElementById("searchInput");
  const btnClearSearch = document.getElementById("btnClearSearch");
  searchInput.addEventListener("input", (e) => {
    state.searchQuery = e.target.value.toLowerCase().trim();
    btnClearSearch.style.display = state.searchQuery ? "block" : "none";
    renderActiveDirectory();
  });
  btnClearSearch.addEventListener("click", () => {
    searchInput.value = "";
    state.searchQuery = "";
    btnClearSearch.style.display = "none";
    renderActiveDirectory();
  });

  // Toolbar actions
  document.getElementById("btnNewFolder").addEventListener("click", () => handleCreateFolder());
  document.getElementById("btnNewFile").addEventListener("click", () => handleCreateFile());
  document.getElementById("btnSortMenu").addEventListener("click", () => toggleSort());

  // Tag filters
  document.querySelectorAll(".tag-filter-item").forEach(item => {
    item.addEventListener("click", (e) => {
      document.querySelectorAll(".tag-filter-item").forEach(i => i.classList.remove("active"));
      item.classList.add("active");
      state.tagFilter = item.getAttribute("data-tag");
      renderActiveDirectory();
    });
  });

  // Modal Preview
  document.getElementById("btnClosePreview").addEventListener("click", closePreviewModal);
  document.getElementById("btnSavePreview").addEventListener("click", savePreviewFile);
  document.getElementById("previewModal").addEventListener("click", (e) => {
    if (e.target.id === "previewModal") closePreviewModal();
  });

  // Context Menu
  document.addEventListener("click", () => hideContextMenu());
  setupContextMenuHandlers();

  // Keyboard Shortcuts
  window.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key === "t") {
      e.preventDefault();
      createNewTab("New Tab", null, []);
    } else if (e.ctrlKey && e.key === "o") {
      e.preventDefault();
      handleSelectDirectory();
    } else if (e.key === "Escape") {
      closePreviewModal();
      hideContextMenu();
    }
  });
}

// --- Tab Management ---
function createNewTab(title, handle, pathStack = []) {
  const tabId = "tab_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4);
  const newTab = {
    id: tabId,
    title: title || "Home",
    handle: handle || null,
    pathStack: pathStack, // array of folder names
    handleStack: handle ? [handle] : [],
    history: [],
    historyIndex: -1,
    items: [],
    isVirtual: false
  };

  state.tabs.push(newTab);
  switchTab(tabId);
  renderTabs();
}

function switchTab(tabId) {
  state.activeTabId = tabId;
  renderTabs();
  const tab = getActiveTab();
  if (tab) {
    if (tab.handle || tab.isVirtual) {
      loadDirectoryContents(tab);
    } else {
      showWelcomeScreen();
    }
  }
}

function closeTab(tabId, e) {
  if (e) e.stopPropagation();
  const idx = state.tabs.findIndex(t => t.id === tabId);
  if (idx === -1) return;

  state.tabs.splice(idx, 1);
  if (state.tabs.length === 0) {
    createNewTab("Home", null, []);
  } else if (state.activeTabId === tabId) {
    const nextIdx = Math.max(0, idx - 1);
    switchTab(state.tabs[nextIdx].id);
  } else {
    renderTabs();
  }
}

function getActiveTab() {
  return state.tabs.find(t => t.id === state.activeTabId);
}

function renderTabs() {
  const container = document.getElementById("tabsContainer");
  container.innerHTML = "";

  state.tabs.forEach(tab => {
    const tabEl = document.createElement("div");
    tabEl.className = `tab-item ${tab.id === state.activeTabId ? "active" : ""}`;
    tabEl.innerHTML = `
      <span class="tab-icon">${tab.handle ? "📁" : "🏠"}</span>
      <span class="tab-title">${escapeHtml(tab.title)}</span>
      <span class="tab-close" title="Close Tab">&times;</span>
    `;

    tabEl.addEventListener("click", () => switchTab(tab.id));
    tabEl.querySelector(".tab-close").addEventListener("click", (e) => closeTab(tab.id, e));
    container.appendChild(tabEl);
  });
}

// --- Directory Picker & Traversal ---
async function handleSelectDirectory() {
  if (!window.showDirectoryPicker) {
    alert("The File System Access API is not supported in this browser version. Loading demo workspace instead.");
    loadDemoWorkspace();
    return;
  }

  try {
    const dirHandle = await window.showDirectoryPicker({ mode: "readwrite" });
    const tab = getActiveTab();
    if (tab) {
      tab.handle = dirHandle;
      tab.title = dirHandle.name;
      tab.pathStack = [dirHandle.name];
      tab.handleStack = [dirHandle];
      tab.isVirtual = false;
      renderTabs();
      await saveHandleToDB(dirHandle.name, dirHandle, dirHandle.name);
      await loadPinnedWorkspaces();
      await loadDirectoryContents(tab);
    }
  } catch (err) {
    if (err.name !== "AbortError") {
      console.error("Error opening directory:", err);
      alert("Failed to open directory: " + err.message);
    }
  }
}

async function loadDirectoryContents(tab) {
  if (!tab) return;
  hideWelcomeScreen();
  updateToolbarState(true);

  if (tab.isVirtual) {
    renderActiveDirectory();
    return;
  }

  const currentDirHandle = tab.handleStack[tab.handleStack.length - 1];
  const items = [];

  try {
    for await (const entry of currentDirHandle.values()) {
      let size = 0;
      let lastModified = Date.now();
      let mimeType = "";

      if (entry.kind === "file") {
        try {
          const file = await entry.getFile();
          size = file.size;
          lastModified = file.lastModified;
          mimeType = file.type;
        } catch (e) {}
      }

      items.push({
        name: entry.name,
        isDir: entry.kind === "directory",
        handle: entry,
        size: size,
        lastModified: lastModified,
        mimeType: mimeType,
        tag: state.tags[entry.name] || null
      });
    }

    tab.items = items;
    renderBreadcrumbs(tab);
    renderActiveDirectory();
    updateNavButtons(tab);
  } catch (err) {
    console.error("Failed to read directory:", err);
    tab.items = [];
    renderActiveDirectory();
  }
}

// --- Demo Workspace Fallback ---
function loadDemoWorkspace() {
  const tab = getActiveTab();
  if (!tab) return;
  tab.isVirtual = true;
  tab.title = "Business Workspace";
  tab.pathStack = ["My Business Workspace"];
  tab.items = DEMO_FS.children.map(item => ({
    name: item.name,
    isDir: item.isDir,
    size: item.size || 0,
    lastModified: Date.now() - 3600000,
    mimeType: item.type || "",
    virtualObj: item,
    tag: state.tags[item.name] || null
  }));

  renderTabs();
  hideWelcomeScreen();
  updateToolbarState(false); // Disable physical file write buttons on demo
  renderBreadcrumbs(tab);
  renderActiveDirectory();
}

// --- Render Files (Grid & Details) ---
function renderActiveDirectory() {
  const tab = getActiveTab();
  if (!tab) return;

  const gridContainer = document.getElementById("filesViewGrid");
  const tableBody = document.getElementById("filesTableBody");
  gridContainer.innerHTML = "";
  tableBody.innerHTML = "";

  let list = [...(tab.items || [])];

  // Search filtering
  if (state.searchQuery) {
    list = list.filter(item => item.name.toLowerCase().includes(state.searchQuery));
  }

  // Tag filtering
  if (state.tagFilter !== "all") {
    list = list.filter(item => state.tags[item.name] === state.tagFilter);
  }

  // Sorting
  list.sort((a, b) => {
    // Folders always first
    if (a.isDir && !b.isDir) return -1;
    if (!a.isDir && b.isDir) return 1;

    let res = 0;
    if (state.currentSort === "name") {
      res = a.name.localeCompare(b.name);
    } else if (state.currentSort === "size") {
      res = (a.size || 0) - (b.size || 0);
    } else if (state.currentSort === "date") {
      res = (a.lastModified || 0) - (b.lastModified || 0);
    } else if (state.currentSort === "type") {
      const extA = getFileExtension(a.name);
      const extB = getFileExtension(b.name);
      res = extA.localeCompare(extB);
    }
    return state.sortAsc ? res : -res;
  });

  // Status bar
  const folderCount = list.filter(i => i.isDir).length;
  const fileCount = list.length - folderCount;
  document.getElementById("statusBarSummary").textContent = `${list.length} items (${folderCount} folders, ${fileCount} files)`;

  if (list.length === 0) {
    const emptyMsg = `<div class="empty-hint" style="grid-column: 1/-1; text-align:center; padding: 48px 0;">This folder is empty or no items match your filter.</div>`;
    gridContainer.innerHTML = emptyMsg;
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 32px;">This folder is empty.</td></tr>`;
    return;
  }

  list.forEach(item => {
    const icon = getFileIcon(item);
    const tag = state.tags[item.name];
    const tagDot = tag ? `<span class="file-tag-pill" style="background:${TAG_COLORS[tag] || '#888'};"></span>` : "";

    // Grid Card
    const card = document.createElement("div");
    card.className = "file-card";
    card.innerHTML = `
      ${tagDot}
      <div class="file-icon">${icon}</div>
      <div class="file-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div>
      <div class="file-meta">${item.isDir ? "Folder" : formatBytes(item.size)}</div>
    `;

    card.addEventListener("click", () => selectItem(card));
    card.addEventListener("dblclick", () => handleItemOpen(item));
    card.addEventListener("contextmenu", (e) => showContextMenu(e, item));
    gridContainer.appendChild(card);

    // Table Row
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="col-name">
        <div class="table-file-name">
          <span>${icon}</span>
          <span>${escapeHtml(item.name)}</span>
        </div>
      </td>
      <td class="col-date">${formatDate(item.lastModified)}</td>
      <td class="col-type">${item.isDir ? "Folder" : getFileExtension(item.name).toUpperCase() || "File"}</td>
      <td class="col-size">${item.isDir ? "--" : formatBytes(item.size)}</td>
      <td class="col-tag">${tag ? `<span class="tag-badge-dot" style="background:${TAG_COLORS[tag]};"></span>` : ""}</td>
      <td class="col-actions">
        <button class="icon-btn" title="Preview" style="padding: 2px 6px;">👁️</button>
      </td>
    `;
    tr.addEventListener("click", () => selectTableRow(tr));
    tr.addEventListener("dblclick", () => handleItemOpen(item));
    tr.addEventListener("contextmenu", (e) => showContextMenu(e, item));
    tr.querySelector(".col-actions button").addEventListener("click", (e) => {
      e.stopPropagation();
      openPreviewModal(item);
    });
    tableBody.appendChild(tr);
  });
}

function selectItem(card) {
  document.querySelectorAll(".file-card").forEach(c => c.classList.remove("selected"));
  card.classList.add("selected");
}

function selectTableRow(tr) {
  document.querySelectorAll(".files-view-table tr").forEach(r => r.classList.remove("selected"));
  tr.classList.add("selected");
}

async function handleItemOpen(item) {
  const tab = getActiveTab();
  if (!tab) return;

  if (item.isDir) {
    if (tab.isVirtual) {
      if (item.virtualObj && item.virtualObj.children) {
        tab.pathStack.push(item.name);
        tab.items = item.virtualObj.children.map(c => ({
          name: c.name,
          isDir: c.isDir,
          size: c.size || 0,
          lastModified: Date.now(),
          mimeType: c.type || "",
          virtualObj: c,
          tag: state.tags[c.name] || null
        }));
        renderBreadcrumbs(tab);
        renderActiveDirectory();
        updateNavButtons(tab);
      }
    } else {
      tab.pathStack.push(item.name);
      tab.handleStack.push(item.handle);
      await loadDirectoryContents(tab);
    }
  } else {
    // Open preview
    openPreviewModal(item);
  }
}

// --- Navigation Operations ---
async function navigateUp() {
  const tab = getActiveTab();
  if (!tab || tab.pathStack.length <= 1) return;

  tab.pathStack.pop();
  if (!tab.isVirtual) {
    tab.handleStack.pop();
    await loadDirectoryContents(tab);
  } else {
    loadDemoWorkspace();
  }
}

function navigateBack() {
  navigateUp();
}

function navigateForward() {
  // Can be extended with detailed forward history
}

async function refreshCurrentDirectory() {
  const tab = getActiveTab();
  if (tab) {
    if (!tab.isVirtual && tab.handle) {
      await loadDirectoryContents(tab);
    } else if (tab.isVirtual) {
      renderActiveDirectory();
    }
  }
}

function updateNavButtons(tab) {
  const btnUp = document.getElementById("btnNavUp");
  const btnBack = document.getElementById("btnNavBack");
  const canGoUp = tab.pathStack && tab.pathStack.length > 1;
  btnUp.disabled = !canGoUp;
  btnBack.disabled = !canGoUp;
}

function renderBreadcrumbs(tab) {
  const bar = document.getElementById("breadcrumbBar");
  bar.innerHTML = "";

  tab.pathStack.forEach((seg, idx) => {
    if (idx > 0) {
      const sep = document.createElement("span");
      sep.className = "breadcrumb-sep";
      sep.textContent = ">";
      bar.appendChild(sep);
    }

    const item = document.createElement("span");
    item.className = "breadcrumb-item";
    item.textContent = seg;
    item.addEventListener("click", async () => {
      if (idx === tab.pathStack.length - 1) return;
      tab.pathStack = tab.pathStack.slice(0, idx + 1);
      if (!tab.isVirtual) {
        tab.handleStack = tab.handleStack.slice(0, idx + 1);
        await loadDirectoryContents(tab);
      }
    });
    bar.appendChild(item);
  });
}

// --- View Modes ---
function setViewMode(mode) {
  state.viewMode = mode;
  const gridContainer = document.getElementById("filesViewGrid");
  const tableContainer = document.getElementById("filesViewTable");
  const btnGrid = document.getElementById("btnViewGrid");
  const btnDetails = document.getElementById("btnViewDetails");

  if (mode === "grid") {
    gridContainer.style.display = "grid";
    tableContainer.style.display = "none";
    btnGrid.classList.add("active");
    btnDetails.classList.remove("active");
  } else {
    gridContainer.style.display = "none";
    tableContainer.style.display = "table";
    btnGrid.classList.remove("active");
    btnDetails.classList.add("active");
  }
}

// --- New Folder & New File ---
async function handleCreateFolder() {
  const tab = getActiveTab();
  if (!tab || tab.isVirtual) return;

  const folderName = prompt("Enter new folder name:");
  if (!folderName || !folderName.trim()) return;

  const curDirHandle = tab.handleStack[tab.handleStack.length - 1];
  try {
    await curDirHandle.getDirectoryHandle(folderName.trim(), { create: true });
    await loadDirectoryContents(tab);
  } catch (err) {
    alert("Could not create folder: " + err.message);
  }
}

async function handleCreateFile() {
  const tab = getActiveTab();
  if (!tab || tab.isVirtual) return;

  const fileName = prompt("Enter new file name (e.g. notes.txt, index.js):");
  if (!fileName || !fileName.trim()) return;

  const curDirHandle = tab.handleStack[tab.handleStack.length - 1];
  try {
    await curDirHandle.getFileHandle(fileName.trim(), { create: true });
    await loadDirectoryContents(tab);
  } catch (err) {
    alert("Could not create file: " + err.message);
  }
}

// --- Preview & Editor Modal ---
async function openPreviewModal(item) {
  const modal = document.getElementById("previewModal");
  const modalBody = document.getElementById("previewModalBody");
  const modalTitle = document.getElementById("previewModalTitle");
  const modalBadge = document.getElementById("previewModalBadge");
  const btnSave = document.getElementById("btnSavePreview");
  const footerInfo = document.getElementById("previewModalFooterInfo");

  modalTitle.textContent = item.name;
  footerInfo.textContent = `Size: ${formatBytes(item.size)} • Modified: ${formatDate(item.lastModified)}`;
  btnSave.style.display = "none";
  modalBody.innerHTML = `<div style="color:#aaa; text-align:center; padding: 40px;">Loading file content...</div>`;
  modal.style.display = "flex";

  state.activePreviewFile = item;
  state.activePreviewHandle = item.handle || null;

  const ext = getFileExtension(item.name).toLowerCase();

  // If virtual demo item
  if (item.virtualObj) {
    modalBadge.textContent = "Virtual Preview";
    renderTextOrCode(item.virtualObj.content || "", ext, false);
    return;
  }

  // Real FileHandle
  try {
    const file = await item.handle.getFile();
    modalBadge.textContent = file.type || ext.toUpperCase() || "File";

    if (isImageExtension(ext)) {
      const url = URL.createObjectURL(file);
      modalBody.innerHTML = `
        <div class="preview-img-container">
          <img src="${url}" alt="${item.name}">
        </div>
      `;
    } else if (isVideoExtension(ext)) {
      const url = URL.createObjectURL(file);
      modalBody.innerHTML = `
        <div style="display:flex; justify-content:center; align-items:center; height:100%;">
          <video controls autoplay src="${url}" style="max-width:100%; max-height:100%; border-radius:6px;"></video>
        </div>
      `;
    } else if (isAudioExtension(ext)) {
      const url = URL.createObjectURL(file);
      modalBody.innerHTML = `
        <div style="display:flex; flex-direction:column; justify-content:center; align-items:center; height:100%; gap: 16px;">
          <div style="font-size: 48px;">🎵</div>
          <audio controls autoplay src="${url}"></audio>
        </div>
      `;
    } else if (ext === "md") {
      const text = await file.text();
      modalBody.innerHTML = `<div class="preview-markdown-view">${simpleMarkdownToHtml(text)}</div>`;
      btnSave.style.display = "none";
    } else {
      // Default to editable text/code
      const text = await file.text();
      renderTextOrCode(text, ext, true);
    }
  } catch (err) {
    modalBody.innerHTML = `<div style="color:#ff6b6b; padding: 24px;">Failed to read file: ${escapeHtml(err.message)}</div>`;
  }
}

function renderTextOrCode(text, ext, canSave) {
  const modalBody = document.getElementById("previewModalBody");
  const btnSave = document.getElementById("btnSavePreview");

  modalBody.innerHTML = `
    <textarea class="preview-code-editor" id="codeEditorArea" spellcheck="false">${escapeHtml(text)}</textarea>
  `;

  if (canSave) {
    btnSave.style.display = "flex";
  }
}

async function savePreviewFile() {
  if (!state.activePreviewHandle) return;
  const editor = document.getElementById("codeEditorArea");
  if (!editor) return;

  try {
    const writable = await state.activePreviewHandle.createWritable();
    await writable.write(editor.value);
    await writable.close();
    alert("Changes saved to disk successfully!");
  } catch (err) {
    alert("Could not save changes: " + err.message);
  }
}

function closePreviewModal() {
  document.getElementById("previewModal").style.display = "none";
  state.activePreviewFile = null;
  state.activePreviewHandle = null;
}

// --- Context Menu & Tags ---
function setupContextMenuHandlers() {
  const ctx = document.getElementById("contextMenu");

  document.getElementById("ctxOpen").addEventListener("click", () => {
    if (state.contextTarget) handleItemOpen(state.contextTarget);
    hideContextMenu();
  });

  document.getElementById("ctxPreview").addEventListener("click", () => {
    if (state.contextTarget) openPreviewModal(state.contextTarget);
    hideContextMenu();
  });

  document.getElementById("ctxDelete").addEventListener("click", async () => {
    if (!state.contextTarget) return;
    const tab = getActiveTab();
    if (!tab || tab.isVirtual) return;

    if (confirm(`Are you sure you want to delete "${state.contextTarget.name}"?`)) {
      try {
        const curDirHandle = tab.handleStack[tab.handleStack.length - 1];
        await curDirHandle.removeEntry(state.contextTarget.name, { recursive: state.contextTarget.isDir });
        await loadDirectoryContents(tab);
      } catch (err) {
        alert("Failed to delete: " + err.message);
      }
    }
    hideContextMenu();
  });

  document.querySelectorAll(".tag-dot-picker").forEach(picker => {
    picker.addEventListener("click", (e) => {
      e.stopPropagation();
      const tag = picker.getAttribute("data-tag");
      if (state.contextTarget) {
        if (tag === "none") {
          delete state.tags[state.contextTarget.name];
        } else {
          state.tags[state.contextTarget.name] = tag;
        }
        localStorage.setItem("files_web_tags", JSON.stringify(state.tags));
        renderActiveDirectory();
      }
      hideContextMenu();
    });
  });
}

function showContextMenu(e, item) {
  e.preventDefault();
  state.contextTarget = item;
  const ctx = document.getElementById("contextMenu");
  ctx.style.display = "block";
  ctx.style.left = `${Math.min(e.clientX, window.innerWidth - 180)}px`;
  ctx.style.top = `${Math.min(e.clientY, window.innerHeight - 180)}px`;
}

function hideContextMenu() {
  document.getElementById("contextMenu").style.display = "none";
}

// --- Pinned Workspaces in Sidebar ---
async function loadPinnedWorkspaces() {
  const listEl = document.getElementById("pinnedWorkspacesList");
  const saved = await getSavedHandlesFromDB();

  if (!saved || saved.length === 0) {
    listEl.innerHTML = `<div class="empty-hint">Click Choose Folder to pin workspace</div>`;
    return;
  }

  listEl.innerHTML = "";
  saved.forEach(item => {
    const btn = document.createElement("button");
    btn.className = "sidebar-item";
    btn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M9.828 3h3.982a2 2 0 0 1 1.992 2.181l-.637 7A2 2 0 0 1 13.174 14H2.825a2 2 0 0 1-1.991-1.819l-.637-7a1.99 1.99 0 0 1 .342-1.31L.5 3a2 2 0 0 1 2-2h3.672a2 2 0 0 1 1.414.586l.828.828A2 2 0 0 0 9.828 3z"/></svg>
      <span>${escapeHtml(item.name)}</span>
    `;
    btn.addEventListener("click", async () => {
      try {
        const queryPermission = await item.handle.queryPermission({ mode: "readwrite" });
        if (queryPermission !== "granted") {
          const req = await item.handle.requestPermission({ mode: "readwrite" });
          if (req !== "granted") return;
        }
        createNewTab(item.name, item.handle, [item.name]);
      } catch (e) {
        console.warn("Could not activate pinned handle:", e);
      }
    });
    listEl.appendChild(btn);
  });
}

// --- Helpers ---
function showWelcomeScreen() {
  document.getElementById("welcomeScreen").style.display = "flex";
  document.getElementById("filesContainer").style.display = "none";
  updateToolbarState(false);
}

function hideWelcomeScreen() {
  document.getElementById("welcomeScreen").style.display = "none";
  document.getElementById("filesContainer").style.display = "block";
}

function updateToolbarState(enabled) {
  document.getElementById("btnNewFolder").disabled = !enabled;
  document.getElementById("btnNewFile").disabled = !enabled;
}

function toggleSort() {
  const modes = ["name", "date", "size", "type"];
  const curIdx = modes.indexOf(state.currentSort);
  state.currentSort = modes[(curIdx + 1) % modes.length];
  document.getElementById("currentSortLabel").textContent = state.currentSort.charAt(0).toUpperCase() + state.currentSort.slice(1);
  renderActiveDirectory();
}

function getFileExtension(filename) {
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop() : "";
}

function isImageExtension(ext) {
  return ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"].includes(ext);
}

function isVideoExtension(ext) {
  return ["mp4", "webm", "ogg", "mov"].includes(ext);
}

function isAudioExtension(ext) {
  return ["mp3", "wav", "aac", "m4a", "flac"].includes(ext);
}

function getFileIcon(item) {
  if (item.isDir) return "📁";
  const ext = getFileExtension(item.name).toLowerCase();
  if (isImageExtension(ext)) return "🖼️";
  if (isVideoExtension(ext)) return "🎬";
  if (isAudioExtension(ext)) return "🎵";
  if (["js", "ts", "py", "html", "css", "json", "sql", "sh", "bat", "ps1"].includes(ext)) return "📜";
  if (["md", "txt", "rtf"].includes(ext)) return "📝";
  if (["pdf"].includes(ext)) return "📄";
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return "📦";
  return "📄";
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDate(timestamp) {
  if (!timestamp) return "--";
  const d = new Date(timestamp);
  return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function simpleMarkdownToHtml(md) {
  if (!md) return "";
  let html = escapeHtml(md);
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  html = html.replace(/^\- (.*$)/gim, '<li>$1</li>');
  html = html.replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>');
  html = html.replace(/\*(.*)\*/gim, '<em>$1</em>');
  html = html.replace(/\n/gim, '<br>');
  return html;
}
