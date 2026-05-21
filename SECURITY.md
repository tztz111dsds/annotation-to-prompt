# Security Policy

## Data Handling

Annotation to Prompt is local-first.

Current v0.1 behavior:

- No backend service.
- No analytics.
- No network requests from the extension.
- No automatic prompt sending.
- Annotations are stored in browser-local `chrome.storage.local`.

## Sensitive Content

Do not send confidential, proprietary, or sensitive information to ChatGPT unless you are allowed to do so under your own policies.

The extension can help structure feedback, but it does not decide what is safe to send.

## Reporting Issues

If you find a security issue, please open a GitHub issue with a minimal reproduction and avoid posting sensitive data.

Important issue categories:

- Annotation data appears in an unintended conversation.
- The extension writes into the wrong input box.
- The extension triggers unexpected sending behavior.
- The extension reads or modifies non-ChatGPT pages.

