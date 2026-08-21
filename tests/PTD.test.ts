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

    it("round-trips text dictionary entries through JSON repack -> binary extract", async () => {
        const sampleData = {
            magic: "PTD\0",
            version: 1,
            sections: [
                {
                    sectionId: 0,
                    name: "MainText",
                    entries: [
                        { id: 100, text: "Neuron Police Department" },
                        { id: 101, text: "Legion: Sword Style" },
                        { id: 102, text: "Welcome to the Astral Plane." },
                        { id: 103, text: "Mission Complete: Rank S+" }
                    ]
                }
            ]
        };

        // 1. Repack JSON to binary PTD
        const repackedBuffer = await repackPTD(sampleData);
        expect(repackedBuffer.byteLength).toBeGreaterThan(32);
        // Verify 16-byte alignment
        expect(repackedBuffer.byteLength % 16).toBe(0);

        // Verify magic header
        const view = new DataView(repackedBuffer);
        expect(view.getUint8(0)).toBe(0x50); // 'P'
        expect(view.getUint8(1)).toBe(0x54); // 'T'
        expect(view.getUint8(2)).toBe(0x44); // 'D'
        expect(view.getUint8(3)).toBe(0x00); // '\0'
        expect(view.getUint32(8, true)).toBe(4); // entry count

        // 2. Extract binary PTD back to JSON
        const reader = new PlatinumFileReader(repackedBuffer);
        const extracted = await extractPTD(reader);

        expect(extracted.sections.length).toBe(1);
        const extractedEntries = extracted.sections[0].entries;
        expect(extractedEntries.length).toBe(4);

        expect(extractedEntries[0].id).toBe(100);
        expect(extractedEntries[0].text).toBe("Neuron Police Department");

        expect(extractedEntries[1].id).toBe(101);
        expect(extractedEntries[1].text).toBe("Legion: Sword Style");

        expect(extractedEntries[2].id).toBe(102);
        expect(extractedEntries[2].text).toBe("Welcome to the Astral Plane.");

        expect(extractedEntries[3].id).toBe(103);
        expect(extractedEntries[3].text).toBe("Mission Complete: Rank S+");
    });
});
