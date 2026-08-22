import { describe, it, expect } from "vitest";
import PlatinumFileReader from "../src/lib/PlatinumFileReader";
import { resolveFile } from "../src/lib/FileHandler.worker";
import extractPTD from "../src/filetypes/PTD/extract";
import repackPTD from "../src/filetypes/PTD/repack";

describe("PTD Binary Text Archive Parser & Repacker", () => {
    it("resolves PTD file type by magic and extension", () => {
        expect(resolveFile("PTD\x00", "GameWord_EUde.bin")).toBe("PTD");
        expect(resolveFile("PTD\x00", "TalkSubtitleMessage.bin")).toBe("PTD");
    });

    it("round-trips text dictionary entries through JSON repack -> binary extract with UTF-16LE 0x26 shift", async () => {
        const sampleData = {
            magic: "PTD\0",
            shiftKey: 0x26,
            parseMethod: "structured" as const,
            entries: [
                { id: 0, key: "System_Title", text: "Neuron Police Department" },
                { id: 1, key: "Legion_Style", text: "Sword Legion Active" },
                { id: 2, key: "Dialog_Welcome", text: "Welcome to the Astral Plane." },
                { id: 3, key: "Rank_Reward", text: "Mission Complete: Rank S+" }
            ]
        };

        // 1. Repack JSON to binary PTD
        const repackedBuffer = await repackPTD(sampleData);
        expect(repackedBuffer.byteLength).toBeGreaterThan(28);
        expect(repackedBuffer.byteLength % 16).toBe(0);

        // Verify magic header
        const view = new DataView(repackedBuffer);
        expect(view.getUint8(0)).toBe(0x50); // 'P'
        expect(view.getUint8(1)).toBe(0x54); // 'T'
        expect(view.getUint8(2)).toBe(0x44); // 'D'
        expect(view.getUint8(3)).toBe(0x00); // '\0'
        expect(view.getUint32(8, true)).toBe(0x26); // shift key

        // 2. Extract binary PTD back to JSON
        const reader = new PlatinumFileReader(repackedBuffer);
        const extracted = await extractPTD(reader);

        expect(extracted.entries.length).toBe(4);
        expect(extracted.parseMethod).toBeDefined();

        expect(extracted.entries[0].id).toBe(0);
        expect(extracted.entries[0].text).toBe("Neuron Police Department");

        expect(extracted.entries[1].id).toBe(1);
        expect(extracted.entries[1].text).toBe("Sword Legion Active");

        expect(extracted.entries[2].id).toBe(2);
        expect(extracted.entries[2].text).toBe("Welcome to the Astral Plane.");

        expect(extracted.entries[3].id).toBe(3);
        expect(extracted.entries[3].text).toBe("Mission Complete: Rank S+");
    });

    it("marks parseMethod as fallback for corrupted/incomplete headers", async () => {
        const dummyBuffer = new ArrayBuffer(20);
        const reader = new PlatinumFileReader(dummyBuffer);
        const extracted = await extractPTD(reader);
        expect(extracted.parseMethod).toBe("fallback");
    });

    it("throws a clear error when structured repack entry count does not match original header count", async () => {
        const dummyPrefix = new Uint8Array(64);
        const mockStructuredData = {
            magic: "PTD\0",
            shiftKey: 0x26,
            parseMethod: "structured" as const,
            rawPrefix: dummyPrefix,
            headerInfo: {
                sectionCount: 1,
                stringDataPos: 28,
                sections: [
                    {
                        sectionIndex: 0,
                        sectionHeaderPos: 28,
                        valPos: 48,
                        textHeaderPos: 48,
                        charNameHeaderPos: 60,
                        textDescPos: 72,
                        textCount: 3,
                        charNameDescPos: 120,
                        charNameCount: 0,
                        charNameAndSuffix: new Uint8Array(0)
                    }
                ]
            },
            entries: [
                { id: 0, text: "Line 1" },
                { id: 1, text: "Line 2" }
                // Missing entry 3
            ]
        };

        await expect(repackPTD(mockStructuredData)).rejects.toThrow(
            "PTD repack failed: expected 3 entries, got 2"
        );
    });
});
