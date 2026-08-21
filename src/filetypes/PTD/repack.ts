import type { FileData, PTDEntry } from "./extract";

async function repack(data: FileData | any): Promise<ArrayBuffer> {
    if (!data) return new ArrayBuffer(0);

    const encoder = new TextEncoder();
    const entries: PTDEntry[] = [];

    if (Array.isArray(data.sections)) {
        for (const sec of data.sections) {
            if (Array.isArray(sec.entries)) {
                entries.push(...sec.entries);
            }
        }
    } else if (Array.isArray(data.entries)) {
        entries.push(...data.entries);
    } else if (Array.isArray(data)) {
        entries.push(...data);
    }

    const headerSize = 16;
    const tableEntrySize = 8; // uint32 id, uint32 offset
    const tableSize = entries.length * tableEntrySize;
    const stringBlockStart = headerSize + tableSize;

    // Encode all strings
    const encodedStrings: Uint8Array[] = [];
    let currentStringOffset = stringBlockStart;
    const stringOffsets: number[] = [];

    for (const entry of entries) {
        stringOffsets.push(currentStringOffset);
        const encoded = encoder.encode(entry.text || "");
        // null-terminated string
        const withNull = new Uint8Array(encoded.byteLength + 1);
        withNull.set(encoded, 0);
        withNull[encoded.byteLength] = 0; // null byte
        encodedStrings.push(withNull);
        currentStringOffset += withNull.byteLength;
    }

    // 16-byte alignment
    const rawTotalSize = currentStringOffset;
    const alignedSize = (rawTotalSize + 15) & ~15;

    const buffer = new ArrayBuffer(alignedSize);
    const view = new DataView(buffer);
    const uint8View = new Uint8Array(buffer);

    // 1. Magic 'PTD\0'
    view.setUint8(0, 0x50); // 'P'
    view.setUint8(1, 0x54); // 'T'
    view.setUint8(2, 0x44); // 'D'
    view.setUint8(3, 0x00); // '\0'

    // 2. Version
    view.setUint32(4, data.version || 1, true);

    // 3. Entry count
    view.setUint32(8, entries.length, true);

    // 4. Table Offset (16)
    view.setUint32(12, headerSize, true);

    // 5. Write table entries
    let tablePtr = headerSize;
    for (let i = 0; i < entries.length; i++) {
        view.setUint32(tablePtr, entries[i].id !== undefined ? entries[i].id : i, true);
        view.setUint32(tablePtr + 4, stringOffsets[i], true);
        tablePtr += tableEntrySize;
    }

    // 6. Write string payload
    let strPtr = stringBlockStart;
    for (const encoded of encodedStrings) {
        uint8View.set(encoded, strPtr);
        strPtr += encoded.byteLength;
    }

    return buffer;
}

export default repack;
