import type PlatinumFileReader from "../../lib/PlatinumFileReader";

export interface PTDEntry {
    id: number;
    hash?: string;
    key?: string;
    text: string;
}

export interface SectionInfo {
    sectionIndex: number;
    sectionHeaderPos: number;
    valPos: number;
    textHeaderPos: number;
    charNameHeaderPos: number;
    textDescPos: number;
    textCount: number;
    charNameDescPos: number;
    charNameCount: number;
    charNameAndSuffix: Uint8Array;
}

export interface FileData {
    magic: string;
    shiftKey: number;
    parseMethod: "structured" | "fallback";
    entries: PTDEntry[];
    rawPrefix?: Uint8Array;
    rawSuffix?: Uint8Array;
    headerInfo?: {
        sectionCount: number;
        stringDataPos: number;
        sections: SectionInfo[];
    };
}

export function decodeString(bytes: Uint8Array, shiftKey = 0x26): string {
    const unshifted = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
        unshifted[i] = (bytes[i] - shiftKey + 256) % 256;
    }
    let len = unshifted.length;
    while (len >= 2 && unshifted[len - 1] === 0 && unshifted[len - 2] === 0) {
        len -= 2;
    }
    const decoder = new TextDecoder("utf-16le");
    return decoder.decode(unshifted.slice(0, len));
}

async function extract(file: PlatinumFileReader): Promise<FileData> {
    const arrayBuffer = await file.read();
    const view = new DataView(arrayBuffer);
    const uint8View = new Uint8Array(arrayBuffer);

    if (arrayBuffer.byteLength < 28) {
        return {
            magic: "",
            shiftKey: 0x26,
            parseMethod: "fallback",
            entries: []
        };
    }

    const magic = String.fromCharCode(
        view.getUint8(0),
        view.getUint8(1),
        view.getUint8(2),
        view.getUint8(3)
    );

    const shiftKey = view.getUint32(8, true) || 0x26;
    const hashCount = view.getUint32(12, true);
    const hashDataPos = view.getUint32(16, true);
    const sectionCount = view.getUint32(20, true);
    const stringDataPos = view.getUint32(24, true);

    try {
        // 1. Read hash table (key names) - key string address is relative to descriptor p
        const hashNames: Record<string, string> = {};
        for (let i = 0; i < hashCount; i++) {
            const p = hashDataPos + i * 16;
            const hash = view.getUint32(p, true).toString(16).padStart(8, '0');
            const keyRelOffset = view.getUint32(p + 4, true);
            const byteLength = view.getUint32(p + 12, true);

            const keyAddr = p + keyRelOffset;
            if (keyAddr + byteLength <= arrayBuffer.byteLength) {
                const name = decodeString(uint8View.slice(keyAddr, keyAddr + byteLength), shiftKey);
                hashNames[hash] = name;
            }
        }

        // 2. Read sections sequentially starting at stringDataPos
        const sections: SectionInfo[] = [];
        const entries: PTDEntry[] = [];
        let globalEntryId = 0;

        for (let s = 0; s < sectionCount; s++) {
            const sPos = stringDataPos + s * 20;
            const count1 = view.getUint32(sPos + 4, true);
            const off1 = view.getUint32(sPos + 8, true);
            const count2 = view.getUint32(sPos + 12, true);
            const off2 = view.getUint32(sPos + 16, true);

            const valPos = sPos + off2;
            const textHeaderPos = valPos;
            const textCount = view.getUint32(textHeaderPos + 4, true);

            const charNameHeaderPos = valPos + 12;
            const charNameCount = count2 >= 2 ? view.getUint32(charNameHeaderPos + 4, true) : 0;
            const charNameRelOffset = count2 >= 2 ? view.getUint32(charNameHeaderPos + 8, true) : 0;

            const textDescPos = valPos + 24;
            const charNameDescPos = charNameHeaderPos + charNameRelOffset;

            // End of this section is start of next section's text descriptors (or EOF for last section)
            let nextSectionCut: number;
            if (s + 1 < sectionCount) {
                const nextSPos = stringDataPos + (s + 1) * 20;
                const nextOff2 = view.getUint32(nextSPos + 16, true);
                const nextValPos = nextSPos + nextOff2;
                const nextTextCount = view.getUint32(nextValPos + 4, true);
                nextSectionCut = nextValPos + 24 + nextTextCount * 16;
            } else {
                nextSectionCut = arrayBuffer.byteLength;
            }

            for (let i = 0; i < textCount; i++) {
                const descPos = textDescPos + i * 16;
                const hash = view.getUint32(descPos, true).toString(16).padStart(8, '0');
                const relOffset = view.getUint32(descPos + 4, true);
                const charLen = view.getUint32(descPos + 8, true);
                const byteLen = view.getUint32(descPos + 12, true);

                // relOffset is relative to descPos (this descriptor's own position)
                const strAddr = descPos + relOffset;
                const strBytes = uint8View.slice(strAddr, strAddr + byteLen);
                const text = decodeString(strBytes, shiftKey);
                const key = hashNames[hash] || `Key_${hash}`;

                entries.push({
                    id: globalEntryId++,
                    hash,
                    key,
                    text
                });
            }

            const charNameAndSuffix = uint8View.slice(charNameDescPos, nextSectionCut);

            sections.push({
                sectionIndex: s,
                sectionHeaderPos: sPos,
                valPos,
                textHeaderPos,
                charNameHeaderPos,
                textDescPos,
                textCount,
                charNameDescPos,
                charNameCount,
                charNameAndSuffix
            });
        }

        const firstSectionTextDescEnd = sections[0].textDescPos + sections[0].textCount * 16;
        const rawPrefix = uint8View.slice(0, firstSectionTextDescEnd);

        return {
            magic,
            shiftKey,
            parseMethod: "structured",
            entries,
            rawPrefix,
            headerInfo: {
                sectionCount,
                stringDataPos,
                sections
            }
        };
    } catch (err) {
        console.error('[PTD structured parse failed]', err);
        // Fallback scanner starting at stringDataPos
        const entries: PTDEntry[] = [];
        let entryIdx = 0;
        const startScan = (stringDataPos > 28 && stringDataPos < uint8View.length) ? stringDataPos : 28;

        for (let i = startScan; i < uint8View.length - 2; i += 2) {
            if (uint8View[i] !== shiftKey || uint8View[i + 1] !== shiftKey) {
                let start = i;
                while (i < uint8View.length - 1 && !(uint8View[i] === shiftKey && uint8View[i + 1] === shiftKey)) {
                    i += 2;
                }
                const bytes = uint8View.slice(start, i);
                const text = decodeString(bytes, shiftKey);
                if (text && text.trim().length > 0) {
                    entries.push({
                        id: entryIdx,
                        hash: `entry_${entryIdx}`,
                        key: `String_${entryIdx}`,
                        text
                    });
                    entryIdx++;
                }
            }
        }

        return {
            magic,
            shiftKey,
            parseMethod: "fallback",
            entries
        };
    }
}

export default extract;
