# Files Manager - Business Edition (Chrome MV3)

A modern, high-performance file manager application and browser extension crafted with the Microsoft Fluent Design System / WinUI 3 aesthetic, built specifically for Google Chrome and the **Tarik Business** profile.

## Overview & Purpose

Files Manager Web brings the elegance and multitasking power of modern file managers (like the native Windows `files-community/Files` app) directly into Google Chrome. Leveraging the native **HTML5 File System Access API**, it provides full local workspace directory management without requiring any external cloud uploads or node servers.

### Key Features
* **Multi-Tab Workspace**: Open and manage multiple folder tabs with independent navigation history and state.
* **Native File System API**: Directly browse local PC directories, create folders, add files, and save changes back to disk with full read/write permission control.
* **Rich File Previews**:
  * **Code & Text**: Integrated code editor with live editing and one-click disk saving.
  * **Markdown**: Formatted live markdown rendering.
  * **Media**: Direct image zooming, audio playback, and HTML5 video streaming.
* **Dual View Modes**: Switch between responsive Grid View and sortable Details Table View.
* **Color Tagging System**: Tag files with priority markers (Red: Urgent, Blue: Business, Green: Final, Purple: Review).
* **IndexedDB Workspace Persistence**: Pinned folders and handles persist across browser restarts.
* **Chrome Profile Integration**: Preconfigured for seamless execution in the `Tarik Business` profile (`Profile 3`).

---

## Directory Layout

```text
apps/FilesWeb/
├── icons/
│   ├── icon16.png           # 16x16 extension icon
│   ├── icon48.png           # 48x48 extension icon
│   └── icon128.png          # 128x128 extension icon
├── manifest.json            # Chrome Manifest V3 configuration
├── background.js            # Service worker for side panel & background lifecycle
├── popup.html               # Extension popup menu
├── popup.js                 # Popup action handler
├── index.html               # Main Files application interface
├── styles.css               # WinUI 3 / Fluent Design acrylic theme
├── app.js                   # Application state, File System API, and UI logic
├── Run-FilesWeb.bat         # One-click launcher for Chrome Tarik Business profile
└── README.md                # Project documentation
```

---

## Setup & Installation

### Method 1: Instant Launch (Web App Mode)
Simply double-click:
`Run-FilesWeb.bat` (located at `MY TOOLS/Run-FilesWeb.bat` or inside `apps/FilesWeb/Run-FilesWeb.bat`).
This will launch Google Chrome with your **Tarik Business** profile and load the Files interface immediately.

### Method 2: Load as Unpacked Extension in Chrome
To install Files into your Chrome toolbar and side panel:
1. Open Google Chrome in your **Tarik Business** profile.
2. In the address bar, navigate to: `chrome://extensions`
3. Toggle on **Developer mode** in the top-right corner.
4. Click **Load unpacked** in the top-left corner.
5. Select the folder: `c:\Users\tarik\Desktop\MY TOOLS\apps\FilesWeb`
6. The **Files Manager** extension will appear in your Chrome toolbar with its icon. You can pin it or click it anytime to open the workspace.

---

## Environment Variables & Credentials
* **API Keys / Secrets**: None required. This tool operates 100% locally on your machine via standard web standards.
* **Configuration Central Record**: Maintained in `c:\Users\tarik\Desktop\MY TOOLS\appinfo11.txt`.

---

## Cloned Source Repository
The official C# WinUI 3 desktop source code from `https://github.com/files-community/Files.git` has also been cloned for reference at:
`c:\Users\tarik\Desktop\MY TOOLS\external_repos\Files`
