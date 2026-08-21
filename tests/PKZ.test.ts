import { describe, it, expect } from "vitest";
import PlatinumFileReader from "../src/lib/PlatinumFileReader";
import extractPKZ from "../src/filetypes/PKZ/extract";
import repackPKZ from "../src/filetypes/PKZ/repack";

describe("PKZ Archive Parser & Repacker", () => {
    it("round-trips files through repackPKZ and extractPKZ", async () => {
        const dummyData1 = new TextEncoder().encode("Hello Astral Chain!").buffer;
        const dummyData2 = new TextEncoder().encode("Platinum Extractor 2.0").buffer;

        const inputFiles = [
            { name: "dialogue.bin", data: dummyData1 },
            { name: "config.bxm", data: dummyData2 }
        ];

        const repackedBuffer = await repackPKZ(inputFiles);
        expect(repackedBuffer.byteLength).toBeGreaterThan(64);

        const reader = new PlatinumFileReader(repackedBuffer);
        const extracted = await extractPKZ(reader);

        expect(extracted.files.length).toBe(2);
        expect(extracted.files[0].name).toBe("dialogue.bin");
        expect(extracted.files[0].size).toBe(dummyData1.byteLength);
        expect(extracted.files[0].compressionType).toBe("None");

        expect(extracted.files[1].name).toBe("config.bxm");
        expect(extracted.files[1].size).toBe(dummyData2.byteLength);
        expect(extracted.files[1].compressionType).toBe("None");
    });
});
