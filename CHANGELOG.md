# Changelog

## Unreleased

- Add semi-transparent side comment cards connected to markers with light dashed guide lines.
- Make marker controls lighter and more annotation-like to reduce visual interruption.
- Anchor comment cards and guide lines inside the matching assistant message so they scroll with the annotated text.
- Keep side previews inside the ChatGPT main content safe area and shrink them when sidebars reduce available space.

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
