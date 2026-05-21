# Annotation to Prompt MVP Spec v0

## 1. Product Positioning

Annotation to Prompt is a lightweight browser extension that turns user annotations on assistant outputs into structured prompts for the next model turn.

The first version is not a full canvas product and does not modify ChatGPT internals. It works as a local interaction layer on top of the ChatGPT webpage.

Core loop:

```text
Assistant output
→ user selects text
→ user adds annotation
→ extension highlights the annotated span
→ extension compiles annotations into the prompt box
→ user manually sends the next turn
```

## 2. MVP User Story

When the user reads a completed assistant response and notices several points that need correction, expansion, deletion, or execution, she can annotate the relevant passages directly instead of manually writing a long correction paragraph.

Example:

```text
Selected text: "关键词不一致"
Annotation: "这个论断不全面，还需要考虑概念层级错配和现实问题到学术问题的抽象差异。"
```

Compiled prompt:

```text
1. 针对「关键词不一致」：
用户批注：这个论断不全面，还需要考虑概念层级错配和现实问题到学术问题的抽象差异。
```

## 3. Supported Scope

Supported in v0:

- ChatGPT web pages.
- Completed assistant responses.
- User-triggered selection annotation.
- Local storage only.
- Manual send only.

Not supported in v0:

- Automatic message sending.
- Automatic interception of all model outputs.
- Multi-user collaboration.
- Backend sync.
- Long-term memory writes.
- Deep integration with Codex Desktop.

## 4. Trigger / Intercept / Terminate Boundaries

### Trigger

The feature is triggered only when:

- The user selects text inside an assistant response.
- The user clicks the floating "批注" button or the browser context menu item "添加批注".

The feature should not trigger when:

- The user selects text in the prompt input box.
- The selected text is outside assistant responses.
- No text is selected.

### Intercept

The extension does not intercept ChatGPT generation, network requests, account state, or send actions.

The only controlled mutation is:

- Insert/update/remove the `【批注汇总】...【/批注汇总】` block in the prompt input box.
- Add local visual highlights to annotated assistant text.

### Terminate

An annotation session ends when:

- The user saves an annotation.
- The user cancels the annotation modal.
- The user deletes all annotations for the current page.
- The user manually sends the compiled prompt.
- The page is refreshed. Existing annotations may be restored visually, but prompt-box sync should not run automatically after hydration.

The extension must not submit the prompt automatically.

## 5. Data Model

Current annotation shape:

```json
{
  "id": "anno_...",
  "order": 1,
  "messageKey": "assistant-0",
  "selectedText": "normalized selected text",
  "rawSelectedText": "raw selected text",
  "excerpt": "short excerpt for prompt display",
  "startOffset": 120,
  "endOffset": 145,
  "prefix": "nearby text before selection",
  "suffix": "nearby text after selection",
  "note": "user annotation",
  "createdAt": "2026-05-21T..."
}
```

Storage:

```text
chrome.storage.local
saved conversation key = atp:conversation:{origin}:{conversationId}
unsaved/new-chat key = atp:transient:{origin}:{tabSessionId}
```

Rationale:

- Saved ChatGPT conversations should restore annotations when revisited.
- New unsaved chats should not inherit annotations from another new chat window.
- Transient chats use a tab-scoped session id, so refresh keeps annotations in the same tab, while a new tab/window starts clean.

## 6. Prompt Compiler

The prompt compiler writes one controlled block:

```text
【批注汇总】
请基于以下批注处理上一轮输出，保留未被批注部分的主体结构：

1. 针对「...」：
用户批注：...
【/批注汇总】
```

Design rules:

- Preserve user-written text outside the controlled block.
- Recompile whenever an annotation is added, edited, deleted, or reordered.
- Do not auto-compile into the prompt box on page refresh. Restored annotations should require an explicit sync or copy action.
- Use short excerpts in the prompt box to avoid bloating the next turn.

## 7. MVP Risks

Main technical risks:

- ChatGPT DOM structure changes.
- Repeated selected text may map to the wrong occurrence.
- Cross-node highlights can disturb page markup.
- ChatGPT prompt textbox implementation may change.

Mitigations:

- Use both text offset and selected text fallback.
- Keep mutations local and reversible.
- Use a clearly delimited prompt block.
- Avoid auto-send and network interception.

## 8. Next Iterations

Planned v0.2:

- Add annotation tags: inaccurate, expand, delete, keep, reframe, execute task, save preference.
- Add clear-all button for the current page.
- Add export as Markdown / JSON.
- Improve repeated-text anchoring with prefix and suffix matching.

Planned v0.3:

- Add adapter layer for Claude / Gemini / Codex Web.
- Add annotation-to-task compiler.
- Add preference extraction candidate list.

Research seed:

```text
Structured Annotation Interfaces for Human-Agent Workflow Refinement
```

Possible research question:

```text
How can structured annotation interfaces reduce cognitive load and improve iterative refinement in human-agent collaboration?
```
