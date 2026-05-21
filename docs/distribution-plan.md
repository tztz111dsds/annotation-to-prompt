# Distribution Plan

这份文档说明如何把 Annotation to Prompt 从当前主仓库里的子目录，拆成一个更容易被搜索、试用、收藏和贡献的独立开源项目。

## 1. 推荐定位

一句话定位：

```text
Annotate AI responses and turn your feedback into the next prompt.
```

中文定位：

```text
在 AI 回复上直接批注，把零散反馈一键整理成下一轮 prompt。
```

更产品化的描述：

```text
Annotation to Prompt is a browser extension for people who work deeply with AI assistants. Highlight any part of a ChatGPT response, add inline notes, and compile all feedback into a structured follow-up prompt. It helps users refine long AI outputs without rewriting correction paragraphs from scratch.
```

## 2. 独立仓库建议

建议从当前主仓库中拆出独立 repo。

推荐 repo name：

```text
annotation-to-prompt
```

备选名字：

- `ai-response-annotator`
- `prompt-annotation-layer`
- `annotate-to-prompt`
- `human-feedback-to-prompt`

我更推荐 `annotation-to-prompt`，因为它直接描述核心动作，并且适合后续扩展到 Claude、Gemini、Codex Web 等平台。

## 3. GitHub 可搜索化

仓库描述建议：

```text
Highlight AI responses, add inline notes, and compile your feedback into structured follow-up prompts.
```

GitHub topics 建议：

```text
chatgpt
chrome-extension
browser-extension
prompt-engineering
human-ai-interaction
llm-tools
ai-productivity
annotation
workflow
human-feedback
```

README 开头必须包含这些关键词：

- ChatGPT extension
- annotate AI responses
- inline notes
- structured prompts
- human-AI workflow
- prompt refinement

这样别人搜索 `ChatGPT annotation extension`、`AI response annotator`、`prompt feedback tool` 时更容易命中。

## 4. 独立 repo 目录结构

建议结构：

```text
annotation-to-prompt/
  README.md
  TRIAL_GUIDE.md
  LICENSE
  CHANGELOG.md
  manifest.json
  src/
    background.js
    content-script.js
    styles.css
  docs/
    mvp-spec-v0.md
    distribution-plan.md
  assets/
    screenshot-annotate.png
    screenshot-prompt-block.png
    demo.gif
```

## 5. 必备开源文件

正式开放前建议补齐：

- `LICENSE`：建议 MIT，便于传播和贡献。
- `CHANGELOG.md`：记录 v0.1、v0.2 变化。
- `CONTRIBUTING.md`：说明如何反馈问题和贡献代码。
- `SECURITY.md`：说明它不上传数据、如何报告安全问题。
- `assets/demo.gif`：展示核心闭环。

## 6. Release 策略

建议发第一个 GitHub Release：

```text
v0.1.0 - ChatGPT annotation MVP
```

Release notes 可以写：

- Select text in completed ChatGPT assistant responses.
- Add inline annotations.
- Highlight annotated spans with numbered markers.
- Edit or delete annotations.
- Compile notes into a structured prompt block.
- Store annotations locally and isolate them by conversation.

同时上传一个 zip：

```text
annotation-to-prompt-v0.1.0.zip
```

这样试用者可以直接下载压缩包，而不是 clone 整个仓库。

## 7. Chrome Web Store 路线

短期不急着上 Chrome Web Store。建议先完成：

- 真实用户试用 5-10 人。
- 收集 DOM 兼容性问题。
- 补一键导出和标签功能。
- 补隐私说明。
- 准备 logo、截图、短描述、长描述。

Chrome Web Store 短描述建议：

```text
Annotate ChatGPT replies and turn your feedback into structured follow-up prompts.
```

长描述建议围绕：

- Work deeply with long AI outputs.
- Highlight what needs to change.
- Add inline notes.
- Compile feedback into the next prompt.
- Keep control: no auto-send, no backend, local storage first.

## 8. 传播文案

适合发朋友圈/LinkedIn/X 的短文案：

```text
I built a tiny browser extension for a very real AI workflow pain:

ChatGPT can generate long drafts.
Humans can quickly spot what is wrong.
But giving structured feedback is still painfully manual.

Annotation to Prompt lets you highlight parts of an AI response, add inline notes, and compile them into the next prompt.

It is an early MVP, local-first, and currently supports ChatGPT web.
```

中文版本：

```text
我做了一个很小但很实用的 ChatGPT 批注插件。

它解决的问题是：AI 很会写初稿，但人类要逐条纠错时，往往还得手写一大段“针对第 1 点、第 2 点分别修改什么”。

现在可以直接在 AI 回复上划线、批注、编号，然后一键整理成下一轮 prompt。

第一版是本地优先的 MVP，不自动发送、不上传数据，欢迎试用和提反馈。
```

## 9. 下一步执行清单

优先级最高：

1. 拆独立 GitHub repo。
2. 补 MIT License。
3. 加 2 张截图或 1 个 demo gif。
4. 发 v0.1.0 release zip。
5. 找 5-10 个真实用户试用。

第二阶段：

1. 增加批注标签。
2. 增加 Markdown / JSON 导出。
3. 增加更稳的文本锚点。
4. 适配 Claude / Gemini。
5. 准备 Chrome Web Store 上架材料。

