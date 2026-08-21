import * as fs from "fs";
import * as path from "path";
import repackPKZ, { type PKZInputFile } from "../src/filetypes/PKZ/repack";
import PlatinumFileReader from "../src/lib/PlatinumFileReader";
import extractPKZ from "../src/filetypes/PKZ/extract";
import extract_partial from "../src/filetypes/PKZ/extract_partial";

const ROMFS_DIR = "D:\\nstool\\romfs\\1";
const MOD_DIR = path.resolve(process.cwd(), "Astral_Chain_Hungarian_Test_Mod", "romfs", "Text");

async function repackTextPkz() {
    console.log("=== Repacking Astral Chain Text.pkz with Hungarian Translations ===");

    const originalTextPkz = path.join(ROMFS_DIR, "Text", "Text.pkz");
    if (!fs.existsSync(originalTextPkz)) {
        console.error(`Original Text.pkz not found at: ${originalTextPkz}`);
        return;
    }

    console.log("Reading original Text.pkz...");
    const origBuffer = fs.readFileSync(originalTextPkz).buffer;
    const pkzReader = new PlatinumFileReader(origBuffer);
    const pkzData = await extractPKZ(pkzReader);

    const inputFiles: PKZInputFile[] = [];

    for (const file of pkzData.files) {
        const modFilePath = path.join(MOD_DIR, file.name);

        if (fs.existsSync(modFilePath)) {
            console.log(`  [MODIFIED] Injecting Hungarian file: ${file.name}`);
            const modBuf = fs.readFileSync(modFilePath).buffer;
            inputFiles.push({
                name: file.name,
                data: modBuf,
                compressionType: "None"
            });
        } else {
            // Extract original file payload
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

    const outPkzPath = path.join(MOD_DIR, "Text.pkz");
    fs.writeFileSync(outPkzPath, Buffer.from(newPkzBuffer));

    console.log(`\n✅ Successfully generated repacked Text.pkz!`);
    console.log(`File size: ${(newPkzBuffer.byteLength / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Output: ${outPkzPath}`);
}

repackTextPkz().catch(err => {
    console.error("Repacking failed:", err);
});
