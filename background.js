chrome.runtime.onInstalled.addListener(() => {
  console.log("Files Web Extension installed successfully.");
});

// Configure side panel behavior if supported
if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});
}
