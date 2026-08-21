import * as fs from "fs";
import * as path from "path";

const MOD_DIR = path.resolve(process.cwd(), "Astral_Chain_Hungarian_Test_Mod");
const OLD_TEXT_DIR = path.join(MOD_DIR, "romfs", "Text");
const NEW_TEXT_DIR = path.join(MOD_DIR, "romfs", "1", "Text");

async function fixModPath() {
    console.log("=== Fixing Astral Chain RomFS Directory Structure ===");

    fs.mkdirSync(NEW_TEXT_DIR, { recursive: true });

    if (fs.existsSync(OLD_TEXT_DIR)) {
        const files = fs.readdirSync(OLD_TEXT_DIR);
        for (const file of files) {
            const oldPath = path.join(OLD_TEXT_DIR, file);
            const newPath = path.join(NEW_TEXT_DIR, file);
            fs.copyFileSync(oldPath, newPath);
            console.log(`  Copied: ${file} -> romfs/1/Text/${file}`);
        }
        // Remove old incorrect Text folder
        fs.rmSync(OLD_TEXT_DIR, { recursive: true, force: true });
    }

    console.log("\n✅ Done! The correct RomFS folder structure for Astral Chain is:");
    console.log(`📁 ${NEW_TEXT_DIR}`);
}

fixModPath().catch(err => console.error(err));
