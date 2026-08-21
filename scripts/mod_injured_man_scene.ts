import * as fs from "fs";
import * as path from "path";
import { parseExactPTD, encodeString } from "./exact_ptd_engine";

const BASE_TEXT_DIR = path.resolve(process.cwd(), "astral_chain_v0_english_text", "Text");
const MOD_DIR = path.resolve(process.cwd(), "Astral_Chain_Hungarian_Test_Mod", "romfs", "1", "Text");

async function main() {
    console.log("=== Translating 'Help the Injured Man' and Dialogue Scene ===");
    fs.mkdirSync(MOD_DIR, { recursive: true });

    // 1. Update Core_text_USen.bin (Quest Objectives & Missions)
    console.log("\n1. Processing Core_text_USen.bin...");
    const coreOrigBuf = fs.readFileSync(path.join(BASE_TEXT_DIR, "Core_text_USen.bin"));
    const coreModifiedBuf = Buffer.from(coreOrigBuf);
    const corePtd = parseExactPTD(coreOrigBuf);

    const coreReplacements: Record<string, string> = {
        // "Help the injured man." (21 chars) -> "Segíts a sérültnek!" (21 chars)
        "CORE_MISSION_PURPOSE_2101_00": "Segíts a sérültnek!  ",
        "CORE_TUTORIAL_BTN_1000": "[BTN:LS ] [COLOR:2 ]Mozgás[COLOR:N ]",
        "CORE_TUTORIAL_BTN_1010": "[BTN:R2 ] [COLOR:2 ]Támad![COLOR:N ]",
        "CORE_TUTORIAL_BTN_1020": "[BTN:X ] [COLOR:2 ]Kitér[COLOR:N ]   ",
        "CORE_TUTORIAL_BTN_1030": "[BTN:L2 ] [COLOR:2 ]Gyorsítás![COLOR:N ] ",
        "CORE_TUTORIAL_BTN_1040": "Tartsd [BTN:R2 ] [COLOR:2 ]Lövés-Golyó![COLOR"
    };

    let coreTextPtr = corePtd.headerInfo.textDataPos + corePtd.entries.length * 16;
    for (let i = 0; i < corePtd.entries.length; i++) {
        const entry = corePtd.entries[i];
        const descPos = corePtd.headerInfo.textDataPos + i * 16;
        const byteLen = coreModifiedBuf.readUInt32LE(descPos + 12);
        const maxChars = (byteLen / 2) - 1;

        if (entry.key && coreReplacements[entry.key]) {
            let repl = coreReplacements[entry.key];
            if (repl.length > maxChars) {
                repl = repl.slice(0, maxChars);
            } else if (repl.length < maxChars) {
                repl = repl.padEnd(maxChars, " ");
            }

            console.log(`  Replacing [${entry.key}]: "${entry.text}" -> "${repl}"`);
            const encoded = encodeString(repl, corePtd.shiftKey);
            Buffer.from(encoded).copy(coreModifiedBuf, coreTextPtr);
        }

        coreTextPtr += byteLen;
    }
    fs.writeFileSync(path.join(MOD_DIR, "Core_text_USen.bin"), coreModifiedBuf);
    console.log(`  -> Saved Core_text_USen.bin (${coreModifiedBuf.length} bytes)`);

    // 2. Update CharaName_USen.bin (NPC Names: "Injured Man" -> "Sérült Férfi")
    console.log("\n2. Processing CharaName_USen.bin...");
    const charaOrigBuf = fs.readFileSync(path.join(BASE_TEXT_DIR, "CharaName_USen.bin"));
    const charaModifiedBuf = Buffer.from(charaOrigBuf);
    const charaPtd = parseExactPTD(charaOrigBuf);

    let charaTextPtr = charaPtd.headerInfo.textDataPos + charaPtd.entries.length * 16;
    for (let i = 0; i < charaPtd.entries.length; i++) {
        const entry = charaPtd.entries[i];
        const descPos = charaPtd.headerInfo.textDataPos + i * 16;
        const byteLen = charaModifiedBuf.readUInt32LE(descPos + 12);
        const maxChars = (byteLen / 2) - 1;

        if (entry.text === "Injured Man") {
            let repl = "Sérült Férfi"; // 12 chars (Injured Man is 11, let's pad/fit)
            if (repl.length > maxChars) repl = repl.slice(0, maxChars);
            else if (repl.length < maxChars) repl = repl.padEnd(maxChars, " ");

            console.log(`  Replacing [${entry.key}]: "${entry.text}" -> "${repl}"`);
            const encoded = encodeString(repl, charaPtd.shiftKey);
            Buffer.from(encoded).copy(charaModifiedBuf, charaTextPtr);
        }

        charaTextPtr += byteLen;
    }
    fs.writeFileSync(path.join(MOD_DIR, "CharaName_USen.bin"), charaModifiedBuf);
    console.log(`  -> Saved CharaName_USen.bin (${charaModifiedBuf.length} bytes)`);

    // 3. Update TalkSubtitleMessage_USen.bin (In-Place binary search & replace for "Boy, am I glad to see you...")
    console.log("\n3. Processing TalkSubtitleMessage_USen.bin...");
    const subOrigBuf = fs.readFileSync(path.join(BASE_TEXT_DIR, "TalkSubtitleMessage_USen.bin"));
    const subModifiedBuf = Buffer.from(subOrigBuf);

    // Target text: "Boy, am I glad to see you. Give me a hand, will you?" (53 chars)
    // Hungarian:   "Hű, de örülök neked! Tudnál segíteni egy picit kérlek?" (53 chars)
    const targetStr = "Boy, am I glad to see you. Give me a hand, will you?";
    const hungarianSub = "Hű, de örülök neked! Tudnál segíteni nekem (ő, ű, á)?"; // exactly 53 chars!

    const targetEncoded = encodeString(targetStr, 0x26);
    const replEncoded = encodeString(hungarianSub, 0x26);

    let matchCount = 0;
    for (let i = 0; i <= subModifiedBuf.length - targetEncoded.length; i += 2) {
        let match = true;
        for (let j = 0; j < targetEncoded.length; j++) {
            if (subModifiedBuf[i + j] !== targetEncoded[j]) {
                match = false;
                break;
            }
        }
        if (match) {
            console.log(`  Found subtitle match at offset 0x${i.toString(16)}! Replacing...`);
            Buffer.from(replEncoded).copy(subModifiedBuf, i);
            matchCount++;
        }
    }

    fs.writeFileSync(path.join(MOD_DIR, "TalkSubtitleMessage_USen.bin"), subModifiedBuf);
    console.log(`  -> Saved TalkSubtitleMessage_USen.bin (${subModifiedBuf.length} bytes, replaced ${matchCount} matches)`);

    console.log("\n✅ Done! The 'Help the injured man' mission and 'Boy am I glad to see you' dialogue are now translated!");
    console.log(`📁 Files in: ${MOD_DIR}`);
}

main().catch(err => console.error(err));
