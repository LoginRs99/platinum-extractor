import { describe, it, expect } from "vitest";
import PlatinumFileReader from "../src/lib/PlatinumFileReader";
import extractPKZ from "../src/filetypes/PKZ/extract";
import repackPKZ from "../src/filetypes/PKZ/repack";
import extract_partial from "../src/filetypes/PKZ/extract_partial";

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
});
