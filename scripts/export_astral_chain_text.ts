import * as fs from "fs";
import * as path from "path";
import PlatinumFileReader from "../src/lib/PlatinumFileReader";
import extractPKZ from "../src/filetypes/PKZ/extract";
import extract_partial from "../src/filetypes/PKZ/extract_partial";
import extractPTD from "../src/filetypes/PTD/extract";
import extractBXM from "../src/filetypes/BXM/extract";
import extractDAT from "../src/filetypes/DAT/extract";

const ROMFS_DIR = "D:\\nstool\\romfs\\1";
const OUTPUT_DIR = path.resolve(process.cwd(), "astral_chain_v0_english_text");

async function processTextPkz() {
    const textPkzPath = path.join(ROMFS_DIR, "Text", "Text.pkz");
    if (!fs.existsSync(textPkzPath)) {
        console.warn(`Text.pkz not found at ${textPkzPath}`);
        return;
    }

    console.log(`Processing Text.pkz...`);
    const buffer = fs.readFileSync(textPkzPath).buffer;
    const pkzReader = new PlatinumFileReader(buffer);
    const pkzData = await extractPKZ(pkzReader);

    const outTextDir = path.join(OUTPUT_DIR, "Text");
    fs.mkdirSync(outTextDir, { recursive: true });

    let exportedCount = 0;

    for (const file of pkzData.files) {
        const isEnglish = file.name.includes("USen") || 
                          file.name.includes("English") ||
                          file.name.includes("TalkSubtitleMessage") ||
                          (!file.name.includes("EU") && !file.name.includes("JP") && !file.name.includes("CN") && !file.name.includes("TW") && !file.name.includes("FR") && !file.name.includes("IT") && !file.name.includes("ES") && !file.name.includes("DE") && !file.name.includes("KO"));

        if (!isEnglish) continue;

        try {
            const partial = await extract_partial(file, pkzData);
            const subDir = path.join(outTextDir, path.dirname(file.name));
            fs.mkdirSync(subDir, { recursive: true });

            const baseName = path.basename(file.name);

            if (baseName.endsWith(".bin") || baseName.endsWith(".ptd")) {
                const reader = new PlatinumFileReader(partial.data);
                const ptd = await extractPTD(reader);

                const jsonPath = path.join(subDir, baseName.replace(/\.bin$/i, ".json"));
                fs.writeFileSync(jsonPath, JSON.stringify(ptd, null, 2), "utf-8");

                const binPath = path.join(subDir, baseName);
                fs.writeFileSync(binPath, Buffer.from(partial.data));

                exportedCount++;
                console.log(`  [PTD->JSON] ${file.name} (${ptd.entries.length} strings)`);
            } else if (baseName.endsWith(".bxm")) {
                const reader = new PlatinumFileReader(partial.data);
                const bxm = await extractBXM(reader);

                const xmlPath = path.join(subDir, baseName.replace(/\.bxm$/i, ".xml"));
                fs.writeFileSync(xmlPath, bxm.xml || "", "utf-8");

                const rawPath = path.join(subDir, baseName);
                fs.writeFileSync(rawPath, Buffer.from(partial.data));

                exportedCount++;
                console.log(`  [BXM->XML] ${file.name}`);
            } else {
                const rawPath = path.join(subDir, baseName);
                fs.writeFileSync(rawPath, Buffer.from(partial.data));
                exportedCount++;
            }
        } catch (err) {
            console.error(`  Error extracting ${file.name}:`, err);
        }
    }

    console.log(`Finished Text.pkz: ${exportedCount} English text files exported.`);
}

async function processQuestPkz() {
    const questPkzPath = path.join(ROMFS_DIR, "quest", "quest.pkz");
    if (!fs.existsSync(questPkzPath)) {
        console.warn(`quest.pkz not found at ${questPkzPath}`);
        return;
    }

    console.log(`\nProcessing quest.pkz...`);
    const buffer = fs.readFileSync(questPkzPath).buffer;
    const pkzReader = new PlatinumFileReader(buffer);
    const pkzData = await extractPKZ(pkzReader);

    const outQuestDir = path.join(OUTPUT_DIR, "quest");
    fs.mkdirSync(outQuestDir, { recursive: true });

    let exportedCount = 0;

    for (const file of pkzData.files) {
        if (!file.name.endsWith(".dat")) continue;

        try {
            const partial = await extract_partial(file, pkzData);
            const datReader = new PlatinumFileReader(partial.data);
            const datData = await extractDAT(datReader);

            const questFolder = path.join(outQuestDir, file.name.replace(/\.dat$/i, ""));

            for (const subFile of datData.files) {
                const subBuffer = subFile.arrayBuffer;
                if (!subBuffer) continue;

                if (subFile.name.endsWith(".bxm")) {
                    fs.mkdirSync(questFolder, { recursive: true });
                    const subReader = new PlatinumFileReader(subBuffer);
                    const bxm = await extractBXM(subReader);

                    fs.writeFileSync(path.join(questFolder, subFile.name.replace(/\.bxm$/i, ".xml")), bxm.xml || "", "utf-8");
                    fs.writeFileSync(path.join(questFolder, subFile.name), Buffer.from(subBuffer));
                    exportedCount++;
                } else if (subFile.name.endsWith(".csv")) {
                    fs.mkdirSync(questFolder, { recursive: true });
                    fs.writeFileSync(path.join(questFolder, subFile.name), Buffer.from(subBuffer));
                    exportedCount++;
                } else if (subFile.name.endsWith(".bin")) {
                    fs.mkdirSync(questFolder, { recursive: true });
                    const subReader = new PlatinumFileReader(subBuffer);
                    try {
                        const ptd = await extractPTD(subReader);
                        if (ptd.entries && ptd.entries.length > 0) {
                            fs.writeFileSync(path.join(questFolder, subFile.name.replace(/\.bin$/i, ".json")), JSON.stringify(ptd, null, 2), "utf-8");
                        }
                    } catch {}
                    fs.writeFileSync(path.join(questFolder, subFile.name), Buffer.from(subBuffer));
                    exportedCount++;
                }
            }
        } catch (err) {
            console.error(`  Error extracting quest DAT ${file.name}:`, err);
        }
    }

    console.log(`Finished quest.pkz: ${exportedCount} quest dialogue/script files exported.`);
}

async function main() {
    console.log(`Starting Astral Chain v0 English Text Extraction...`);
    console.log(`Source: ${ROMFS_DIR}`);
    console.log(`Destination: ${OUTPUT_DIR}\n`);

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    await processTextPkz();
    await processQuestPkz();

    console.log(`\nAll English text files exported successfully to: ${OUTPUT_DIR}`);
}

main().catch(err => {
    console.error("Extraction failed:", err);
});
