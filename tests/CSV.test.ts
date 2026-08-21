import { describe, it, expect } from "vitest";
import PlatinumFileReader from "../src/lib/PlatinumFileReader";
import extractCSV from "../src/filetypes/CSV/extract";
import repackCSV from "../src/filetypes/CSV/repack";

describe("CSV Parser & Repacker", () => {
    it("round-trips CSV table data through repack -> extract", async () => {
        const originalRows = [
            ["ID", "Name", "Score", "Description"],
            ["1", "Item_Potion", "50", "Restores HP"],
            ["2", "Item_Elixir", "200", "Full restore"],
            ["3", "Weapon_Katana", "1500", "Sharp blade"]
        ];

        // 1. Repack table data
        const repackedBuffer = await repackCSV({ data: originalRows });
        expect(repackedBuffer.byteLength).toBeGreaterThan(0);

        // 2. Extract repacked buffer
        const reader = new PlatinumFileReader(repackedBuffer);
        const extracted = await extractCSV(reader);

        expect(extracted.data).toEqual(originalRows);
    });
});
