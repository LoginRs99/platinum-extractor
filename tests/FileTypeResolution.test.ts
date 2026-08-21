import { describe, it, expect } from "vitest";
import { resolveFile } from "../src/lib/FileHandler.worker";

describe("File type resolution (FileHandler.worker.resolveFile)", () => {
    it("still resolves every currently-registered filetype by magic", () => {
        expect(resolveFile("DAT\x00", "quest.dat")).toBe("DAT");
        expect(resolveFile("BXM\x00", "config.bxm")).toBe("BXM");
        expect(resolveFile("XML\x00", "config.bxm")).toBe("BXM");
        expect(resolveFile("COL2", "stage.col")).toBe("COL");
        expect(resolveFile("WTB\x00", "textures.wta")).toBe("WTA");
        expect(resolveFile("pkzl", "data.pkz")).toBe("PKZ");
    });

    it("still resolves by extension when magic is empty/unregistered (CSV, MCD)", () => {
        expect(resolveFile("xxxx", "balance.csv")).toBe("CSV");
        expect(resolveFile("xxxx", "ui.mcd")).toBe("MCD");
    });

    // Regression test for: "Failed to extract GameWord_EUde.bin from Text.pkz -
    // No filetype found for GameWord_EUde.bin with magic PTD"
    //
    // PTD is a real (but only partially reverse-engineered - see Kerilk/bayonetta_tools
    // issue #4 and the ZenHAX "Astral Chain package" thread) Astral Chain text-archive
    // format. This app does not implement a PTD parser, so resolution is EXPECTED to
    // fail here - the fix is that FileHandler.worker.ts's caller no longer treats an
    // unresolved file as a hard error, and instead falls back to exposing the raw bytes
    // for download (see the `case 'extract':` fallback branch and
    // FileHandler.ts#extractPartialFile).
    it("returns undefined (not a crash) for an unrecognized magic + unrecognized extension", () => {
        expect(resolveFile("PTD\x00", "GameWord_EUde.bin")).toBeUndefined();
    });
});
