import { describe, it, expect } from "vitest";
import PlatinumFileReader from "../src/lib/PlatinumFileReader";
import extractPKZ from "../src/filetypes/PKZ/extract";
import repackPKZ from "../src/filetypes/PKZ/repack";
import extract_partial from "../src/filetypes/PKZ/extract_partial";
import repackPTD from "../src/filetypes/PTD/repack";
import extractPTD from "../src/filetypes/PTD/extract";

describe("PKZ Archive Parser & Repacker", () => {
    it("round-trips files through repackPKZ and extractPKZ with ZStandard compression", async () => {
        const dummyData1 = new TextEncoder().encode("Hello Astral Chain! This is a long sample text to ensure valid ZStandard compression block size.").buffer;
        const dummyData2 = new TextEncoder().encode("Platinum Extractor 2.0 - High Performance Archive Extractor for Nintendo Switch games.").buffer;

        const inputFiles = [
            { name: "dialogue.bin", data: dummyData1, compressionType: "ZStandard" as const },
            { name: "config.bxm", data: dummyData2, compressionType: "ZStandard" as const }
        ];

        const repackedBuffer = await repackPKZ(inputFiles, true);
        expect(repackedBuffer.byteLength).toBeGreaterThan(64);

        const reader = new PlatinumFileReader(repackedBuffer);
        const extracted = await extractPKZ(reader);

        expect(extracted.files.length).toBe(2);
        expect(extracted.files[0].name).toBe("dialogue.bin");
        expect(extracted.files[0].size).toBe(dummyData1.byteLength);
        expect(extracted.files[0].compressionType).toBe("ZStandard");

        const partial1 = await extract_partial(extracted.files[0], extracted);
        expect(partial1.data.byteLength).toBe(dummyData1.byteLength);

        expect(extracted.files[1].name).toBe("config.bxm");
        expect(extracted.files[1].size).toBe(dummyData2.byteLength);
        expect(extracted.files[1].compressionType).toBe("ZStandard");

        const partial2 = await extract_partial(extracted.files[1], extracted);
        expect(partial2.data.byteLength).toBe(dummyData2.byteLength);
    });

    it("round-trips edited PTD child files within a repacked PKZ archive", async () => {
        // 1. Create a child PTD binary
        const originalPtdData = {
            magic: "PTD\0",
            shiftKey: 0x26,
            parseMethod: "structured" as const,
            entries: [
                { id: 0, key: "NPC_Greeting", text: "Szervusz! Üdvözöllek a bázison." },
                { id: 1, key: "Quest_Title", text: "Különleges Küldetés: Őrjárat" }
            ]
        };
        const ptdBuffer = await repackPTD(originalPtdData);

        // 2. Repack into PKZ
        const pkzBuffer = await repackPKZ([
            { name: "Text_HUn.bin", data: ptdBuffer, compressionType: "ZStandard" }
        ], true);

        // 3. Extract PKZ archive
        const pkzReader = new PlatinumFileReader(pkzBuffer);
        const extractedPkz = await extractPKZ(pkzReader);

        expect(extractedPkz.files.length).toBe(1);
        expect(extractedPkz.files[0].name).toBe("Text_HUn.bin");

        // 4. Extract child partial file and parse as PTD
        const childPartial = await extract_partial(extractedPkz.files[0], extractedPkz);
        const childPtd = await extractPTD(new PlatinumFileReader(childPartial.data));

        expect(childPtd.entries.length).toBe(2);
        expect(childPtd.entries[0].text).toBe("Szervusz! Üdvözöllek a bázison.");
        expect(childPtd.entries[1].text).toBe("Különleges Küldetés: Őrjárat");
    });
});
