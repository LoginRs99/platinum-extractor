# Platinum Extractor v2.0

> A fast, 100% client-side web application for extracting, viewing, and modding PlatinumGames game archives and reverse-engineered binary file formats.
> 
> Forked and modernized from [cabalex/platinum-extractor](https://github.com/cabalex/platinum-extractor) (and spiritual successor to [Astral Extractor](https://cabalex.github.io/astral-extractor)).

---

## ✨ Features

- **100% In-Browser Execution:** Zero server uploads. Decompression, parsing, and repacking happen directly on the client using Web Workers and WebAssembly (WASM).
- **Archive & Container Extraction:** Unpack `.dat`, `.dtt`, `.evn`, and `.pkz` files.
- **WASM Decompression Pipeline:** Hardware-accelerated Zstandard (`@oneidentity/zstd-js`) and Oodle Kraken (`ooz-wasm`) decompression for Switch/PC archives.
- **Hardware-Accelerated WebGL Texture Previews:** Real-time WebGL rendering of DDS (`DXT1`, `DXT3`, `DXT5`, `BC6H`, `BC7`) and WASM ASTC textures (`4x4` through `12x12`), including Tegra X1 block-linear deswizzling for Nintendo Switch dumps.
- **Interactive Editors:**
  - **BXM Editor:** Binary XML tree visualizer with real-time XML syntax validation, formatting, and binary repacking.
  - **CSV Editor:** Dual spreadsheet table view and raw text editor with Shift-JIS / UTF-8 encoding support.
  - **Collision Viewer (COL):** Direct integration guidance for 3D editing with the *NieR2Blender2NieR* Blender add-on.
- **Visualizer Plugin System:** High-level archive visualizers (such as the *Astral Chain Quest* visualizer with mission flow logic and dialogue inspection).
- **UI/UX Revamp:**
  - Light & Dark theme toggle with system preference synchronization.
  - Full WCAG AA accessibility with keyboard tree navigation (`role="tree"`, `role="treeitem"`, `aria-selected`).
  - Drag-and-drop file and directory import.
  - Bulk ZIP export for texture archives.
  - Zero external runtime CDN dependencies (bundled local Prism & vector icons).
- **Regression Safety Net:** Automated Vitest unit & round-trip binary tests running on CI.

---

## 🎮 Supported Games & Platforms (18)

| Game | Platform | Deswizzling | ASTC |
| :--- | :--- | :---: | :---: |
| **Astral Chain** | Nintendo Switch | ✅ | ✅ |
| **NieR:Automata** | PC | ❌ | ❌ |
| **NieR:Automata (The End of YoRHa Edition)** | Nintendo Switch | ✅ | ✅ |
| **NieR Replicant ver.1.22474487139...** | PC | ❌ | ❌ |
| **Metal Gear Rising: Revengeance** | PC | ❌ | ❌ |
| **Bayonetta 1** | PC | ❌ | ❌ |
| **Bayonetta 1** | Nintendo Switch | ✅ | ✅ |
| **Bayonetta 2** | Wii U | ❌ | ❌ |
| **Bayonetta 2** | Nintendo Switch | ✅ | ✅ |
| **Bayonetta 3** | Nintendo Switch | ✅ | ✅ |
| **Star Fox Zero** | Wii U | ❌ | ❌ |
| **Star Fox Guard** | Wii U | ❌ | ❌ |
| **Transformers: Devastation** | PC | ❌ | ❌ |
| **Vanquish** | PC | ❌ | ❌ |
| **The Wonderful 101** | Wii U | ❌ | ❌ |
| **The Wonderful 101: Remastered** | PC | ✅ | ✅ |
| **The Wonderful 101: Remastered** | Nintendo Switch | ✅ | ✅ |
| **Unknown / Generic Platinum Games** | PC | ❌ | ❌ |

---

## 📦 Supported Formats

- **`DAT` / `DTT` / `EVN`:** PlatinumGames signature archive container format (with 16-byte alignment and CRC32 bucket hashing).
- **`PKZ`:** High-compression archive container (ZStandard / Oodle Kraken).
- **`BXM`:** Big-endian binary XML configuration files (`BXM\0`, `XML\0`).
- **`CSV`:** Shift-JIS & UTF-8 encoded configuration and balance tables.
- **`WTA` / `WTP`:** Texture header and surface container format.
- **`MCD`:** UI layout, glyph, and event dialogue archives.
- **`COL` / `COL2`:** 3D collision boundaries.

---

## 🛠️ Development & Building

```bash
# Install dependencies
npm install

# Run local development server
npm run dev

# Run unit & binary round-trip regression tests
npm test

# Run TypeScript & Svelte type checking
npm run check

# Build production bundle
npm run build
```

---

## 📜 Notice Regarding License

> [!NOTE]
> This repository does not currently have an explicit `LICENSE` file. If you are the repository maintainer, please add an appropriate open-source license (such as MIT, Apache 2.0, or GPL-3.0) to the root directory.

---

## 🙏 Thanks & Credits

- **Forked from:** [cabalex/platinum-extractor](https://github.com/cabalex/platinum-extractor)
- **Original Author:** [Cabalex](https://cabalex.github.io)
- **Icons:** [Icons8](https://icons8.com) & [Lucide Icons](https://lucide.dev)
- **Reverse Engineering & Format Research:**
  - Kerilk's [bayonetta_tools](https://github.com/Kerilk/bayonetta_tools/)
  - kohos' [CriTools](https://github.com/kohos/CriTools)
  - Astral Chain & NieR modding communities
- **PlatinumGames:** For making iconic action games!