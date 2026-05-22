# Changelog

## Unreleased

- Add semi-transparent annotation preview bubbles near numbered markers.
- Prefer side placement for preview bubbles to avoid covering original text.
- Add simple collision avoidance when multiple preview bubbles are close together.

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
