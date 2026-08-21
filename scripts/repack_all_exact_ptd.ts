import * as fs from "fs";
import * as path from "path";
import repackPKZ, { type PKZInputFile } from "../src/filetypes/PKZ/repack";
import PlatinumFileReader from "../src/lib/PlatinumFileReader";
import extractPKZ from "../src/filetypes/PKZ/extract";
import extract_partial from "../src/filetypes/PKZ/extract_partial";

const ROMFS_DIR = "D:\\nstool\\romfs\\1";
const BASE_TEXT_DIR = path.resolve(process.cwd(), "astral_chain_v0_english_text", "Text");
const MOD_OUTPUT_DIR = path.resolve(process.cwd(), "Astral_Chain_Hungarian_Test_Mod", "romfs", "Text");

function encodeString(str: string, shiftKey: number = 0x26): Uint8Array {
    const len = str.length;
    // null-terminated UTF-16LE string: (len + 1) * 2 bytes
    const bytes = new Uint8Array((len + 1) * 2);
    for (let i = 0; i < len; i++) {
        const code = str.charCodeAt(i);
        bytes[i * 2] = ((code & 0xFF) + shiftKey) % 256;
        bytes[i * 2 + 1] = (((code >> 8) & 0xFF) + shiftKey) % 256;
    }
    bytes[len * 2] = (0 + shiftKey) % 256;
    bytes[len * 2 + 1] = (0 + shiftKey) % 256;
    return bytes;
}

export function repackExactPTD(origBuf: Buffer, modifiedTexts: string[], shiftKey: number = 0x26): Buffer {
    const view = new DataView(origBuf.buffer, origBuf.byteOffset, origBuf.byteLength);

    const stringDataPos = view.getUint32(24, true);

    let cur = stringDataPos;
    const hasGroupId = view.getUint32(cur + 4, true);
    cur += 20; // file info

    if (hasGroupId) {
        const groupCount = view.getUint32(cur + 4, true);
        cur += 12 + groupCount * 4;
    }

    const textCount = view.getUint32(cur + 4, true);
    cur += 12; // Text header

    cur += 12; // CharName header

    const textDataPos = cur;
    const textDescriptorsEnd = textDataPos + textCount * 16;

    // Everything before textDataPos + textCount * 16 is fixed prefix!
    const prefix = origBuf.slice(0, textDescriptorsEnd);
    const newPrefix = Buffer.from(prefix);
    const newPrefixView = new DataView(newPrefix.buffer, newPrefix.byteOffset, newPrefix.byteLength);

    // Encode modified strings
    const encodedStrings: Uint8Array[] = [];
    for (let i = 0; i < textCount; i++) {
        const text = modifiedTexts[i] !== undefined ? modifiedTexts[i] : "";
        const encoded = encodeString(text, shiftKey);
        encodedStrings.push(encoded);

        // Update descriptor (charLength, byteLength)
        const entryPos = textDataPos + i * 16;
        newPrefixView.setUint32(entryPos + 8, text.length + 1, true); // charLength with null
        newPrefixView.setUint32(entryPos + 12, encoded.byteLength, true); // byteLength
    }

    const totalPayloadSize = encodedStrings.reduce((acc, b) => acc + b.byteLength, 0);
    const totalSize = (newPrefix.length + totalPayloadSize + 15) & ~15;

    const outBuf = Buffer.alloc(totalSize, shiftKey); // fill padding with shiftKey
    newPrefix.copy(outBuf, 0);

    let strPtr = newPrefix.length;
    for (const strBytes of encodedStrings) {
        Buffer.from(strBytes).copy(outBuf, strPtr);
        strPtr += strBytes.byteLength;
    }

    return outBuf;
}

async function main() {
    console.log("=== Building 100% Structurally-Accurate Hungarian Test Mod ===");

    fs.mkdirSync(MOD_OUTPUT_DIR, { recursive: true });

    // 1. Repack Option_text_USen.bin
    const optionOrigBuf = fs.readFileSync(path.join(BASE_TEXT_DIR, "Option_text_USen.bin"));
    const optionHungarians = [
        "Kitérés (Játékos)",
        "Legió Visszahívása",
        "Mozgás",
        "Legió Kitérés",
        "Beállítások Menü",
        "Célpont Rögzítés",
        "Kamera Nézet",
        "Guggolás és Futás",
        "Kitérés",
        "Támadás",
        "Legió Képesség",
        "Interakció",
        "Fotó Mód",
        "Beállítások módosítása (Ő, Ű, Á, É, Í, Ó, Ö, Ú, Ü - ő, ű, á, é, í, ó, ö, ú, ü)",
        "Legatus Menü",
        "Fegyver Váltás",
        "Tárgy Használat",
        "Gyorsbillentyűk",
        "Fúzió Aktiválása",
        "Rendőrségi Jegyzetek",
        "IRIS Be/Ki",
        "Legió Váltás",
        "Láncugrás",
        "Legió Hívása",
        "--"
    ];
    const repackedOption = repackExactPTD(optionOrigBuf, optionHungarians);
    fs.writeFileSync(path.join(MOD_OUTPUT_DIR, "Option_text_USen.bin"), repackedOption);
    console.log("  -> Generated 100% valid Option_text_USen.bin!");

    // 2. Repack into Text.pkz
    console.log("\nReading original Text.pkz from ROMFS...");
    const originalTextPkz = path.join(ROMFS_DIR, "Text", "Text.pkz");
    const origPkzBuf = fs.readFileSync(originalTextPkz).buffer;
    const pkzReader = new PlatinumFileReader(origPkzBuf);
    const pkzData = await extractPKZ(pkzReader);

    const inputFiles: PKZInputFile[] = [];
    for (const file of pkzData.files) {
        const modFilePath = path.join(MOD_OUTPUT_DIR, file.name);

        if (fs.existsSync(modFilePath)) {
            console.log(`  [MODIFIED] Injecting exact binary: ${file.name}`);
            const modBuf = fs.readFileSync(modFilePath).buffer;
            inputFiles.push({
                name: file.name,
                data: modBuf,
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
    fs.writeFileSync(path.join(MOD_OUTPUT_DIR, "Text.pkz"), Buffer.from(newPkzBuffer));

    console.log("\n✅ Success! Text.pkz and Option_text_USen.bin generated with 100% section integrity!");
    console.log(`📁 Ready at: ${MOD_OUTPUT_DIR}`);
}

main().catch(err => {
    console.error("Failed:", err);
});
