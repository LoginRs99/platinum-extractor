import * as fs from "fs";
import * as path from "path";
import repackPTD from "../src/filetypes/PTD/repack";
import type { FileData, PTDEntry } from "../src/filetypes/PTD/extract";

const BASE_DIR = path.resolve(process.cwd(), "astral_chain_v0_english_text");
const BACKUP_DIR = path.resolve(process.cwd(), "astral_chain_v0_english_text_backup");
const MOD_OUTPUT_DIR = path.resolve(process.cwd(), "Astral_Chain_Hungarian_Test_Mod", "romfs", "Text");

function copyDirRecursive(src: string, dest: string) {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDirRecursive(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

async function generateHungarianTestMod() {
    console.log("=== Generating Astral Chain Hungarian Character Test Mod ===");

    // 1. Create full backup if not already present
    if (!fs.existsSync(BACKUP_DIR)) {
        console.log(`Creating full backup in: ${BACKUP_DIR}...`);
        copyDirRecursive(BASE_DIR, BACKUP_DIR);
        console.log("Backup complete!");
    } else {
        console.log(`Backup already exists at: ${BACKUP_DIR}`);
    }

    fs.mkdirSync(MOD_OUTPUT_DIR, { recursive: true });

    // 2. Modify Option_text_USen.json with Hungarian accents (á, é, í, ó, ö, ő, ú, ü, ű)
    const optionJsonPath = path.join(BASE_DIR, "Text", "Option_text_USen.json");
    if (fs.existsSync(optionJsonPath)) {
        console.log("Modifying Option_text_USen.json...");
        const optionData: FileData = JSON.parse(fs.readFileSync(optionJsonPath, "utf-8"));

        const hungarianOptionSamples = [
            "Beállítások menü (Ő, Ű, Á, É, Í, Ó, Ö, Ú)",
            "Legió visszahívása (Árnyék)",
            "Mozgás és Futás (Őrködés)",
            "Kitérés és Gurulás (Ügyesség)",
            "Támadás és Csapás (Erő)",
            "Kamera visszaállítás (Célpont)",
            "Guggolás és Roham (Futás)",
            "Fényképező mód (Örök emlék)",
            "Legatus menü megnyitása",
            "Fegyver váltás (Kard / Pisztoly / Bot)",
            "Tárgy használata (Gyógyító ital)",
            "Gyorsbillentyűk testreszabása",
            "Fúzió aktiválása (Végső erő)",
            "Rendőrségi jegyzetek (Információk)",
            "IRIS Be / Ki kapcsolása",
            "Legió váltás (Kard, Íj, Karom, Fenevad, Páncél)",
            "Láncugrás végrehajtása",
            "Legió idézése a csatatérre"
        ];

        let sampleIdx = 0;
        for (const entry of optionData.entries) {
            if (entry.text && entry.text.length > 2) {
                if (sampleIdx < hungarianOptionSamples.length) {
                    entry.text = `[HU] ${hungarianOptionSamples[sampleIdx]} (áéíóöőúüű ÁÉÍÓÖŐÚÜŰ)`;
                    sampleIdx++;
                } else {
                    entry.text = `[HU] ${entry.text} - Teszt (ő, ű, á, é, ö, ü)`;
                }
            }
        }

        // Repack to binary .bin
        const binBuffer = await repackPTD(optionData);
        const outBinPath = path.join(MOD_OUTPUT_DIR, "Option_text_USen.bin");
        fs.writeFileSync(outBinPath, Buffer.from(binBuffer));

        // Save modified json
        fs.writeFileSync(path.join(MOD_OUTPUT_DIR, "Option_text_USen.json"), JSON.stringify(optionData, null, 2), "utf-8");
        console.log(`  -> Repacked: ${outBinPath} (${binBuffer.byteLength} bytes)`);
    }

    // 3. Modify menu_text_USen.json
    const menuJsonPath = path.join(BASE_DIR, "Text", "menu_text_USen.json");
    if (fs.existsSync(menuJsonPath)) {
        console.log("Modifying menu_text_USen.json...");
        const menuData: FileData = JSON.parse(fs.readFileSync(menuJsonPath, "utf-8"));

        for (let i = 0; i < Math.min(menuData.entries.length, 100); i++) {
            const entry = menuData.entries[i];
            if (entry.text && entry.text.length > 2) {
                entry.text = `[HU: áéíóöőúüű] ${entry.text}`;
            }
        }

        const binBuffer = await repackPTD(menuData);
        const outBinPath = path.join(MOD_OUTPUT_DIR, "menu_text_USen.bin");
        fs.writeFileSync(outBinPath, Buffer.from(binBuffer));
        fs.writeFileSync(path.join(MOD_OUTPUT_DIR, "menu_text_USen.json"), JSON.stringify(menuData, null, 2), "utf-8");
        console.log(`  -> Repacked: ${outBinPath} (${binBuffer.byteLength} bytes)`);
    }

    // 4. Modify GameWord_USen.json
    const gameWordJsonPath = path.join(BASE_DIR, "Text", "GameWord_USen.json");
    if (fs.existsSync(gameWordJsonPath)) {
        console.log("Modifying GameWord_USen.json...");
        const wordData: FileData = JSON.parse(fs.readFileSync(gameWordJsonPath, "utf-8"));

        for (let i = 0; i < Math.min(wordData.entries.length, 50); i++) {
            const entry = wordData.entries[i];
            if (entry.text && entry.text.length > 2) {
                entry.text = `[HU Ő-Ű-Á] ${entry.text}`;
            }
        }

        const binBuffer = await repackPTD(wordData);
        const outBinPath = path.join(MOD_OUTPUT_DIR, "GameWord_USen.bin");
        fs.writeFileSync(outBinPath, Buffer.from(binBuffer));
        fs.writeFileSync(path.join(MOD_OUTPUT_DIR, "GameWord_USen.json"), JSON.stringify(wordData, null, 2), "utf-8");
        console.log(`  -> Repacked: ${outBinPath} (${binBuffer.byteLength} bytes)`);
    }

    console.log("\n=== Test Mod Generation Complete! ===");
    console.log(`Mod folder ready for Ryujinx / Yuzu at:`);
    console.log(`📁 ${path.resolve(process.cwd(), "Astral_Chain_Hungarian_Test_Mod")}`);
}

generateHungarianTestMod().catch(err => {
    console.error("Mod generation failed:", err);
});
