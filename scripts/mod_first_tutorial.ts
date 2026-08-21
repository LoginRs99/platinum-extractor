import * as fs from "fs";
import * as path from "path";
import { parseExactPTD, repackExactStructuredPTD } from "./exact_ptd_engine";

const BASE_TEXT_DIR = path.resolve(process.cwd(), "astral_chain_v0_english_text", "Text");
const MOD_DIR = path.resolve(process.cwd(), "Astral_Chain_Hungarian_Test_Mod", "romfs", "Text");

async function main() {
    console.log("=== Modifying File 01 Tutorial Strings (Move, Evade, Rapid Fire) ===");
    fs.mkdirSync(MOD_DIR, { recursive: true });

    // 1. Process Core_text_USen.bin
    const coreOrigBuf = fs.readFileSync(path.join(BASE_TEXT_DIR, "Core_text_USen.bin"));
    const ptd = parseExactPTD(coreOrigBuf);
    console.log(`Core_text_USen.bin entries: ${ptd.entries.length}`);

    const tutorialReplacements: Record<string, string> = {
        // First Bike / Combat Tutorial Prompts
        "CORE_TUTORIAL_BTN_1000": "[BTN:LS ] [COLOR:2 ]Mozgás[COLOR:N ]",
        "CORE_TUTORIAL_BTN_1010": "[BTN:B ] [COLOR:2 ]Kitérés (ő, ű, á, é)[COLOR:N ]",
        "CORE_TUTORIAL_BTN_1040": "Tartsd [BTN:R2 ] [COLOR:2 ]Sorozatlövés (á, é, ő, ű)[COLOR:N ]",
        "CORE_TUTORIAL_BTN_1020": "[BTN:R2 ] [COLOR:2 ]Lövés (Támadás)[COLOR:N ]",
        "CORE_TUTORIAL_BTN_1030": "[BTN:Y ] [COLOR:2 ]Gyorsítás (Turbó)[COLOR:N ]",

        // Tutorial window descriptions
        "CORE_TUTO_W_NAME_d230_02": "Tartsd [BTN:R2 ]: Sorozatlövés\r\nEllenség mellett, [BTN:R2 ]: Lövés",
        "CORE_TUTO_W_TITLE_d230": "Motoros üldözés (Kezdés)",
        "CORE_TUTO_W_NAME_a010_01": "[BTN:R2 ]: Támadás (Csapás)",
        "CORE_TUTO_W_HELP_c050_01": "Nyomd meg a [BTN:B ] gombot közvetlenül a támadás előtt a Tökéletes Kitéréshez (ő, ű, á, é)."
    };

    let count = 0;
    for (const entry of ptd.entries) {
        if (entry.key && tutorialReplacements[entry.key]) {
            console.log(`  Replacing [${entry.key}]: "${entry.text}" -> "${tutorialReplacements[entry.key]}"`);
            entry.text = tutorialReplacements[entry.key];
            count++;
        }
    }

    console.log(`Modified ${count} tutorial entries in Core_text_USen.`);

    const repackedCore = repackExactStructuredPTD(ptd);
    const outCorePath = path.join(MOD_DIR, "Core_text_USen.bin");
    fs.writeFileSync(outCorePath, repackedCore);
    console.log(`  -> Saved: ${outCorePath} (${repackedCore.length} bytes)`);

    console.log("\n✅ Done! File 01 tutorial strings updated with Hungarian text and special characters!");
}

main().catch(err => console.error(err));
