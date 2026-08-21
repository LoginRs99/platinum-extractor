import * as fs from "fs";
import * as path from "path";
import { ZstdInit } from "@oneidentity/zstd-js";
import PlatinumFileReader from "../src/lib/PlatinumFileReader";
import extractPKZ from "../src/filetypes/PKZ/extract";
import extractDAT from "../src/filetypes/DAT/extract";
import repackDAT from "../src/filetypes/DAT/repack";

const ROMFS_DIR = "D:\\nstool\\romfs\\1";
const EDEN_PORTABLE_PATH = "E:\\EDEN\\user\\load\\01007300020FA000\\Astral_Chain_Hungarian_Test_Mod";

async function patchFontPkz() {
    console.log("=== Generating Authentic ZStandard font.pkz with ő, ű, Ő, Ű Glyphs ===");
    const { ZstdStream } = await ZstdInit();

    const origFontPkzPath = path.join(ROMFS_DIR, "font", "font.pkz");
    const origPkzBuf = fs.readFileSync(origFontPkzPath);
    const pkzData = await extractPKZ(new PlatinumFileReader(origPkzBuf.buffer));

    // Phase 1: Decompress all DAT files in read phase
    const decompressedDatFiles: { index: number; name: string; dat: any }[] = [];

    for (let i = 0; i < pkzData.files.length; i++) {
        const file = pkzData.files[i];
        if (file.name.endsWith(".dat")) {
            const offset = Number(file.offset);
            const compSize = Number(file.compressedSize);
            const compSlice = origPkzBuf.subarray(offset, offset + compSize);
            const decompBytes = ZstdStream.decompress(new Uint8Array(compSlice));
            const dat = await extractDAT(new PlatinumFileReader(decompBytes.buffer.slice(decompBytes.byteOffset, decompBytes.byteOffset + decompBytes.byteLength)));
            decompressedDatFiles.push({ index: i, name: file.name, dat });
        }
    }

    console.log(`Decompressed all ${decompressedDatFiles.length} font DAT packages.`);

    // Phase 2: Patch FTB files
    const patchedDatBuffers: { index: number; name: string; buffer: ArrayBuffer }[] = [];

    for (const item of decompressedDatFiles) {
        for (const internalFile of item.dat.files) {
            if (internalFile.name.endsWith(".ftb")) {
                const ftbBuf = Buffer.from(internalFile.arrayBuffer);
                const view = new DataView(internalFile.arrayBuffer);

                let oDesc: Buffer | null = null;
                let uDesc: Buffer | null = null;
                let capODesc: Buffer | null = null;
                let capUDesc: Buffer | null = null;

                for (let j = 0x100; j < ftbBuf.length - 12; j += 2) {
                    const code = view.getUint16(j, true);
                    if (code === 0x00f6 && !oDesc) oDesc = Buffer.from(ftbBuf.subarray(j, j + 12));
                    if (code === 0x00fc && !uDesc) uDesc = Buffer.from(ftbBuf.subarray(j, j + 12));
                    if (code === 0x00d6 && !capODesc) capODesc = Buffer.from(ftbBuf.subarray(j, j + 12));
                    if (code === 0x00dc && !capUDesc) capUDesc = Buffer.from(ftbBuf.subarray(j, j + 12));
                }

                if (oDesc && uDesc) {
                    const oCopy = Buffer.from(oDesc);
                    oCopy.writeUInt16LE(0x0151, 0); // 'ő'

                    const uCopy = Buffer.from(uDesc);
                    uCopy.writeUInt16LE(0x0171, 0); // 'ű'

                    const capOCopy = capODesc ? Buffer.from(capODesc) : Buffer.from(oCopy);
                    capOCopy.writeUInt16LE(0x0150, 0); // 'Ő'

                    const capUCopy = capUDesc ? Buffer.from(capUDesc) : Buffer.from(uCopy);
                    capUCopy.writeUInt16LE(0x0170, 0); // 'Ű'

                    const patchedFtbBuf = Buffer.concat([ftbBuf, oCopy, uCopy, capOCopy, capUCopy]);
                    internalFile.arrayBuffer = patchedFtbBuf.buffer.slice(patchedFtbBuf.byteOffset, patchedFtbBuf.byteOffset + patchedFtbBuf.byteLength);
                    console.log(`  -> ${internalFile.name}: Injected ő (0x0151), ű (0x0171), Ő (0x0150), Ű (0x0170)`);
                }
            }
        }
        const repacked = await repackDAT(item.dat);
        patchedDatBuffers.push({ index: item.index, name: item.name, buffer: repacked });
    }

    // Phase 3: Compress patched DAT files
    const fileEntries: { name: string; uncompressedSize: number; compressedData: Uint8Array }[] = [];

    for (let i = 0; i < pkzData.files.length; i++) {
        const file = pkzData.files[i];
        const patched = patchedDatBuffers.find(p => p.index === i);

        if (patched) {
            console.log(`Compressing ${patched.name}...`);
            const compressed = ZstdStream.compress(new Uint8Array(patched.buffer));
            fileEntries.push({
                name: file.name,
                uncompressedSize: patched.buffer.byteLength,
                compressedData: compressed
            });
        } else {
            const offset = Number(file.offset);
            const compSize = Number(file.compressedSize);
            const origCompressed = origPkzBuf.subarray(offset, offset + compSize);
            fileEntries.push({
                name: file.name,
                uncompressedSize: Number(file.size),
                compressedData: new Uint8Array(origCompressed)
            });
        }
    }

    // 4. Build string table & assemble final font.pkz
    const headerSize = 32;
    const descriptorsTotalSize = pkzData.files.length * 32;
    const stringTableOffset = headerSize + descriptorsTotalSize;

    const encoder = new TextEncoder();
    const stringTableParts: Uint8Array[] = [];
    const nameOffsets: number[] = [];
    let currentStrOffset = 0;

    const noneBytes = encoder.encode("None\0");
    const noneOffset = 0;
    stringTableParts.push(noneBytes);
    currentStrOffset += noneBytes.byteLength;

    const zstdBytes = encoder.encode("ZStandard\0");
    const zstdOffset = currentStrOffset;
    stringTableParts.push(zstdBytes);
    currentStrOffset += zstdBytes.byteLength;

    for (const f of pkzData.files) {
        const nameBytes = encoder.encode(`${f.name}\0`);
        nameOffsets.push(currentStrOffset);
        stringTableParts.push(nameBytes);
        currentStrOffset += nameBytes.byteLength;
    }

    const rawStringTableSize = currentStrOffset;
    const alignedStringTableSize = (rawStringTableSize + 15) & ~15;
    const stringTableBuffer = new Uint8Array(alignedStringTableSize);
    let strPtr = 0;
    for (const part of stringTableParts) {
        stringTableBuffer.set(part, strPtr);
        strPtr += part.byteLength;
    }

    let payloadStartOffset = stringTableOffset + alignedStringTableSize;
    payloadStartOffset = (payloadStartOffset + 63) & ~63;

    const filePayloadOffsets: number[] = [];
    let curPayloadOffset = payloadStartOffset;
    let totalUncompressed = 0n;

    for (const entry of fileEntries) {
        curPayloadOffset = (curPayloadOffset + 63) & ~63;
        filePayloadOffsets.push(curPayloadOffset);
        curPayloadOffset += entry.compressedData.byteLength;
        totalUncompressed += BigInt(entry.uncompressedSize);
    }

    const totalFileSize = (curPayloadOffset + 63) & ~63;
    const finalBuffer = new ArrayBuffer(totalFileSize);
    const view = new DataView(finalBuffer);
    const uint8View = new Uint8Array(finalBuffer);

    // Header
    view.setUint8(0, 0x70);
    view.setUint8(1, 0x6b);
    view.setUint8(2, 0x7a);
    view.setUint8(3, 0x6c);
    view.setUint32(4, 65536, true);
    view.setBigUint64(8, totalUncompressed, true);
    view.setUint32(16, pkzData.files.length, true);
    view.setUint32(20, headerSize, true);
    view.setUint32(24, alignedStringTableSize, true);
    view.setUint32(28, 0, true);

    // Descriptors
    for (let i = 0; i < pkzData.files.length; i++) {
        const descPtr = headerSize + i * 32;
        const entry = fileEntries[i];

        view.setUint32(descPtr, nameOffsets[i], true);
        view.setUint32(descPtr + 4, zstdOffset, true);
        view.setBigUint64(descPtr + 8, BigInt(entry.uncompressedSize), true);
        view.setBigUint64(descPtr + 16, BigInt(filePayloadOffsets[i]), true);
        view.setBigUint64(descPtr + 24, BigInt(entry.compressedData.byteLength), true);
    }

    // String Table
    uint8View.set(stringTableBuffer, stringTableOffset);

    // Payloads
    for (let i = 0; i < fileEntries.length; i++) {
        uint8View.set(fileEntries[i].compressedData, filePayloadOffsets[i]);
    }

    const outFontDir = path.resolve(process.cwd(), "astral_chain_translation", "romfs", "1", "font");
    fs.mkdirSync(outFontDir, { recursive: true });
    const outFontPkzPath = path.join(outFontDir, "font.pkz");
    fs.writeFileSync(outFontPkzPath, Buffer.from(finalBuffer));

    console.log(`\n🎉 Successfully generated font.pkz: ${outFontPkzPath} (${(finalBuffer.byteLength / 1024 / 1024).toFixed(2)} MB)`);

    // Auto-deploy to Eden
    if (fs.existsSync(path.dirname(EDEN_PORTABLE_PATH))) {
        const edenFont1 = path.join(EDEN_PORTABLE_PATH, "romfs", "1", "font");
        const edenFont = path.join(EDEN_PORTABLE_PATH, "romfs", "font");
        fs.mkdirSync(edenFont1, { recursive: true });
        fs.mkdirSync(edenFont, { recursive: true });

        fs.copyFileSync(outFontPkzPath, path.join(edenFont1, "font.pkz"));
        fs.copyFileSync(outFontPkzPath, path.join(edenFont, "font.pkz"));
        console.log("🚀 font.pkz deployed directly to Eden emulator!");
    }
}

patchFontPkz().catch(err => console.error(err));
