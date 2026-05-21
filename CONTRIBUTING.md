# Contributing

Thanks for helping improve Annotation to Prompt.

This project is intentionally small and local-first. The current priority is to make the core annotation loop stable before adding large features.

## Good First Feedback

Please report:

- ChatGPT pages where the floating annotation button does not appear.
- Cases where highlighted text maps to the wrong span.
- Cases where the prompt box sync fails.
- Confusing interaction details in add/edit/delete annotation flows.
- Real use cases where tags or export would help.

## Issue Template

```text
Use case:
Browser:
ChatGPT URL type: new chat / saved conversation / shared page
What happened:
What you expected:
Can you reproduce it:
Screenshot or screen recording:
```

## Development Notes

This is a Manifest V3 browser extension.

Core files:

- `manifest.json`
- `src/background.js`
- `src/content-script.js`
- `src/styles.css`

Run a basic syntax check:

```bash
node --check src/background.js
node --check src/content-script.js
```

## Product Principles

- Do not auto-send prompts.
- Do not intercept ChatGPT network requests.
- Do not upload annotation data.
- Keep the user in control of what gets sent.
- Prefer small, reversible UI changes.

