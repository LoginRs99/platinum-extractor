import * as fs from "fs";
import * as path from "path";
import { parseExactPTD, repackExactStructuredPTD } from "./exact_ptd_engine";
import repackPKZ, { type PKZInputFile } from "../src/filetypes/PKZ/repack";
import PlatinumFileReader from "../src/lib/PlatinumFileReader";
import extractPKZ from "../src/filetypes/PKZ/extract";
import extract_partial from "../src/filetypes/PKZ/extract_partial";

const ROMFS_DIR = "D:\\nstool\\romfs\\1";
const BASE_TEXT_DIR = path.resolve(process.cwd(), "astral_chain_v0_english_text", "Text");
const MOD_DIR = path.resolve(process.cwd(), "Astral_Chain_Hungarian_Test_Mod", "romfs", "Text");

const TARGET_FILES = [
    "Option_text_USen.bin",
    "menu_text_USen.bin",
    "GameWord_USen.bin",
    "Hud_text_USen.bin",
    "Shop_text_USen.bin",
    "Core_text_USen.bin",
    "CharaName_USen.bin",
    "CharaFullName_USen.bin"
];

async function main() {
    console.log("=== Repacking ALL English .bin Files with Exact Structured Engine ===");
    fs.mkdirSync(MOD_DIR, { recursive: true });

    const modifiedBinBuffers: Record<string, Buffer> = {};

    for (const fileName of TARGET_FILES) {
        const filePath = path.join(BASE_TEXT_DIR, fileName);
        if (!fs.existsSync(filePath)) {
            console.warn(`File not found: ${filePath}`);
            continue;
        }

        console.log(`Processing: ${fileName}...`);
        const origBuf = fs.readFileSync(filePath);
        const ptd = parseExactPTD(origBuf);

        console.log(`  -> Found ${ptd.entries.length} text entries.`);

        // Add Hungarian test translations with special characters
        for (let i = 0; i < ptd.entries.length; i++) {
            const entry = ptd.entries[i];
            const origText = entry.text || "";

            if (fileName === "Option_text_USen.bin") {
                const hungarianTranslations: Record<string, string> = {
                    "OPTION_BTN_0411": "Kitérés (Játékos: ő, ű, á, é, í, ó, ö, ú, ü)",
                    "OPTION_BTN_0040": "Legió Visszahívása (Árnyék)",
                    "OPTION_BTN_0050": "Mozgás és Futás (Őrködés)",
                    "OPTION_BTN_0412": "Legió Kitérés (Ügyesség)",
                    "OPTION_BTN_0301": "Beállítások Menü (Ő, Ű, Á, É, Í, Ó, Ö, Ú, Ü)",
                    "OPTION_BTN_0080": "Célpont Rögzítés",
                    "OPTION_BTN_0070": "Kamera Nézet",
                    "OPTION_BTN_0060": "Guggolás és Roham",
                    "OPTION_BTN_0130": "Kitérés (Akció)",
                    "OPTION_BTN_0030": "Támadás (Kard)",
                    "OPTION_BTN_0020": "Legió Képesség",
                    "OPTION_BTN_0120": "Interakció / Beszélgetés",
                    "OPTION_BTN_0220": "Fotó Mód (Emlékek)",
                    "OPTION_": "A beállítások csak Casual módban módosíthatók (Ő, Ű, Á, É, Í, Ó, Ö, Ú, Ü).",
                    "OPTION_BTN_0300": "Legatus Menü",
                    "OPTION_BTN_0200": "Fegyver Váltás",
                    "OPTION_BTN_0100": "Tárgy Használata",
                    "OPTION_BTN_0413": "Gyorsbillentyűk",
                    "OPTION_BTN_0400": "Fúzió Aktiválása",
                    "OPTION_BTN_0210": "Rendőrségi Jegyzetek",
                    "OPTION_BTN_0310": "IRIS Be / Ki",
                    "OPTION_BTN_0110": "Legió Váltás",
                    "OPTION_BTN_0414": "Láncugrás",
                    "OPTION_BTN_0010": "Legió Hívása",
                    "OPTION_BTN_0410": "--"
                };
                if (entry.key && hungarianTranslations[entry.key]) {
                    entry.text = hungarianTranslations[entry.key];
                }
            } else if (origText.length > 2 && !origText.startsWith("[HUDTEXT:")) {
                // Prefix test with Hungarian characters
                if (i % 3 === 0) {
                    entry.text = `[HU: ő, ű, á] ${origText}`;
                } else if (i % 3 === 1) {
                    entry.text = `[HU: Ő, Ű, É] ${origText}`;
                } else {
                    entry.text = `[HU: ó, ö, ú, ü] ${origText}`;
                }
            }
        }

        const repackedBuf = repackExactStructuredPTD(ptd);
        modifiedBinBuffers[fileName] = repackedBuf;

        // Save loose .bin file
        const outBinPath = path.join(MOD_DIR, fileName);
        fs.writeFileSync(outBinPath, repackedBuf);

        // Save clean .json
        const cleanJson = {
            magic: "PTD",
            shiftKey: ptd.shiftKey || 0x26,
            count: ptd.entries.length,
            entries: ptd.entries.map(e => ({
                id: e.id,
                hash: e.hash,
                key: e.key,
                text: e.text
            }))
        };
        const outJsonPath = path.join(MOD_DIR, fileName.replace(/\.bin$/i, ".json"));
        fs.writeFileSync(outJsonPath, JSON.stringify(cleanJson, null, 2), "utf-8");

        console.log(`  -> Repacked ${fileName} (Output size: ${repackedBuf.length} bytes)`);
    }

    // Repack into Text.pkz
    console.log("\nReading original Text.pkz from ROMFS...");
    const originalTextPkz = path.join(ROMFS_DIR, "Text", "Text.pkz");
    const origPkzBuf = fs.readFileSync(originalTextPkz).buffer;
    const pkzReader = new PlatinumFileReader(origPkzBuf);
    const pkzData = await extractPKZ(pkzReader);

    const inputFiles: PKZInputFile[] = [];
    for (const file of pkzData.files) {
        if (modifiedBinBuffers[file.name]) {
            console.log(`  [MODIFIED] Injecting updated binary: ${file.name}`);
            const buf = modifiedBinBuffers[file.name];
            inputFiles.push({
                name: file.name,
                data: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
                compressionType: "None"
            });
        } else {
            const partial = await extract_partial(file, pkzData);
            inputFiles.push({
                name: file.name,
                data: partial.data,
                compressionType: "None"
            });
        }
    }

    console.log(`Repacking ${inputFiles.length} files into Text.pkz...`);
    const newPkzBuffer = await repackPKZ(inputFiles);
    fs.writeFileSync(path.join(MOD_DIR, "Text.pkz"), Buffer.from(newPkzBuffer));

    console.log("\n✅ All 8 .bin files and Text.pkz have been successfully updated!");
    console.log(`📁 Target folder: ${MOD_DIR}`);
}

main().catch(err => console.error("Error:", err));
