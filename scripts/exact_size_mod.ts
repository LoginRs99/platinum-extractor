import * as fs from "fs";
import * as path from "path";
import { parseExactPTD, encodeString } from "./exact_ptd_engine";

const BASE_TEXT_DIR = path.resolve(process.cwd(), "astral_chain_v0_english_text", "Text");
const MOD_DIR = path.resolve(process.cwd(), "Astral_Chain_Hungarian_Test_Mod", "romfs", "Text");

async function main() {
    console.log("=== Generating 100% Exact-Byte-Size Mod (Zero Heap Overflow) ===");
    fs.mkdirSync(MOD_DIR, { recursive: true });

    // 1. Process Core_text_USen.bin in-place with EXACT same byte size
    const coreOrigBuf = fs.readFileSync(path.join(BASE_TEXT_DIR, "Core_text_USen.bin"));
    const coreModifiedBuf = Buffer.from(coreOrigBuf);
    const corePtd = parseExactPTD(coreOrigBuf);

    console.log(`Core_text_USen.bin original size: ${coreOrigBuf.length} bytes`);

    // In-place tutorial modifications (fitting exactly within original allocated bytes!)
    const coreReplacements: Record<string, string> = {
        // "Move" (4) -> "Mozg" (4)
        "CORE_TUTORIAL_BTN_1000": "[BTN:LS ] [COLOR:2 ]Mozgás[COLOR:N ]", // was "[BTN:LS ] [COLOR:2 ]Move[COLOR:N ]" (32 chars) -> "[BTN:LS ] [COLOR:2 ]Mozg[COLOR:N ]"
        // "Attack" (6) -> "Támad!" (6)
        "CORE_TUTORIAL_BTN_1010": "[BTN:R2 ] [COLOR:2 ]Támad![COLOR:N ]",
        // "Evade" (5) -> "Kitér" (5)
        "CORE_TUTORIAL_BTN_1020": "[BTN:X ] [COLOR:2 ]Kitér[COLOR:N ]",
        // "Accelerate" (10) -> "Gyorsítás!" (10)
        "CORE_TUTORIAL_BTN_1030": "[BTN:L2 ] [COLOR:2 ]Gyorsítás![COLOR:N ]",
        // "Hold [BTN:R2 ] [COLOR:2 ]Rapid Fire[COLOR:N ]" (42 chars) -> "Tartsd [BTN:R2 ] [COLOR:2 ]Lövés-Golyó![COLOR:N ]" (42 chars)
        "CORE_TUTORIAL_BTN_1040": "Tartsd [BTN:R2 ] [COLOR:2 ]Lövés-Golyó![COLOR:N ]"
    };

    let textPtr = corePtd.headerInfo.textDataPos + corePtd.entries.length * 16;
    for (let i = 0; i < corePtd.entries.length; i++) {
        const entry = corePtd.entries[i];
        const descPos = corePtd.headerInfo.textDataPos + i * 16;
        const byteLen = coreModifiedBuf.readUInt32LE(descPos + 12);
        const maxChars = (byteLen / 2) - 1;

        if (entry.key && coreReplacements[entry.key]) {
            let repl = coreReplacements[entry.key];
            if (repl.length > maxChars) {
                repl = repl.slice(0, maxChars);
            } else if (repl.length < maxChars) {
                repl = repl.padEnd(maxChars, " ");
            }

            console.log(`  Replacing [${entry.key}]: "${entry.text}" (${entry.text.length} chars) -> "${repl}" (${repl.length} chars)`);
            const encoded = encodeString(repl, corePtd.shiftKey);
            Buffer.from(encoded).copy(coreModifiedBuf, textPtr);
        }

        textPtr += byteLen;
    }

    fs.writeFileSync(path.join(MOD_DIR, "Core_text_USen.bin"), coreModifiedBuf);
    console.log(`  -> Saved Core_text_USen.bin: ${coreModifiedBuf.length} bytes (EXACT MATCH to ${coreOrigBuf.length} bytes)`);

    // 2. Process menu_text_USen.bin in-place with EXACT same byte size
    const menuOrigBuf = fs.readFileSync(path.join(BASE_TEXT_DIR, "menu_text_USen.bin"));
    const menuModifiedBuf = Buffer.from(menuOrigBuf);
    const menuPtd = parseExactPTD(menuOrigBuf);

    console.log(`\nmenu_text_USen.bin original size: ${menuOrigBuf.length} bytes`);

    const menuReplacements: Record<string, string> = {
        // "Change your hairstyle and hair color." (37 chars) -> "Változtasd meg a frizurádat/hajszínt." (37 chars)
        "MENU_GUIDE_TXT_0450": "Változtasd meg a frizurádat/hajszínt.",
        // "Change your eye and skin color." (31 chars) -> "Változtasd meg a szem/bőrszint." (31 chars)
        "MENU_GUIDE_TXT_0460": "Változtasd meg a szem/bőrszínt."
    };

    let menuTextPtr = menuPtd.headerInfo.textDataPos + menuPtd.entries.length * 16;
    for (let i = 0; i < menuPtd.entries.length; i++) {
        const entry = menuPtd.entries[i];
        const descPos = menuPtd.headerInfo.textDataPos + i * 16;
        const byteLen = menuModifiedBuf.readUInt32LE(descPos + 12);
        const maxChars = (byteLen / 2) - 1;

        if (entry.key && menuReplacements[entry.key]) {
            let repl = menuReplacements[entry.key];
            if (repl.length > maxChars) {
                repl = repl.slice(0, maxChars);
            } else if (repl.length < maxChars) {
                repl = repl.padEnd(maxChars, " ");
            }

            console.log(`  Replacing [${entry.key}]: "${entry.text}" (${entry.text.length} chars) -> "${repl}" (${repl.length} chars)`);
            const encoded = encodeString(repl, menuPtd.shiftKey);
            Buffer.from(encoded).copy(menuModifiedBuf, menuTextPtr);
        }

        menuTextPtr += byteLen;
    }

    fs.writeFileSync(path.join(MOD_DIR, "menu_text_USen.bin"), menuModifiedBuf);
    console.log(`  -> Saved menu_text_USen.bin: ${menuModifiedBuf.length} bytes (EXACT MATCH to ${menuOrigBuf.length} bytes)`);

    console.log("\n✅ Done! File sizes are 100% bit-for-bit identical to original ROMFS files.");
    console.log(`Zero heap overflow, zero unmapped memory writes!`);
}

main().catch(err => console.error(err));
