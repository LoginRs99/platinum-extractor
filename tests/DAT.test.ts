import { describe, it, expect } from "vitest";
import PlatinumFileReader from "../src/lib/PlatinumFileReader";
import extractDAT from "../src/filetypes/DAT/extract";
import repackDAT from "../src/filetypes/DAT/repack";
import generateDATHash from "../src/filetypes/DAT/lib/generateDATHash";

describe("DAT Archive Parser & Repacker", () => {
    it("generates valid DAT hash buckets and tables", () => {
        const testFiles = [
            { name: "model.wmb" },
            { name: "texture.wta" },
            { name: "texture.wtp" },
            { name: "motion.mot" }
        ];

        const hashMap = generateDATHash(testFiles);
        expect(hashMap.byteLength).toBeGreaterThan(16);

        const view = new DataView(hashMap);
        const preHashShift = view.getUint32(0, true);
        const bucketOffsetsCount = view.getUint32(4, true);
        const hashesCount = view.getUint32(8, true);
        const fileIndicesCount = view.getUint32(12, true);

        expect(preHashShift).toBeLessThanOrEqual(31);
        expect(bucketOffsetsCount).toBeGreaterThan(0);
        expect(hashesCount).toBe(4);
        expect(fileIndicesCount).toBe(4);
    });

    it("round-trips multiple synthetic files through DAT repack -> extract", async () => {
        const file1Content = new TextEncoder().encode("Hello from file 1! Platinum Games rocks.");
        const file2Content = new Uint8Array([0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99]);
        const file3Content = new TextEncoder().encode("<root><test/></root>");

        const originalArchive = {
            files: [
                { name: "script.bxm", arrayBuffer: file1Content.buffer as ArrayBuffer },
                { name: "tex.wta", arrayBuffer: file2Content.buffer as ArrayBuffer },
                { name: "quest.xml", arrayBuffer: file3Content.buffer as ArrayBuffer }
            ]
        };

        // 1. Repack DAT
        const datBuffer = await repackDAT(originalArchive);
        expect(datBuffer.byteLength).toBeGreaterThan(0);

        // Verify DAT Magic: "DAT\0" = 5521732 (0x00544144 little-endian)
        const view = new DataView(datBuffer);
        expect(view.getUint32(0, true)).toBe(5521732);
        expect(view.getUint32(4, true)).toBe(3); // file count

        // 2. Extract DAT
        const reader = new PlatinumFileReader(datBuffer);
        const extracted = await extractDAT(reader);

        expect(extracted.files.length).toBe(3);
        expect(extracted.files[0].name).toBe("script.bxm");
        expect(extracted.files[1].name).toBe("tex.wta");
        expect(extracted.files[2].name).toBe("quest.xml");

        // Verify exact byte contents
        expect(Array.from(new Uint8Array(extracted.files[0].arrayBuffer))).toEqual(Array.from(file1Content));
        expect(Array.from(new Uint8Array(extracted.files[1].arrayBuffer))).toEqual(Array.from(file2Content));
        expect(Array.from(new Uint8Array(extracted.files[2].arrayBuffer))).toEqual(Array.from(file3Content));
    });
});
