# Changelog

## Unreleased

- Add semi-transparent annotation preview bubbles near numbered markers.
- Render preview bubbles as inline translucent chips after markers, avoiding absolute-position failures and reducing text coverage.

## v0.1.0 - 2026-05-21

Initial MVP release.

- Support ChatGPT web pages.
- Add annotations to completed assistant responses.
- Highlight annotated text with numbered markers.
- Edit or delete annotations from inline markers.
- Compile annotations into a structured prompt block.
- Copy or sync compiled prompts into the ChatGPT input box.
- Store annotations locally in Chrome storage.
- Isolate annotation cache by saved conversation or transient browser tab.
- Keep manual-send boundary: the extension never sends prompts automatically.
