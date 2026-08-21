import * as fs from "fs";
import * as path from "path";
import { ZstdInit } from "@oneidentity/zstd-js";
import PlatinumFileReader from "../src/lib/PlatinumFileReader";
import extractPKZ from "../src/filetypes/PKZ/extract";

const ROMFS_DIR = "D:\\nstool\\romfs\\1";
const MOD_TEXT_DIR = path.resolve(process.cwd(), "Astral_Chain_Hungarian_Test_Mod", "romfs", "1", "Text");

async function main() {
    console.log("=== Generating 100% Patch-Perfect ZStandard Text.pkz ===");
    const { ZstdStream } = await ZstdInit();

    const origPkzPath = path.join(ROMFS_DIR, "Text", "Text.pkz");
    const origPkzBuf = fs.readFileSync(origPkzPath);
    const pkzData = await extractPKZ(new PlatinumFileReader(origPkzBuf.buffer));

    console.log(`Original Text.pkz: ${origPkzBuf.length} bytes, ${pkzData.files.length} files.`);

    // 1. Prepare compressed payloads
    const fileEntries: { name: string; uncompressedSize: number; compressedData: Uint8Array }[] = [];

    for (let i = 0; i < pkzData.files.length; i++) {
        const file = pkzData.files[i];
        const modFilePath = path.join(MOD_TEXT_DIR, file.name);

        if (fs.existsSync(modFilePath)) {
            console.log(`  [PATCHING WITH TRANSLATION] ${file.name}`);
            const modBuf = fs.readFileSync(modFilePath);
            const compressed = ZstdStream.compress(modBuf);
            fileEntries.push({
                name: file.name,
                uncompressedSize: modBuf.length,
                compressedData: compressed
            });
        } else {
            const origCompressed = origPkzBuf.subarray(file.offset, file.offset + file.compressedSize);
            fileEntries.push({
                name: file.name,
                uncompressedSize: file.size,
                compressedData: new Uint8Array(origCompressed)
            });
        }
    }

    // 2. Clone the original header and string table (first 5184 bytes / 0x1440)
    const headerAndTableSize = 0x1440;
    const headerPrefix = Buffer.from(origPkzBuf.subarray(0, headerAndTableSize));
    const prefixView = new DataView(headerPrefix.buffer, headerPrefix.byteOffset, headerPrefix.byteLength);

    // 3. Assemble payloads starting at 0x1440
    let currentPayloadOffset = 0x1440;
    const payloadBuffers: Uint8Array[] = [];
    let totalUncompressed = 0n;

    for (let i = 0; i < fileEntries.length; i++) {
        const entry = fileEntries[i];
        currentPayloadOffset = (currentPayloadOffset + 63) & ~63; // 64-byte alignment

        // Update descriptor in header (at 32 + i * 32)
        const descPtr = 32 + i * 32;
        prefixView.setBigUint64(descPtr + 8, BigInt(entry.uncompressedSize), true);
        prefixView.setBigUint64(descPtr + 16, BigInt(currentPayloadOffset), true);
        prefixView.setBigUint64(descPtr + 24, BigInt(entry.compressedData.byteLength), true);

        payloadBuffers.push(entry.compressedData);
        currentPayloadOffset += entry.compressedData.byteLength;
        totalUncompressed += BigInt(entry.uncompressedSize);
    }

    // Update total uncompressed size in main header
    prefixView.setBigUint64(8, totalUncompressed, true);

    const totalFileSize = (currentPayloadOffset + 63) & ~63;
    const finalBuffer = Buffer.alloc(totalFileSize, 0);

    headerPrefix.copy(finalBuffer, 0);

    let writePtr = 0x1440;
    for (let i = 0; i < fileEntries.length; i++) {
        writePtr = (writePtr + 63) & ~63;
        Buffer.from(payloadBuffers[i]).copy(finalBuffer, writePtr);
        writePtr += payloadBuffers[i].byteLength;
    }

    const outPkzPath = path.join(MOD_TEXT_DIR, "Text.pkz");
    fs.writeFileSync(outPkzPath, finalBuffer);

    console.log(`\n🎉 Generated Patch-Perfect Text.pkz: ${outPkzPath} (${(finalBuffer.length / 1024 / 1024).toFixed(2)} MB)`);
}

main().catch(err => console.error(err));
