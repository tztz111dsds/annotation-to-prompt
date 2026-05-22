(() => {
  const ROOT_ID = "atp-root";
  const FLOATING_BUTTON_ID = "atp-floating-button";
  const CONTROL_PANEL_ID = "atp-control-panel";
  const INPUT_BLOCK_START = "【批注汇总】";
  const INPUT_BLOCK_END = "【/批注汇总】";
  const MAX_NOTE_LENGTH = 1000;
  const MAX_EXCERPT_LENGTH = 120;

  const state = {
    annotations: [],
    lastSelection: null,
    floatingButton: null,
    modal: null,
    activeEditId: null,
    storageKey: null,
    currentUrl: location.href
  };

  init();

  function init() {
    ensureRoot();
    state.storageKey = getStorageKey();
    hydrateAnnotations();
    document.addEventListener("mouseup", handleSelectionChange, true);
    document.addEventListener("keyup", handleSelectionChange, true);
    document.addEventListener("selectionchange", debounce(handleSelectionChange, 80), true);
    document.addEventListener("click", handleDocumentClick, true);
    window.addEventListener("resize", () => {
      removeFloatingButton();
      renderAllHighlights();
    });
    window.addEventListener("popstate", handlePossibleNavigation);
    installHistoryNavigationWatcher();
    setInterval(handlePossibleNavigation, 1000);

    chrome.runtime.onMessage.addListener((message) => {
      if (message?.type === "ATP_OPEN_ANNOTATION_EDITOR") {
        openEditorFromCurrentSelection(message.selectionText);
      }
    });
  }

  function ensureRoot() {
    if (document.getElementById(ROOT_ID)) {
      return;
    }

    const root = document.createElement("div");
    root.id = ROOT_ID;
    root.setAttribute("aria-live", "polite");
    document.documentElement.appendChild(root);
  }

  async function hydrateAnnotations() {
    const key = state.storageKey || getStorageKey();
    const result = await chrome.storage.local.get(key);
    state.annotations = Array.isArray(result[key]) ? result[key] : [];
    renderAllHighlights();
    renderControlPanel();
  }

  async function persistAnnotations() {
    await chrome.storage.local.set({
      [state.storageKey || getStorageKey()]: state.annotations
    });
  }

  function getStorageKey() {
    const conversationId = getConversationIdFromPath();
    if (conversationId) {
      return `atp:conversation:${location.origin}:${conversationId}`;
    }

    return `atp:transient:${location.origin}:${getTransientTabId()}`;
  }

  function getConversationIdFromPath() {
    const match = location.pathname.match(/\/c\/([^/?#]+)/);
    return match?.[1] || "";
  }

  function getTransientTabId() {
    const key = "atp-transient-tab-id";
    let id = sessionStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID?.() || `tab_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      sessionStorage.setItem(key, id);
    }
    return id;
  }

  function installHistoryNavigationWatcher() {
    if (window.__atpHistoryWatcherInstalled) {
      return;
    }

    window.__atpHistoryWatcherInstalled = true;

    for (const method of ["pushState", "replaceState"]) {
      const original = history[method];
      history[method] = function patchedHistoryMethod(...args) {
        const result = original.apply(this, args);
        setTimeout(handlePossibleNavigation, 0);
        return result;
      };
    }
  }

  async function handlePossibleNavigation() {
    if (state.currentUrl === location.href) {
      return;
    }

    state.currentUrl = location.href;
    const nextStorageKey = getStorageKey();
    if (nextStorageKey === state.storageKey) {
      return;
    }

    state.storageKey = nextStorageKey;
    state.annotations = [];
    state.lastSelection = null;
    removeFloatingButton();
    closeMarkerMenu();
    closeModal();
    clearHighlights();
    renderControlPanel();
    updatePromptBlockIfPresent("");
    await hydrateAnnotations();
  }

  function handleSelectionChange() {
    if (state.modal) {
      return;
    }

    const selectionInfo = captureSelection();
    if (!selectionInfo) {
      state.lastSelection = null;
      removeFloatingButton();
      return;
    }

    state.lastSelection = selectionInfo;
    showFloatingButton(selectionInfo.rect, selectionInfo);
  }

  function captureSelection() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return null;
    }

    const text = selection.toString().trim();
    if (!text) {
      return null;
    }

    const range = selection.getRangeAt(0);
    const assistantMessage = findAssistantMessage(range.commonAncestorContainer);
    if (!assistantMessage || isInsideEditable(range.commonAncestorContainer)) {
      return null;
    }

    const rect = getUsableRangeRect(range);
    if (!rect) {
      return null;
    }

    const messageText = normalizeWhitespace(assistantMessage.innerText || assistantMessage.textContent || "");
    const selectedText = normalizeWhitespace(text);
    const matchIndex = messageText.indexOf(selectedText);
    const offsets = getRangeOffsets(assistantMessage, range);

    return {
      messageKey: getMessageKey(assistantMessage),
      selectedText,
      rawSelectedText: text,
      excerpt: toExcerpt(selectedText),
      startOffset: offsets?.startOffset ?? null,
      endOffset: offsets?.endOffset ?? null,
      prefix: matchIndex >= 0 ? messageText.slice(Math.max(0, matchIndex - 80), matchIndex) : "",
      suffix: matchIndex >= 0 ? messageText.slice(matchIndex + selectedText.length, matchIndex + selectedText.length + 80) : "",
      rect: {
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        right: rect.right + window.scrollX,
        bottom: rect.bottom + window.scrollY
      }
    };
  }

  function getRangeOffsets(root, range) {
    try {
      const before = range.cloneRange();
      before.selectNodeContents(root);
      before.setEnd(range.startContainer, range.startOffset);

      const startOffset = before.toString().length;
      const endOffset = startOffset + range.toString().length;
      return { startOffset, endOffset };
    } catch {
      return null;
    }
  }

  function findAssistantMessage(node) {
    const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    if (!element) {
      return null;
    }

    const directMessage = element.closest('[data-message-author-role="assistant"]');
    if (directMessage) {
      return directMessage;
    }

    const article = element.closest("article");
    if (article?.querySelector('[data-message-author-role="assistant"]')) {
      return article;
    }

    return null;
  }

  function isInsideEditable(node) {
    const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    return Boolean(element?.closest('textarea, input, [contenteditable="true"], [role="textbox"]'));
  }

  function getUsableRangeRect(range) {
    const rects = Array.from(range.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0);
    return rects[0] || null;
  }

  function getMessageKey(messageNode) {
    const explicitId = messageNode.getAttribute("data-message-id")
      || messageNode.querySelector("[data-message-id]")?.getAttribute("data-message-id")
      || messageNode.getAttribute("data-testid");

    if (explicitId) {
      return explicitId;
    }

    const assistantMessages = Array.from(document.querySelectorAll('[data-message-author-role="assistant"]'));
    const directIndex = assistantMessages.indexOf(messageNode);
    if (directIndex >= 0) {
      return `assistant-${directIndex}`;
    }

    const nested = messageNode.querySelector('[data-message-author-role="assistant"]');
    const nestedIndex = assistantMessages.indexOf(nested);
    return `assistant-${nestedIndex >= 0 ? nestedIndex : Date.now()}`;
  }

  function showFloatingButton(rect, selectionInfo) {
    removeFloatingButton();

    const button = document.createElement("button");
    button.id = FLOATING_BUTTON_ID;
    button.type = "button";
    button.textContent = "批注";
    button.style.top = `${rect.bottom + 8}px`;
    button.style.left = `${Math.max(12, rect.left)}px`;
    button.style.pointerEvents = "auto";

    let opened = false;
    const openFromButton = (event) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();

      if (opened) {
        return;
      }

      opened = true;
      openEditorFromSelectionInfo(selectionInfo);
    };

    button.addEventListener("pointerdown", openFromButton, true);
    button.addEventListener("mousedown", openFromButton, true);
    button.addEventListener("click", openFromButton, true);

    document.documentElement.appendChild(button);
    state.floatingButton = button;
  }

  function removeFloatingButton() {
    state.floatingButton?.remove();
    state.floatingButton = null;
  }

  function openEditorFromCurrentSelection(selectionTextFromMenu = "") {
    const selectionInfo = state.lastSelection || captureSelection();
    if (!selectionInfo || (selectionTextFromMenu && !selectionInfo.selectedText.includes(normalizeWhitespace(selectionTextFromMenu)))) {
      showToast("请先选中一段 assistant 回复文本");
      return;
    }

    openEditorFromSelectionInfo(selectionInfo);
  }

  function openEditorFromSelectionInfo(selectionInfo) {
    removeFloatingButton();
    openAnnotationModal({
      mode: "create",
      annotation: {
        ...selectionInfo,
        note: ""
      }
    });
  }

  function openAnnotationModal({ mode, annotation }) {
    closeModal();

    const modal = document.createElement("div");
    modal.className = "atp-modal";
    modal.innerHTML = `
      <div class="atp-modal-card" role="dialog" aria-modal="true" aria-label="添加批注">
        <div class="atp-modal-header">
          <div>
            <div class="atp-modal-title">${mode === "edit" ? "编辑批注" : "添加批注"}</div>
            <div class="atp-modal-subtitle">针对：「${escapeHtml(annotation.excerpt || annotation.selectedText)}」</div>
          </div>
          <button class="atp-icon-button" type="button" data-atp-close aria-label="关闭">×</button>
        </div>
        <textarea class="atp-note-input" maxlength="${MAX_NOTE_LENGTH}" placeholder="写下你的批注，最多 1000 字。Ctrl+Enter 保存，Esc 取消。"></textarea>
        <div class="atp-modal-footer">
          <span class="atp-counter">0 / ${MAX_NOTE_LENGTH}</span>
          <div class="atp-actions">
            <button class="atp-secondary" type="button" data-atp-cancel>取消</button>
            <button class="atp-primary" type="button" data-atp-save>${mode === "edit" ? "保存修改" : "暂存批注"}</button>
          </div>
        </div>
      </div>
    `;

    const textarea = modal.querySelector(".atp-note-input");
    const counter = modal.querySelector(".atp-counter");
    textarea.value = annotation.note || "";
    counter.textContent = `${textarea.value.length} / ${MAX_NOTE_LENGTH}`;

    textarea.addEventListener("input", () => {
      counter.textContent = `${textarea.value.length} / ${MAX_NOTE_LENGTH}`;
    });

    textarea.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeModal();
      }
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        saveModalAnnotation(mode, annotation, textarea.value);
      }
    });

    modal.querySelector("[data-atp-save]").addEventListener("click", () => {
      saveModalAnnotation(mode, annotation, textarea.value);
    });
    modal.querySelector("[data-atp-cancel]").addEventListener("click", closeModal);
    modal.querySelector("[data-atp-close]").addEventListener("click", closeModal);

    document.documentElement.appendChild(modal);
    state.modal = modal;
    setTimeout(() => textarea.focus(), 0);
  }

  async function saveModalAnnotation(mode, annotation, rawNote) {
    const note = rawNote.trim();
    if (!note) {
      showToast("批注不能为空");
      return;
    }

    if (mode === "edit") {
      const index = state.annotations.findIndex((item) => item.id === annotation.id);
      if (index >= 0) {
        state.annotations[index] = {
          ...state.annotations[index],
          note,
          updatedAt: new Date().toISOString()
        };
      }
    } else {
      state.annotations.push({
        id: `anno_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        messageKey: annotation.messageKey,
        selectedText: annotation.selectedText,
        rawSelectedText: annotation.rawSelectedText,
        excerpt: annotation.excerpt,
        startOffset: annotation.startOffset,
        endOffset: annotation.endOffset,
        prefix: annotation.prefix,
        suffix: annotation.suffix,
        note,
        createdAt: new Date().toISOString()
      });
    }

    renumberAnnotations();
    await persistAnnotations();
    renderAllHighlights();
    renderControlPanel();
    syncPromptBlock();
    closeModal();
  }

  function closeModal() {
    state.modal?.remove();
    state.modal = null;
    state.activeEditId = null;
  }

  function renumberAnnotations() {
    state.annotations = state.annotations.map((annotation, index) => ({
      ...annotation,
      order: index + 1
    }));
  }

  function renderAllHighlights() {
    clearHighlights();
    renumberAnnotations();

    for (const annotation of state.annotations) {
      renderHighlight(annotation);
    }
  }

  function clearHighlights() {
    document.querySelectorAll(".atp-highlight").forEach((node) => {
      const parent = node.parentNode;
      while (node.firstChild) {
        parent.insertBefore(node.firstChild, node);
      }
      node.remove();
      parent?.normalize?.();
    });

    document.querySelectorAll(".atp-marker").forEach((node) => node.remove());
    document.querySelectorAll(".atp-note-preview").forEach((node) => node.remove());
  }

  function renderHighlight(annotation) {
    const message = findMessageByKey(annotation.messageKey);
    if (!message) {
      return;
    }

    const range = findRangeFromOffsets(message, annotation.startOffset, annotation.endOffset)
      || findTextRange(message, annotation.rawSelectedText || annotation.selectedText);
    if (!range) {
      return;
    }

    const highlight = document.createElement("span");
    highlight.className = "atp-highlight";
    highlight.dataset.annotationId = annotation.id;

    try {
      const contents = range.extractContents();
      highlight.appendChild(contents);
      range.insertNode(highlight);
    } catch {
      return;
    }

    const marker = document.createElement("button");
    marker.className = "atp-marker";
    marker.type = "button";
    marker.textContent = String(annotation.order);
    marker.title = "编辑或删除批注";
    marker.dataset.annotationId = annotation.id;
    marker.addEventListener("click", () => openMarkerMenu(annotation, marker));
    highlight.after(marker);

    renderNotePreview(annotation, marker);
  }

  function renderNotePreview(annotation, marker) {
    document.querySelector(`.atp-note-preview[data-annotation-id="${cssEscape(annotation.id)}"]`)?.remove();

    const preview = document.createElement("button");
    preview.className = "atp-note-preview";
    preview.type = "button";
    preview.dataset.annotationId = annotation.id;
    preview.title = "点击编辑或删除批注";

    const noteText = annotation.note || "";
    preview.innerHTML = `
      <span class="atp-note-preview-index">${annotation.order}</span>
      <span class="atp-note-preview-text">${escapeHtml(toNotePreview(noteText))}</span>
    `;

    preview.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openMarkerMenu(annotation, marker);
    });

    marker.after(preview);
  }

  function findMessageByKey(messageKey) {
    const explicit = document.querySelector(`[data-message-id="${cssEscape(messageKey)}"], [data-testid="${cssEscape(messageKey)}"]`);
    if (explicit) {
      return explicit.closest('[data-message-author-role="assistant"]') || explicit;
    }

    const match = messageKey.match(/^assistant-(\d+)$/);
    if (match) {
      return document.querySelectorAll('[data-message-author-role="assistant"]')[Number(match[1])] || null;
    }

    return null;
  }

  function findRangeFromOffsets(root, startOffset, endOffset) {
    if (!Number.isFinite(startOffset) || !Number.isFinite(endOffset) || endOffset <= startOffset) {
      return null;
    }

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue) {
          return NodeFilter.FILTER_REJECT;
        }
        if (node.parentElement?.closest(".atp-marker, script, style")) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    let currentOffset = 0;
    let startNode = null;
    let startNodeOffset = 0;
    let endNode = null;
    let endNodeOffset = 0;
    let node;

    while ((node = walker.nextNode())) {
      const nextOffset = currentOffset + node.nodeValue.length;

      if (!startNode && startOffset >= currentOffset && startOffset <= nextOffset) {
        startNode = node;
        startNodeOffset = startOffset - currentOffset;
      }

      if (!endNode && endOffset >= currentOffset && endOffset <= nextOffset) {
        endNode = node;
        endNodeOffset = endOffset - currentOffset;
        break;
      }

      currentOffset = nextOffset;
    }

    if (!startNode || !endNode) {
      return null;
    }

    const range = document.createRange();
    range.setStart(startNode, startNodeOffset);
    range.setEnd(endNode, endNodeOffset);
    return range;
  }

  function findTextRange(root, text) {
    const normalizedTarget = normalizeWhitespace(text);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue?.trim()) {
          return NodeFilter.FILTER_REJECT;
        }
        if (node.parentElement?.closest(".atp-marker, script, style")) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    let node;
    while ((node = walker.nextNode())) {
      const value = node.nodeValue || "";
      const index = normalizeWhitespace(value).indexOf(normalizedTarget);
      if (index >= 0) {
        const originalIndex = value.indexOf(text);
        const start = originalIndex >= 0 ? originalIndex : index;
        const range = document.createRange();
        range.setStart(node, start);
        range.setEnd(node, Math.min(value.length, start + text.length));
        return range;
      }
    }

    return null;
  }

  function openMarkerMenu(annotation, anchor) {
    closeMarkerMenu();

    const rect = anchor.getBoundingClientRect();
    const menu = document.createElement("div");
    menu.className = "atp-marker-menu";
    menu.style.top = `${rect.bottom + window.scrollY + 6}px`;
    menu.style.left = `${rect.left + window.scrollX}px`;
    menu.innerHTML = `
      <button type="button" data-atp-edit>编辑批注</button>
      <button type="button" data-atp-delete>删除批注</button>
    `;

    menu.querySelector("[data-atp-edit]").addEventListener("click", () => {
      closeMarkerMenu();
      openAnnotationModal({ mode: "edit", annotation });
    });

    menu.querySelector("[data-atp-delete]").addEventListener("click", async () => {
      state.annotations = state.annotations.filter((item) => item.id !== annotation.id);
      renumberAnnotations();
      await persistAnnotations();
      renderAllHighlights();
      renderControlPanel();
      syncPromptBlock();
      closeMarkerMenu();
    });

    document.documentElement.appendChild(menu);
  }

  function closeMarkerMenu() {
    document.querySelectorAll(".atp-marker-menu").forEach((node) => node.remove());
  }

  function handleDocumentClick(event) {
    if (!event.target.closest?.(".atp-marker, .atp-marker-menu, .atp-modal, #atp-floating-button")) {
      closeMarkerMenu();
    }
  }

  function syncPromptBlock() {
    const nextBlock = buildPromptBlock();
    if (!nextBlock) {
      updatePromptBlockIfPresent("");
      return;
    }

    updatePromptBlockIfPresent(nextBlock);
  }

  function updatePromptBlockIfPresent(nextBlock, options = {}) {
    const textbox = findPromptTextbox();
    if (!textbox) {
      if (options.showToastOnFailure) {
        showToast("没有找到输入框，可以先复制批注汇总");
      }
      return;
    }

    const existingText = getTextboxText(textbox);
    const nextText = replacePromptBlock(existingText, nextBlock);
    setTextboxText(textbox, nextText);

    if (options.showToastOnSuccess) {
      showToast("已同步到输入框");
    }
  }

  function findPromptTextbox() {
    const selectors = [
      "#prompt-textarea",
      '[data-testid="prompt-textarea"]',
      'textarea[data-testid="prompt-textarea"]',
      'form textarea',
      'form [contenteditable="true"][role="textbox"]',
      'form div[contenteditable="true"]',
      '[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"]'
    ];

    for (const selector of selectors) {
      const candidates = Array.from(document.querySelectorAll(selector)).filter(isVisible);
      if (candidates.length > 0) {
        return candidates[candidates.length - 1];
      }
    }

    return null;
  }

  function getTextboxText(textbox) {
    if ("value" in textbox) {
      return textbox.value || "";
    }
    return textbox.innerText || textbox.textContent || "";
  }

  function setTextboxText(textbox, text) {
    if ("value" in textbox) {
      if (textbox.value === text) {
        return;
      }
      textbox.value = text;
      textbox.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }

    if ((textbox.innerText || "") === text) {
      return;
    }

    textbox.focus();

    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(textbox);
    selection.removeAllRanges();
    selection.addRange(range);

    const inserted = document.execCommand?.("insertText", false, text);
    if (!inserted) {
      textbox.innerHTML = text.split("\n").map((line) => {
        return `<p>${line ? escapeHtml(line) : "<br>"}</p>`;
      }).join("");
    }

    textbox.dispatchEvent(new InputEvent("input", {
      bubbles: true,
      inputType: "insertText",
      data: text
    }));
  }

  function renderControlPanel() {
    document.getElementById(CONTROL_PANEL_ID)?.remove();

    if (state.annotations.length === 0) {
      return;
    }

    const panel = document.createElement("div");
    panel.id = CONTROL_PANEL_ID;
    panel.innerHTML = `
      <div class="atp-control-title">批注 ${state.annotations.length} 条</div>
      <div class="atp-control-hint">刷新后会保留批注，但不会自动发送。</div>
      <div class="atp-control-actions">
        <button type="button" data-atp-sync>同步到输入框</button>
        <button type="button" data-atp-copy>复制批注</button>
        <button type="button" data-atp-clear>清空</button>
      </div>
    `;

    panel.querySelector("[data-atp-sync]").addEventListener("click", () => {
      updatePromptBlockIfPresent(buildPromptBlock(), {
        showToastOnFailure: true,
        showToastOnSuccess: true
      });
    });

    panel.querySelector("[data-atp-copy]").addEventListener("click", async () => {
      await copyText(buildPromptBlock());
      showToast("已复制批注汇总");
    });

    panel.querySelector("[data-atp-clear]").addEventListener("click", async () => {
      state.annotations = [];
      await persistAnnotations();
      renderAllHighlights();
      renderControlPanel();
      updatePromptBlockIfPresent("");
      showToast("已清空批注");
    });

    document.documentElement.appendChild(panel);
  }

  async function copyText(text) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }

  function isVisible(element) {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function buildPromptBlock() {
    if (state.annotations.length === 0) {
      return "";
    }

    const items = state.annotations.map((annotation, index) => {
      return `${index + 1}. 针对「${annotation.excerpt}」：\n用户批注：${annotation.note}`;
    }).join("\n\n");

    return `${INPUT_BLOCK_START}\n请基于以下批注处理上一轮输出，保留未被批注部分的主体结构：\n\n${items}\n${INPUT_BLOCK_END}`;
  }

  function replacePromptBlock(existingText, nextBlock) {
    const startIndex = existingText.indexOf(INPUT_BLOCK_START);
    const endIndex = existingText.indexOf(INPUT_BLOCK_END);

    if (startIndex >= 0 && endIndex >= startIndex) {
      const before = existingText.slice(0, startIndex).trimEnd();
      const after = existingText.slice(endIndex + INPUT_BLOCK_END.length).trimStart();
      return [before, nextBlock, after].filter(Boolean).join("\n\n");
    }

    if (!nextBlock) {
      return existingText;
    }

    return [existingText.trimEnd(), nextBlock].filter(Boolean).join("\n\n");
  }

  function toExcerpt(text) {
    const normalized = normalizeWhitespace(text);
    if (normalized.length <= MAX_EXCERPT_LENGTH) {
      return normalized;
    }
    return `${normalized.slice(0, MAX_EXCERPT_LENGTH)}...`;
  }

  function toNotePreview(text) {
    const normalized = normalizeWhitespace(text);
    const maxLength = 90;
    if (normalized.length <= maxLength) {
      return normalized;
    }
    return `${normalized.slice(0, maxLength)}...`;
  }

  function normalizeWhitespace(text) {
    return String(text || "").replace(/\s+/g, " ").trim();
  }

  function escapeHtml(text) {
    return String(text)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function cssEscape(value) {
    if (window.CSS?.escape) {
      return window.CSS.escape(value);
    }
    return String(value).replace(/["\\]/g, "\\$&");
  }

  function debounce(fn, delay) {
    let timer = null;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "atp-toast";
    toast.textContent = message;
    document.documentElement.appendChild(toast);
    setTimeout(() => toast.remove(), 2200);
  }
})();
