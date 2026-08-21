import type PlatinumFileReader from "../../lib/PlatinumFileReader";

export interface PTDEntry {
    id: number;
    hash?: string;
    key?: string;
    text: string;
}

export interface FileData {
    magic: string;
    shiftKey: number;
    parseMethod: "structured" | "fallback";
    entries: PTDEntry[];
    rawPrefix?: Uint8Array;
    rawSuffix?: Uint8Array;
    headerInfo?: {
        stringDataPos: number;
        hasGroupId: boolean;
        groupCount: number;
        textCount: number;
        charNameCount: number;
        textDataPos: number;
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
            magic: "PTD\0",
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
    const stringDataPos = view.getUint32(24, true);

    try {
        // 1. Read hash table (key names)
        const hashNames: Record<string, string> = {};
        let hashNamePos = hashDataPos + hashCount * 16;
        for (let i = 0; i < hashCount; i++) {
            const p = hashDataPos + i * 16;
            const hash = view.getUint32(p, true).toString(16).padStart(8, '0');
            const byteLength = view.getUint32(p + 12, true);

            if (hashNamePos + byteLength <= arrayBuffer.byteLength) {
                const name = decodeString(uint8View.slice(hashNamePos, hashNamePos + byteLength), shiftKey);
                hashNames[hash] = name;
                hashNamePos += byteLength;
            }
        }

        // 2. Read section headers at stringDataPos
        let cur = stringDataPos;
        const hasGroupId = view.getUint32(cur + 4, true) === 1;
        cur += 20;

        let groupCount = 0;
        if (hasGroupId) {
            groupCount = view.getUint32(cur + 4, true);
            cur += 12 + groupCount * 4;
        }

        const textCount = view.getUint32(cur + 4, true);
        cur += 12; // Text header

        const charNameCount = view.getUint32(cur + 4, true);
        cur += 12; // CharName header

        const textDataPos = cur;
        const textDescriptorsEnd = textDataPos + textCount * 16;

        let textPtr = textDescriptorsEnd;
        const entries: PTDEntry[] = [];
        for (let i = 0; i < textCount; i++) {
            const p = textDataPos + i * 16;
            const hash = view.getUint32(p, true).toString(16).padStart(8, '0');
            const byteLen = view.getUint32(p + 12, true);

            const text = decodeString(uint8View.slice(textPtr, textPtr + byteLen), shiftKey);
            const key = hashNames[hash] || `Key_${hash}`;

            entries.push({
                id: i,
                hash,
                key,
                text
            });
            textPtr += byteLen;
        }

        const rawPrefix = uint8View.slice(0, textDescriptorsEnd);
        const rawSuffix = uint8View.slice(textPtr);

        return {
            magic,
            shiftKey,
            parseMethod: "structured",
            entries,
            rawPrefix,
            rawSuffix,
            headerInfo: {
                stringDataPos,
                hasGroupId,
                groupCount,
                textCount,
                charNameCount,
                textDataPos
            }
        };
    } catch {
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
                const rawBytes = uint8View.slice(start, i);
                const text = decodeString(rawBytes, shiftKey);
                if (text.length >= 1 && !text.includes('\u0000')) {
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
