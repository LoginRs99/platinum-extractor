import { describe, it, expect } from "vitest";
import PlatinumFileReader from "../src/lib/PlatinumFileReader";
import extractPTD from "../src/filetypes/PTD/extract";
import repackPTD from "../src/filetypes/PTD/repack";

function encodeString(str: string, shiftKey = 0x26): Uint8Array {
    const len = str.length;
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

function buildSyntheticMultiSectionPTD(): ArrayBuffer {
    const shiftKey = 0x26;

    // Keys in global key table
    const keys = ["KEY_HELLO", "KEY_WORLD", "KEY_FOO", "KEY_BAR"];
    const keyHashes = [0x10000001, 0x10000002, 0x20000001, 0x20000002];
    const encodedKeys = keys.map(k => encodeString(k, shiftKey));

    const hashCount = keys.length;
    const hashDataPos = 28;
    const keyDescSize = hashCount * 16;
    const keyStringsSize = encodedKeys.reduce((s, k) => s + k.byteLength, 0);
    const stringDataPos = hashDataPos + keyDescSize + keyStringsSize;

    // Section 0 data: 2 entries ("Hello", "World")
    const s0Texts = ["Hello", "World"];
    const s0Hashes = [0x10000001, 0x10000002];
    const s0EncodedTexts = s0Texts.map(t => encodeString(t, shiftKey));
    const s0TextPayloadSize = s0EncodedTexts.reduce((s, t) => s + t.byteLength, 0);

    // Section 1 data: 2 entries ("Foo", "Bar")
    const s1Texts = ["Foo", "Bar"];
    const s1Hashes = [0x20000001, 0x20000002];
    const s1EncodedTexts = s1Texts.map(t => encodeString(t, shiftKey));
    const s1TextPayloadSize = s1EncodedTexts.reduce((s, t) => s + t.byteLength, 0);

    // Offsets calculations
    // 2 Section headers = 40 bytes
    const s0Pos = stringDataPos;
    const s1Pos = stringDataPos + 20;

    // Section 0 Layout:
    // s0Pos + off1 (DataBlock) = stringDataPos + 40
    const s0Off1 = 40; // relative to s0Pos
    // DataBlock size: 12 bytes header + 2 * 4 bytes GroupId = 20 bytes
    const s0Off2 = s0Off1 + 20; // 60 bytes (relative to s0Pos)
    // ValueBlock at s0Pos + 60:
    // Text header: 12 bytes
    // CharName header: 12 bytes
    // Text descriptors: 2 * 16 = 32 bytes
    // Text payload: s0TextPayloadSize
    // CharName descriptors: 0 bytes
    const s0ValueBlockSize = 24 + 32 + s0TextPayloadSize;

    // Section 1 starts after Section 0
    const s1DataBlockAbsPos = s0Pos + s0Off2 + s0ValueBlockSize;
    const s1Off1 = s1DataBlockAbsPos - s1Pos;
    const s1Off2 = s1Off1 + 20; // ValueBlock after 20-byte DataBlock
    const s1ValueBlockSize = 24 + 32 + s1TextPayloadSize;

    const totalRawSize = s1Pos + s1Off2 + s1ValueBlockSize;
    const alignedSize = (totalRawSize + 15) & ~15;

    const buffer = new ArrayBuffer(alignedSize);
    const view = new DataView(buffer);
    const uint8 = new Uint8Array(buffer);
    uint8.fill(shiftKey);

    // 1. Main Header
    view.setUint8(0, 0x50); // 'P'
    view.setUint8(1, 0x54); // 'T'
    view.setUint8(2, 0x44); // 'D'
    view.setUint8(3, 0x00); // '\0'
    view.setUint32(4, 2, true); // version
    view.setUint32(8, shiftKey, true); // shiftKey
    view.setUint32(12, hashCount, true); // hashCount
    view.setUint32(16, hashDataPos, true); // hashDataPos
    view.setUint32(20, 2, true); // sectionCount = 2
    view.setUint32(24, stringDataPos, true); // stringDataPos

    // 2. Global Key Table - relOffset is relative to descriptor p
    let curKeyStrOff = 0;
    for (let i = 0; i < hashCount; i++) {
        const descPos = hashDataPos + i * 16;
        const relOffsetFromP = (hashCount - i) * 16 + curKeyStrOff;
        view.setUint32(descPos, keyHashes[i], true);
        view.setUint32(descPos + 4, relOffsetFromP, true);
        view.setUint32(descPos + 8, keys[i].length + 1, true);
        view.setUint32(descPos + 12, encodedKeys[i].byteLength, true);

        uint8.set(encodedKeys[i], hashDataPos + keyDescSize + curKeyStrOff);
        curKeyStrOff += encodedKeys[i].byteLength;
    }

    // 3. Section Headers (20 bytes each at stringDataPos)
    // Section 0 Header
    view.setUint32(s0Pos, 0xAAAAAAAA, true); // section hash
    view.setUint32(s0Pos + 4, 1, true); // count1
    view.setUint32(s0Pos + 8, s0Off1, true); // offset1
    view.setUint32(s0Pos + 12, 2, true); // count2
    view.setUint32(s0Pos + 16, s0Off2, true); // offset2

    // Section 1 Header
    view.setUint32(s1Pos, 0xBBBBBBBB, true); // section hash
    view.setUint32(s1Pos + 4, 1, true); // count1
    view.setUint32(s1Pos + 8, s1Off1, true); // offset1
    view.setUint32(s1Pos + 12, 2, true); // count2
    view.setUint32(s1Pos + 16, s1Off2, true); // offset2

    // 4. Write Section 0
    // Section 0 DataBlock
    const s0DataPos = s0Pos + s0Off1;
    view.setUint32(s0DataPos, 0x7805ac12, true);
    view.setUint32(s0DataPos + 4, 2, true); // groupCount = 2
    view.setUint32(s0DataPos + 8, 12, true);
    view.setUint32(s0DataPos + 12, s0Hashes[0], true);
    view.setUint32(s0DataPos + 16, s0Hashes[1], true);

    // Section 0 ValueBlock
    const s0ValPos = s0Pos + s0Off2;
    view.setUint32(s0ValPos, 0x3b8ba7c7, true); // Text header
    view.setUint32(s0ValPos + 4, 2, true); // textCount = 2
    view.setUint32(s0ValPos + 8, 24, true); // text offset

    view.setUint32(s0ValPos + 12, 0x3cc2b4f9, true); // CharName header
    view.setUint32(s0ValPos + 16, 0, true); // charNameCount = 0
    view.setUint32(s0ValPos + 20, 24 + 32 + s0TextPayloadSize, true); // offset past text strings

    // Section 0 Text Descriptors & Strings - relOffset is relative to descriptor p
    const s0DescPos = s0ValPos + 24;
    let s0PayloadOffset = 0;
    for (let i = 0; i < 2; i++) {
        const descP = s0DescPos + i * 16;
        const relOffsetFromDesc = (2 - i) * 16 + s0PayloadOffset;
        view.setUint32(descP, s0Hashes[i], true);
        view.setUint32(descP + 4, relOffsetFromDesc, true);
        view.setUint32(descP + 8, s0Texts[i].length + 1, true);
        view.setUint32(descP + 12, s0EncodedTexts[i].byteLength, true);

        uint8.set(s0EncodedTexts[i], s0DescPos + 32 + s0PayloadOffset);
        s0PayloadOffset += s0EncodedTexts[i].byteLength;
    }

    // 5. Write Section 1
    // Section 1 DataBlock
    const s1DataPos = s1Pos + s1Off1;
    view.setUint32(s1DataPos, 0x7805ac12, true);
    view.setUint32(s1DataPos + 4, 2, true); // groupCount = 2
    view.setUint32(s1DataPos + 8, 12, true);
    view.setUint32(s1DataPos + 12, s1Hashes[0], true);
    view.setUint32(s1DataPos + 16, s1Hashes[1], true);

    // Section 1 ValueBlock
    const s1ValPos = s1Pos + s1Off2;
    view.setUint32(s1ValPos, 0x3b8ba7c7, true); // Text header
    view.setUint32(s1ValPos + 4, 2, true); // textCount = 2
    view.setUint32(s1ValPos + 8, 24, true);

    view.setUint32(s1ValPos + 12, 0x3cc2b4f9, true); // CharName header
    view.setUint32(s1ValPos + 16, 0, true); // charNameCount = 0
    view.setUint32(s1ValPos + 20, 24 + 32 + s1TextPayloadSize, true);

    // Section 1 Text Descriptors & Strings - relOffset is relative to descriptor p
    const s1DescPos = s1ValPos + 24;
    let s1PayloadOffset = 0;
    for (let i = 0; i < 2; i++) {
        const descP = s1DescPos + i * 16;
        const relOffsetFromDesc = (2 - i) * 16 + s1PayloadOffset;
        view.setUint32(descP, s1Hashes[i], true);
        view.setUint32(descP + 4, relOffsetFromDesc, true);
        view.setUint32(descP + 8, s1Texts[i].length + 1, true);
        view.setUint32(descP + 12, s1EncodedTexts[i].byteLength, true);

        uint8.set(s1EncodedTexts[i], s1DescPos + 32 + s1PayloadOffset);
        s1PayloadOffset += s1EncodedTexts[i].byteLength;
    }

    return buffer;
}

describe("PTD Multi-Section Parser & Repacker Regression", () => {
    it("correctly extracts a synthetic 2-section PTD binary using structured parsing", async () => {
        const fixtureBuffer = buildSyntheticMultiSectionPTD();
        const reader = new PlatinumFileReader(fixtureBuffer);
        const result = await extractPTD(reader);

        // 1. Must use structured parsing branch (NOT fallback)
        expect(result.parseMethod).toBe("structured");

        // 2. Section count and total entries check
        expect(result.headerInfo?.sectionCount).toBe(2);
        expect(result.entries.length).toBe(4);

        // 3. Must have real resolved keys, NO fallback signatures and NO embedded nulls
        for (const entry of result.entries) {
            expect(entry.key?.startsWith("String_")).toBe(false);
            expect(entry.hash?.startsWith("entry_")).toBe(false);
            expect(entry.text.includes("\u0000")).toBe(false);
        }

        // 4. Exact text and key verification across both sections
        expect(result.entries[0]).toEqual({
            id: 0,
            hash: "10000001",
            key: "KEY_HELLO",
            text: "Hello"
        });

        expect(result.entries[1]).toEqual({
            id: 1,
            hash: "10000002",
            key: "KEY_WORLD",
            text: "World"
        });

        expect(result.entries[2]).toEqual({
            id: 2,
            hash: "20000001",
            key: "KEY_FOO",
            text: "Foo"
        });

        expect(result.entries[3]).toEqual({
            id: 3,
            hash: "20000002",
            key: "KEY_BAR",
            text: "Bar"
        });

        // 5. Semantic round-trip: repack and re-extract
        const repackedBuffer = await repackPTD(result);
        expect(repackedBuffer.byteLength).toBeGreaterThan(64);

        const repackedReader = new PlatinumFileReader(repackedBuffer);
        const reExtracted = await extractPTD(repackedReader);

        expect(reExtracted.parseMethod).toBe("structured");
        expect(reExtracted.headerInfo?.sectionCount).toBe(2);
        expect(reExtracted.entries.length).toBe(4);

        // Assert NO embedded nulls after round-trip either
        for (const entry of reExtracted.entries) {
            expect(entry.text.includes("\u0000")).toBe(false);
        }

        expect(reExtracted.entries[0].text).toBe("Hello");
        expect(reExtracted.entries[1].text).toBe("World");
        expect(reExtracted.entries[2].text).toBe("Foo");
        expect(reExtracted.entries[3].text).toBe("Bar");
    });
});
