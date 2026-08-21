import type PlatinumFileReader from "../../lib/PlatinumFileReader";

export interface PTDEntry {
    id: number;
    key?: string;
    text: string;
    offset?: string;
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
    const stringDataPos = view.getUint32(24, true);
    const startScan = (stringDataPos > 28 && stringDataPos < uint8View.length) ? stringDataPos : 28;
    const entries: PTDEntry[] = [];

    // Scan all null-terminated UTF-16LE strings shifted by shiftKey
    let entryIdx = 0;
    for (let i = startScan; i < uint8View.length - 2; i += 2) {
        // In shifted UTF-16LE, a null character (0x00 0x00) is (shiftKey, shiftKey)
        if (uint8View[i] !== shiftKey || uint8View[i + 1] !== shiftKey) {
            let start = i;
            while (i < uint8View.length - 1 && !(uint8View[i] === shiftKey && uint8View[i + 1] === shiftKey)) {
                i += 2;
            }
            const rawBytes = uint8View.slice(start, i);
            const text = decodePTDString(rawBytes, shiftKey);

            // Filter out binary table garbage and keep real strings
            if (text.length >= 1 && !text.includes('\u0000') && !/^[\x00-\x1F\x7F\uD800-\uDFFF\uFDD0-\uFDEF]+$/.test(text)) {
                entries.push({
                    id: entryIdx,
                    key: `String_${entryIdx}`,
                    offset: `0x${start.toString(16)}`,
                    text
                });
                entryIdx++;
            }
        }
    }

    return {
        magic,
        shiftKey,
        entries
    };
}

export default extract;
