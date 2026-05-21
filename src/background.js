const MENU_ID = "annotation-to-prompt:add-note";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: "添加批注",
    contexts: ["selection"],
    documentUrlPatterns: ["https://chatgpt.com/*", "https://chat.openai.com/*"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID || !tab?.id) {
    return;
  }

  chrome.tabs.sendMessage(tab.id, {
    type: "ATP_OPEN_ANNOTATION_EDITOR",
    selectionText: info.selectionText || ""
  });
});
