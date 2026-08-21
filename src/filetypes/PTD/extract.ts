import type PlatinumFileReader from "../../lib/PlatinumFileReader";

export interface PTDEntry {
    id: number;
    key?: string;
    text: string;
}

export interface FileData {
    magic: string;
    shiftKey: number;
    entries: PTDEntry[];
}

export function decodePTDString(bytes: Uint8Array, shiftKey: number = 0x26): string {
    const unshifted = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
        unshifted[i] = (bytes[i] - shiftKey + 256) % 256;
    }

    // Trim trailing UTF-16 null characters (0x00 0x00)
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
    const entries: PTDEntry[] = [];

    const count = view.getUint32(12, true);
    const tableOffset = view.getUint32(16, true) || 28;
    const stringDataPos = view.getUint32(24, true) || (tableOffset + count * 16);

    if (count > 0 && tableOffset < arrayBuffer.byteLength) {
        let textPtr = stringDataPos;

        for (let i = 0; i < count; i++) {
            const entryPos = tableOffset + i * 16;
            if (entryPos + 16 > arrayBuffer.byteLength) break;

            const id = view.getUint32(entryPos, true);
            const charLength = view.getUint32(entryPos + 8, true);
            const byteLength = view.getUint32(entryPos + 12, true) || ((charLength + 1) * 2);

            if (textPtr + byteLength <= arrayBuffer.byteLength) {
                const rawBytes = uint8View.slice(textPtr, textPtr + byteLength);
                const text = decodePTDString(rawBytes, shiftKey);

                entries.push({
                    id,
                    key: `Entry_${id}`,
                    text
                });
                textPtr += byteLength;
            }
        }
    }

    // Fallback: If header table didn't parse entries, scan for UTF-16 null-terminated strings with 0x26 shift
    if (entries.length === 0) {
        let pos = 28;
        let entryIdx = 0;

        while (pos + 4 < arrayBuffer.byteLength) {
            // Null terminator in shifted UTF-16LE is [shiftKey, shiftKey]
            let start = pos;
            while (pos + 1 < arrayBuffer.byteLength && !(uint8View[pos] === shiftKey && uint8View[pos + 1] === shiftKey)) {
                pos += 2;
            }

            const strByteLen = (pos + 2) - start;
            if (strByteLen >= 4) {
                const rawBytes = uint8View.slice(start, pos + 2);
                const text = decodePTDString(rawBytes, shiftKey);
                if (text.trim().length > 0 && !/^[\x00-\x1F\x7F]+$/.test(text)) {
                    entries.push({
                        id: entryIdx,
                        key: `String_${entryIdx}`,
                        text
                    });
                    entryIdx++;
                }
            }
            pos += 2; // skip null terminator
        }
    }

    return {
        magic,
        shiftKey,
        entries
    };
}

export default extract;
