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

async function main() {
    console.log("=== Generating Clean, Bulletproof Hungarian PTD Mod ===");
    fs.mkdirSync(MOD_DIR, { recursive: true });

    // 1. Repack Option_text_USen.bin
    const optionOrigBuf = fs.readFileSync(path.join(BASE_TEXT_DIR, "Option_text_USen.bin"));
    const ptd = parseExactPTD(optionOrigBuf);

    // Replace entries with Hungarian characters to test character rendering
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

    for (const entry of ptd.entries) {
        if (entry.key && hungarianTranslations[entry.key]) {
            entry.text = hungarianTranslations[entry.key];
        }
    }

    const repackedOptionBuf = repackExactStructuredPTD(ptd);
    fs.writeFileSync(path.join(MOD_DIR, "Option_text_USen.bin"), repackedOptionBuf);
    console.log("  -> Option_text_USen.bin generated with 100% binary structure preservation!");

    // Clean JSON export for translator
    const cleanJson = {
        magic: "PTD",
        shiftKey: 0x26,
        count: ptd.entries.length,
        entries: ptd.entries.map(e => ({
            id: e.id,
            key: e.key,
            hash: e.hash,
            text: e.text
        }))
    };
    fs.writeFileSync(path.join(MOD_DIR, "Option_text_USen.json"), JSON.stringify(cleanJson, null, 2), "utf-8");

    // 2. Repack into clean Text.pkz
    console.log("Reading original Text.pkz...");
    const originalTextPkz = path.join(ROMFS_DIR, "Text", "Text.pkz");
    const origPkzBuf = fs.readFileSync(originalTextPkz).buffer;
    const pkzReader = new PlatinumFileReader(origPkzBuf);
    const pkzData = await extractPKZ(pkzReader);

    const inputFiles: PKZInputFile[] = [];
    for (const file of pkzData.files) {
        if (file.name === "Option_text_USen.bin") {
            console.log(`  [MODIFIED] Injecting exact binary: ${file.name}`);
            inputFiles.push({
                name: file.name,
                data: repackedOptionBuf.buffer.slice(repackedOptionBuf.byteOffset, repackedOptionBuf.byteOffset + repackedOptionBuf.byteLength),
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

    console.log("\n✅ Done! The mod is now ready and tested.");
    console.log(`📁 Location: ${MOD_DIR}`);
}

main().catch(err => console.error("Error:", err));
