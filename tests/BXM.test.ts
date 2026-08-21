import { describe, it, expect } from "vitest";
import PlatinumFileReader from "../src/lib/PlatinumFileReader";
import extractBXM, { type FileData, type Node } from "../src/filetypes/BXM/extract";
import repackBXM from "../src/filetypes/BXM/repack";

describe("BXM Binary XML Parser & Repacker", () => {
    it("round-trips a synthetic BXM tree through repack -> extract", async () => {
        const sampleTree: Node = {
            name: "QuestRoot",
            value: "MainRootValue",
            attributes: {
                version: "2",
                author: "PlatinumModder"
            },
            children: [
                {
                    name: "Stage",
                    value: "Stage01",
                    attributes: { id: "100" },
                    children: []
                },
                {
                    name: "EnemyList",
                    value: "",
                    attributes: { count: "2" },
                    children: [
                        {
                            name: "Enemy",
                            value: "Boss_Gigas",
                            attributes: { hp: "5000" },
                            children: []
                        },
                        {
                            name: "Enemy",
                            value: "Drone_A",
                            attributes: { hp: "200" },
                            children: []
                        }
                    ]
                }
            ]
        };

        const fileData: FileData = {
            data: sampleTree,
            encoding: "UTF-8"
        };

        // 1. Repack tree to binary BXM
        const binaryBuffer = repackBXM(fileData);
        expect(binaryBuffer.byteLength).toBeGreaterThan(32);

        // Verify BXM Header: magic "XML\0" (19800, 76) or similar
        const reader = new PlatinumFileReader(binaryBuffer);
        const magic = await reader.readString(0, 4);
        expect(magic.startsWith("XML") || magic.startsWith("BXM")).toBe(true);

        // 2. Extract binary BXM back to structured object
        const extracted = await extractBXM(reader);
        expect(extracted.data).not.toBeNull();
        expect(extracted.data?.name).toBe("QuestRoot");
        expect(extracted.data?.value).toBe("MainRootValue");
        expect(extracted.data?.attributes.version).toBe("2");
        expect(extracted.data?.attributes.author).toBe("PlatinumModder");
        expect(extracted.data?.children.length).toBe(2);

        const stageChild = extracted.data?.children[0];
        expect(stageChild?.name).toBe("Stage");
        expect(stageChild?.value).toBe("Stage01");
        expect(stageChild?.attributes.id).toBe("100");

        const enemyListChild = extracted.data?.children[1];
        expect(enemyListChild?.name).toBe("EnemyList");
        expect(enemyListChild?.children.length).toBe(2);
        expect(enemyListChild?.children[0].name).toBe("Enemy");
        expect(enemyListChild?.children[0].value).toBe("Boss_Gigas");
        expect(enemyListChild?.children[1].name).toBe("Enemy");
        expect(enemyListChild?.children[1].value).toBe("Drone_A");
    });
});
