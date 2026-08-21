import { describe, it, expect } from "vitest";
import PlatinumFileReader from "../src/lib/PlatinumFileReader";
import extractWTA, { WTATexture } from "../src/filetypes/WTA/extract";
import { addDDSHeader } from "../src/filetypes/WTA/scripts/DDS";
import { addASTCHeader } from "../src/filetypes/WTA/scripts/ASTC";
import { swizzle, deswizzle } from "../src/filetypes/WTA/scripts/tegrax1swizzle";

describe("WTA Texture Header & Deswizzle Suite", () => {
    it("generates valid DDS headers", () => {
        const dummyData = new Uint8Array(256);
        const ddsBuffer = addDDSHeader("BC1_UNORM", 64, 64, 1, dummyData.buffer as ArrayBuffer);

        expect(ddsBuffer.byteLength).toBe(128 + 256);
        const view = new DataView(ddsBuffer);
        // Magic 'DDS ' = 0x20534444 (542327876)
        expect(view.getUint32(0, true)).toBe(542327876);
        expect(view.getUint32(4, true)).toBe(124); // header size
        expect(view.getUint32(12, true)).toBe(64); // height
        expect(view.getUint32(16, true)).toBe(64); // width
    });

    it("generates valid ASTC headers", () => {
        const dummyData = new Uint8Array(128);
        const astcBuffer = addASTCHeader("ASTC_4x4_UNORM", 32, 32, 1, dummyData.buffer as ArrayBuffer);

        expect(astcBuffer.byteLength).toBe(16 + 128);
        const view = new DataView(astcBuffer);
        // Magic ASTC = 0x5CA1AB13 (1554098963)
        expect(view.getUint32(0, true)).toBe(1554098963);
        expect(view.getUint8(4)).toBe(4); // block width
        expect(view.getUint8(5)).toBe(4); // block height
        expect(view.getUint8(6)).toBe(1); // block depth
    });

    it("round-trips uncompressed block-linear texture data through swizzle -> deswizzle", () => {
        const width = 16;
        const height = 16;
        const depth = 1;
        const blkWidth = 1;
        const blkHeight = 1;
        const blkDepth = 1;
        const roundPitch = 1;
        const bpp = 4;
        const tileMode = 0;
        const blockHeightLog2 = 0;

        // Create patterned pixel data (16x16 RGBA)
        const srcData = new Uint8Array(width * height * bpp);
        for (let i = 0; i < srcData.length; i++) {
            srcData[i] = (i * 17) & 0xFF;
        }

        // Swizzle (linear -> block-linear)
        const swizzled = swizzle(
            width, height, depth,
            blkWidth, blkHeight, blkDepth,
            roundPitch, bpp, tileMode,
            blockHeightLog2,
            srcData.buffer as ArrayBuffer
        );

        // Deswizzle (block-linear -> linear)
        const deswizzled = deswizzle(
            width, height, depth,
            blkWidth, blkHeight, blkDepth,
            roundPitch, bpp, tileMode,
            blockHeightLog2,
            swizzled
        );

        const deswizzledBytes = new Uint8Array(deswizzled).slice(0, srcData.length);
        expect(Array.from(deswizzledBytes)).toEqual(Array.from(srcData));
    });
});
