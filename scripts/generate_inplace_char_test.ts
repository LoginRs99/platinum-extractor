import * as fs from "fs";
import * as path from "path";
import { parseExactPTD, encodeString } from "./exact_ptd_engine";

const BASE_TEXT_DIR = path.resolve(process.cwd(), "astral_chain_v0_english_text", "Text");
const MOD_DIR = path.resolve(process.cwd(), "Astral_Chain_Hungarian_Test_Mod", "romfs", "Text");

async function main() {
    console.log("=== Generating 100% In-Place Character Font Test Mod ===");

    // Clean output directory: ONLY keep Option_text_USen.bin so other files don't interfere
    fs.rmSync(MOD_DIR, { recursive: true, force: true });
    fs.mkdirSync(MOD_DIR, { recursive: true });

    const origBuf = fs.readFileSync(path.join(BASE_TEXT_DIR, "Option_text_USen.bin"));
    const modifiedBuf = Buffer.from(origBuf); // Exact same length, exact same buffer!

    const ptd = parseExactPTD(origBuf);
    console.log(`Original Option_text_USen.bin size: ${origBuf.length} bytes`);

    // In-place replacements with EXACT same character counts:
    // "Camera" (6 chars) -> "Kamera" (6 chars)
    // "Attack" (6 chars) -> "Támad!" (6 chars - tests 'á')
    // "Evade"  (5 chars) -> "Kitér"  (5 chars - tests 'é')
    // "Fusion" (6 chars) -> "Fúzió!" (6 chars - tests 'ú', 'ó')
    // "Shortcuts" (9 chars) -> "Gyorsgomb" (9 chars)
    // "Photo Mode" (10 chars) -> "Fotó Mód!!" (10 chars - tests 'ó')

    const exactReplacements: Record<string, string> = {
        "OPTION_BTN_0070": "Kamera",      // was "Camera" (6)
        "OPTION_BTN_0030": "Támad!",      // was "Attack" (6) -> tests 'á'
        "OPTION_BTN_0130": "Kitér",       // was "Evade" (5)  -> tests 'é'
        "OPTION_BTN_0400": "Fúzió!",      // was "Fusion" (6) -> tests 'ú', 'ó'
        "OPTION_BTN_0220": "Fotó Mód!!",  // was "Photo Mode" (10) -> tests 'ó'
        "OPTION_BTN_0050": "Futás",       // was "Move" (4) -> 5? let's use exact
    };

    let textPtr = ptd.headerInfo.textDataPos + ptd.entries.length * 16;

    for (let i = 0; i < ptd.entries.length; i++) {
        const entry = ptd.entries[i];
        const descPos = ptd.headerInfo.textDataPos + i * 16;
        const byteLen = modifiedBuf.readUInt32LE(descPos + 12);
        const maxChars = (byteLen / 2) - 1; // excluding null terminator

        if (entry.key && exactReplacements[entry.key]) {
            let repl = exactReplacements[entry.key];
            // Pad or trim to exact character length
            if (repl.length > maxChars) {
                repl = repl.slice(0, maxChars);
            } else if (repl.length < maxChars) {
                repl = repl.padEnd(maxChars, " ");
            }

            console.log(`  Replacing [${entry.key}]: "${entry.text}" (${entry.text.length} chars) -> "${repl}" (${repl.length} chars)`);

            const encoded = encodeString(repl, ptd.shiftKey);
            Buffer.from(encoded).copy(modifiedBuf, textPtr);
        }

        textPtr += byteLen;
    }

    const outBinPath = path.join(MOD_DIR, "Option_text_USen.bin");
    fs.writeFileSync(outBinPath, modifiedBuf);

    console.log(`\n✅ In-place test mod created at: ${outBinPath}`);
    console.log(`File size is 100% IDENTICAL to original: ${modifiedBuf.length} bytes == ${origBuf.length} bytes!`);
    console.log(`Zero pointer shifts, zero heap reallocation, zero memory overflow!`);
}

main().catch(err => console.error(err));
