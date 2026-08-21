import { describe, it, expect } from "vitest";
import PlatinumFileReader from "../src/lib/PlatinumFileReader";
import extractPKZ from "../src/filetypes/PKZ/extract";

describe("PKZ Archive Parser", () => {
    it("extracts synthetic PKZ file descriptors and names correctly", async () => {
        // Build a synthetic PKZ buffer
        // Header: 32 bytes
        // [0..4]: magic 'pkzl' (0x6C7A6B70)
        // [4..8]: version 1
        // [8..16]: total size (BigUint64)
        // [16..20]: fileCount
        // [20..24]: fileDescriptorsOffset
        // [24..28]: fileNameTableLength
        // [28..32]: reserved
        
        const fileCount = 2;
        const headerSize = 32;
        const descriptorsOffset = 32;
        const descriptorsSize = fileCount * 32; // 64 bytes
        const nameTableOffset = descriptorsOffset + descriptorsSize; // 96

        const name1 = "stage_data.dat\0";
        const name2 = "textures.wta\0";
        const compType1 = "None\0";
        const compType2 = "ZStandard\0";

        const stringTableStr = name1 + compType1 + name2 + compType2;
        const stringTableBytes = new TextEncoder().encode(stringTableStr);

        const totalHeaderAndTableSize = nameTableOffset + stringTableBytes.byteLength;
        const bufferSize = totalHeaderAndTableSize + 128;
        const buffer = new ArrayBuffer(bufferSize);
        const view = new DataView(buffer);

        // Header
        view.setUint32(0, 0x6C7A6B70, true); // 'pkzl'
        view.setUint32(4, 1, true); // version
        view.setBigUint64(8, BigInt(bufferSize), true);
        view.setUint32(16, fileCount, true);
        view.setUint32(20, descriptorsOffset, true);
        view.setUint32(24, stringTableBytes.byteLength, true);

        // File 1 Descriptor (at 32)
        const name1Offset = 0;
        const comp1Offset = name1.length;
        view.setUint32(32, name1Offset, true);
        view.setUint32(36, comp1Offset, true);
        view.setBigUint64(40, 100n, true); // size
        view.setBigUint64(48, BigInt(totalHeaderAndTableSize), true); // offset
        view.setBigUint64(56, 100n, true); // compressedSize

        // File 2 Descriptor (at 64)
        const name2Offset = name1.length + compType1.length;
        const comp2Offset = name2Offset + name2.length;
        view.setUint32(64, name2Offset, true);
        view.setUint32(68, comp2Offset, true);
        view.setBigUint64(72, 500n, true);
        view.setBigUint64(80, BigInt(totalHeaderAndTableSize + 100), true);
        view.setBigUint64(88, 250n, true);

        // Write String Table at nameTableOffset (96)
        const uint8View = new Uint8Array(buffer);
        uint8View.set(stringTableBytes, nameTableOffset);

        // Extract with PKZ reader
        const reader = new PlatinumFileReader(buffer);
        const extracted = await extractPKZ(reader);

        expect(extracted.files.length).toBe(2);
        expect(extracted.files[0].name).toBe("stage_data.dat");
        expect(extracted.files[0].compressionType).toBe("None");
        expect(extracted.files[0].size).toBe(100);
        expect(extracted.files[0].compressedSize).toBe(100);

        expect(extracted.files[1].name).toBe("textures.wta");
        expect(extracted.files[1].compressionType).toBe("ZStandard");
        expect(extracted.files[1].size).toBe(500);
        expect(extracted.files[1].compressedSize).toBe(250);
    });
});
