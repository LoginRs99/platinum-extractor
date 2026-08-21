# Platinum Extractor v2.0 — Migration & Changelog

## 1. Dependency Version Changes

| Dependency | Original Version | Upgraded Version | Purpose / Notes |
| :--- | :--- | :--- | :--- |
| **`svelte`** | `^3.52.0` | `^5.22.4` | Upgraded to Svelte 5 with modern reactivity and high performance |
| **`vite`** | `^3.2.2` | `^6.2.0` | Upgraded to Vite 6 for faster builds and worker ESM support |
| **`@sveltejs/vite-plugin-svelte`** | `^1.1.0` | `^5.0.3` | Svelte 5 official Vite integration |
| **`typescript`** | `^4.6.4` | `^5.8.2` | Upgraded with `"strict": true`, `"noImplicitAny": true` |
| **`vitest`** | *(None)* | `^3.0.7` | Added automated unit and binary round-trip regression test suite |
| **`@lucide/svelte`** | *(None)* | `^0.477.0` | Replaced remote Icons8 HTTP images with zero-dependency local vector SVGs |
| **`prismjs`** | *(External CDN)* | `^1.29.0` | Bundled locally; completely eliminated runtime `cdn.skypack.dev` CDN calls |
| **`@types/node`** | *(None)* | `^22.13.9` | Node LTS types for build tools |
| **`twgl.js`** | `^5.3.1` | `^5.5.4` | WebGL shader utilities for DDS texture previews |
| **`jszip`** | `^3.10.1` | `^3.10.1` | Preserved for bulk ZIP export |
| **`@oneidentity/zstd-js`** | `^1.0.3` | `^1.0.3` | Preserved for Zstandard decompression |
| **`ooz-wasm`** | `^1.0.1` | `^1.0.1` | Preserved for Oodle Kraken decompression |
| **`encoding-japanese`** | `^2.0.0` | `^2.0.0` | Preserved for Shift-JIS CSV parsing/repacking |

---

## 2. Bug Fixes & Correctness Improvements

### 1. Web Worker Concurrent Message-Routing Race Condition
- **File & Line:** [`src/lib/FileHandler.ts:97-114`](file:///D:/github/platinum-extractor/src/lib/FileHandler.ts#L97-L114)
- **Problem:** `worker.onmessage` and `worker.onerror` were being reassigned on every call to `sendMessage()`. When multiple files were extracted concurrently or sub-archives unpacked, the newest callback overwrote previous ones, causing hung promises or mismatched resolutions.
- **Resolution:** Implemented a single, persistent event listener pattern using a `Map<string, { resolve, reject }>` keyed by unique request IDs.

### 2. CSV Repack `this.data` Runtime Exception
- **File & Line:** [`src/filetypes/CSV/repack.ts:6`](file:///D:/github/platinum-extractor/src/filetypes/CSV/repack.ts#L6)
- **Problem:** `repack()` attempted to read `this.data` inside an un-bound async function, throwing `TypeError: Cannot read properties of undefined (reading 'data')`.
- **Resolution:** Changed reference to `data.data`.

### 3. DAT Hash Bucket Loop Immediate Termination
- **File & Line:** [`src/filetypes/DAT/lib/generateDATHash.ts:50`](file:///D:/github/platinum-extractor/src/filetypes/DAT/lib/generateDATHash.ts#L50)
- **Problem:** Loop header was written as `for (let i = 0; i++; i < files.length)`. Having `i++` in the condition position evaluated to `0` (falsy) on the very first check, terminating the loop before bucket offsets could ever be computed.
- **Resolution:** Corrected to `for (let i = 0; i < files.length; i++)`.

### 4. WTA Master Buffer Detachment in Image Component
- **File & Line:** [`src/filetypes/WTA/components/Image.svelte:16`](file:///D:/github/platinum-extractor/src/filetypes/WTA/components/Image.svelte#L16)
- **Problem:** `wtpFile` ArrayBuffer was passed into `postMessage` transfer list `[offscreen, wtpFile]`, which permanently detached the master buffer and shrank it to 0 bytes, breaking all subsequent texture views.
- **Resolution:** Master buffer is safely sliced/referenced without transfer detachment.

### 5. Save Method Store Reactivity in MainBody
- **File & Line:** [`src/components/Main/components/MainBody.svelte:29`](file:///D:/github/platinum-extractor/src/components/Main/components/MainBody.svelte#L29)
- **Problem:** `tab.file.data = result` assigned directly to the property rather than calling `tab.file.data.set(result)`, preventing reactive store updates.
- **Resolution:** Properly invoked `.set()` on the writable store upon save.

### 6. Elimination of Remote CDN Runtime Calls
- **File & Line:** [`index.html:6`](file:///D:/github/platinum-extractor/index.html#L6)
- **Problem:** Linked to `https://cdn.skypack.dev/prismjs/themes/prism.css` at runtime, causing potential network failures in offline or air-gapped environments.
- **Resolution:** Removed CDN link and bundled Prism styling locally.

---

## 3. UI/UX Revamp Highlights

- **Theme System:** Added Dark and Light modes with automatic OS theme detection and smooth transitions.
- **WCAG AA Compliance:** Added full keyboard navigation through the file tree (`role="tree"`, `role="treeitem"`, `aria-selected`, `aria-expanded`), high-contrast focus rings, and readable font scales.
- **Responsive Layout:** Side panel collapses on tablet/mobile with a toggle menu button.
- **Enhanced WTA Viewer:** Added zoom controls, checkerboard background toggle, texture dimension badges, and one-click bulk ZIP export.
- **Enhanced CSV Editor:** Added dual interactive table spreadsheet view and raw CSV text view.
- **Enhanced BXM Editor:** Integrated local Prism code editor with live XML DOM validation, line numbers, error indicators, and XML/BXM dual export.

---

## 4. Binary Integrity Verification

All 8 file types and 18 game support definitions maintain 100% byte-level accuracy:
- No magic numbers, byte offsets, swizzling calculations (`tegrax1swizzle.ts`), or ASTC/DDS decompression routines were modified or simplified.
- 13 automated round-trip regression tests confirm binary consistency in CI on every push and pull request.
