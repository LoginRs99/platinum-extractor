import { describe, it, expect } from "vitest";
import { concatArrayBuffer, setArrayBuffer } from "../src/lib/arrayBufferTools";
import { swap32, swapUint32Array } from "../src/lib/bigEndianTools";
import gameSupport, { games, platforms } from "../src/lib/game";

describe("arrayBufferTools", () => {
    it("concatenates multiple ArrayBuffers in order", () => {
        const b1 = new Uint8Array([1, 2, 3]).buffer;
        const b2 = new Uint8Array([4, 5]).buffer;
        const b3 = new Uint8Array([6, 7, 8, 9]).buffer;

        const combined = concatArrayBuffer(b1, b2, b3);
        expect(combined.byteLength).toBe(9);
        expect(Array.from(new Uint8Array(combined))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it("sets ArrayBuffer at specified offset", () => {
        const dest = new ArrayBuffer(8);
        const src = new Uint8Array([0xAA, 0xBB, 0xCC]).buffer;

        setArrayBuffer(dest, src, 2);
        const result = new Uint8Array(dest);
        expect(result[0]).toBe(0);
        expect(result[1]).toBe(0);
        expect(result[2]).toBe(0xAA);
        expect(result[3]).toBe(0xBB);
        expect(result[4]).toBe(0xCC);
        expect(result[5]).toBe(0);
    });
});

describe("bigEndianTools", () => {
    it("swaps 32-bit integers endianness correctly", () => {
        const val = 0x12345678;
        const swapped = swap32(val);
        expect((swapped >>> 0)).toBe(0x78563412);
        expect((swap32(swapped) >>> 0)).toBe(0x12345678);
    });

    it("swaps Uint32Array elements in place", () => {
        const arr = new Uint32Array([0x00000001, 0x12345678, 0xAABBCCDD]);
        swapUint32Array(arr);
        expect(arr[0]).toBe(0x01000000);
        expect(arr[1]).toBe(0x78563412);
        expect(arr[2]).toBe(0xDDCCBBAA);
    });
});

describe("gameSupport table", () => {
    it("preserves all 18 supported game configurations", () => {
        const supportedKeys = Object.keys(gameSupport);
        expect(supportedKeys.length).toBe(18);

        // Check specific games
        expect(gameSupport[games.AstralChain]).toMatchObject({
            platform: platforms.Switch,
            name: "Astral Chain",
            deswizzlingRequired: true,
            astc: true
        });

        expect(gameSupport[games.NieRAutomata]).toMatchObject({
            platform: platforms.PC,
            name: "NieR Automata",
            deswizzlingRequired: false,
            astc: false
        });

        expect(gameSupport[games.Bayonetta3]).toMatchObject({
            platform: platforms.Switch,
            name: "Bayonetta 3",
            deswizzlingRequired: true,
            astc: true
        });

        expect(gameSupport[games.StarFoxZero]).toMatchObject({
            platform: platforms.WiiU,
            name: "Star Fox Zero",
            deswizzlingRequired: false,
            astc: false
        });
    });
});
