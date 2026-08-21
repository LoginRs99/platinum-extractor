import * as fs from "fs";
import * as path from "path";
import { parseExactPTD, repackExactStructuredPTD } from "./exact_ptd_engine";

const BASE_TEXT_DIR = path.resolve(process.cwd(), "astral_chain_v0_english_text", "Text");
const MOD_DIR = path.resolve(process.cwd(), "Astral_Chain_Hungarian_Test_Mod", "romfs", "Text");

async function main() {
    console.log("=== Modifying Character Creation & Tutorial Strings ===");
    fs.mkdirSync(MOD_DIR, { recursive: true });

    // 1. Update Core_text_USen.bin (Tutorial: Move, Evade, Rapid Fire)
    console.log("Processing Core_text_USen.bin...");
    const coreOrigBuf = fs.readFileSync(path.join(BASE_TEXT_DIR, "Core_text_USen.bin"));
    const corePtd = parseExactPTD(coreOrigBuf);

    const tutorialReplacements: Record<string, string> = {
        "CORE_TUTORIAL_BTN_1000": "[BTN:LS ] [COLOR:2 ]Mozgás[COLOR:N ]",
        "CORE_TUTORIAL_BTN_1010": "[BTN:B ] [COLOR:2 ]Kitérés (ő, ű, á, é)[COLOR:N ]",
        "CORE_TUTORIAL_BTN_1040": "Tartsd [BTN:R2 ] [COLOR:2 ]Sorozatlövés (á, é, ő, ű)[COLOR:N ]",
        "CORE_TUTORIAL_BTN_1020": "[BTN:R2 ] [COLOR:2 ]Lövés (Támadás)[COLOR:N ]",
        "CORE_TUTORIAL_BTN_1030": "[BTN:Y ] [COLOR:2 ]Gyorsítás (Turbó)[COLOR:N ]",
        "CORE_TUTO_W_NAME_d230_02": "Tartsd [BTN:R2 ]: Sorozatlövés\r\nEllenség mellett, [BTN:R2 ]: Lövés",
        "CORE_TUTO_W_TITLE_d230": "Motoros üldözés (Kezdés)",
        "CORE_TUTO_W_NAME_a010_01": "[BTN:R2 ]: Támadás (Csapás)",
        "CORE_TUTO_W_HELP_c050_01": "Nyomd meg a [BTN:B ] gombot közvetlenül a támadás előtt a Tökéletes Kitéréshez (ő, ű, á, é)."
    };

    for (const entry of corePtd.entries) {
        if (entry.key && tutorialReplacements[entry.key]) {
            entry.text = tutorialReplacements[entry.key];
        }
    }

    const repackedCore = repackExactStructuredPTD(corePtd);
    fs.writeFileSync(path.join(MOD_DIR, "Core_text_USen.bin"), repackedCore);
    console.log(`  -> Core_text_USen.bin repacked (${repackedCore.length} bytes)`);

    // 2. Update menu_text_USen.bin (Character Creation & Customization Guide Texts)
    console.log("\nProcessing menu_text_USen.bin...");
    const menuOrigBuf = fs.readFileSync(path.join(BASE_TEXT_DIR, "menu_text_USen.bin"));
    const menuPtd = parseExactPTD(menuOrigBuf);

    const menuReplacements: Record<string, string> = {
        "MENU_GUIDE_TXT_0450": "Változtasd meg a frizurádat és a hajszínedet (ő, ű, á, é).",
        "MENU_GUIDE_TXT_0460": "Változtasd meg a szem- és bőrszínedet (ő, ű, á, é, ó, ú).",
        "MENU_GUIDE_TXT_0064": "Változtasd meg a HUD színsémáját.",
        "MENU_CUSTOMIZE_200": "Frizura Módosítása (Hajstílus)",
        "MENU_CUSTOMIZE_300": "Szín Módosítása (Szem / Bőr)"
    };

    let menuCount = 0;
    for (const entry of menuPtd.entries) {
        if (entry.key && menuReplacements[entry.key]) {
            console.log(`  Replacing [${entry.key}]: "${entry.text}" -> "${menuReplacements[entry.key]}"`);
            entry.text = menuReplacements[entry.key];
            menuCount++;
        }
    }

    const repackedMenu = repackExactStructuredPTD(menuPtd);
    fs.writeFileSync(path.join(MOD_DIR, "menu_text_USen.bin"), repackedMenu);
    console.log(`  -> menu_text_USen.bin repacked (${repackedMenu.length} bytes, modified ${menuCount} strings)`);

    console.log("\n✅ All Character Creation and Tutorial strings updated!");
    console.log(`📁 Files in: ${MOD_DIR}`);
}

main().catch(err => console.error(err));
