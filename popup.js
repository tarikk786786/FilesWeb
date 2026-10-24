document.getElementById("openFullApp").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("index.html") });
  window.close();
});

document.getElementById("openSidePanel").addEventListener("click", async () => {
  if (chrome.sidePanel && chrome.sidePanel.open) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      await chrome.sidePanel.open({ tabId: tab.id });
    }
  } else {
    chrome.tabs.create({ url: chrome.runtime.getURL("index.html") });
  }
  window.close();
});
