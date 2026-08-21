import type { FileData, PTDEntry } from "./extract";

function encodePTDString(str: string, shiftKey: number = 0x26): Uint8Array {
    // UTF-16LE encoding with trailing null character
    const len = str.length;
    const bytes = new Uint8Array((len + 1) * 2);

    for (let i = 0; i < len; i++) {
        const code = str.charCodeAt(i);
        const low = code & 0xFF;
        const high = (code >> 8) & 0xFF;
        bytes[i * 2] = (low + shiftKey) % 256;
        bytes[i * 2 + 1] = (high + shiftKey) % 256;
    }

    // Trailing null terminator (0x00 0x00 shifted)
    bytes[len * 2] = (0 + shiftKey) % 256;
    bytes[len * 2 + 1] = (0 + shiftKey) % 256;

    return bytes;
}

async function repack(data: FileData | any): Promise<ArrayBuffer> {
    if (!data) return new ArrayBuffer(0);

    const shiftKey = data.shiftKey || 0x26;
    const entries: PTDEntry[] = Array.isArray(data.entries) ? data.entries : (Array.isArray(data) ? data : []);

    const headerSize = 28;
    const hashDataPos = headerSize;
    const hashCount = entries.length;
    const hashBlockSize = hashCount * 16;
    const stringDataPos = hashDataPos + hashBlockSize;

    // Encode all text strings
    const encodedStrings: Uint8Array[] = [];
    let currentStrOffset = stringDataPos;
    const stringOffsets: number[] = [];

    for (const entry of entries) {
        stringOffsets.push(currentStrOffset);
        const encoded = encodePTDString(entry.text || "", shiftKey);
        encodedStrings.push(encoded);
        currentStrOffset += encoded.byteLength;
    }

    // 16-byte alignment
    const rawTotalSize = currentStrOffset;
    const alignedSize = (rawTotalSize + 15) & ~15;

    const buffer = new ArrayBuffer(alignedSize);
    const view = new DataView(buffer);
    const uint8View = new Uint8Array(buffer);

    // 1. Magic 'PTD\0'
    view.setUint8(0, 0x50); // 'P'
    view.setUint8(1, 0x54); // 'T'
    view.setUint8(2, 0x44); // 'D'
    view.setUint8(3, 0x00); // '\0'

    // 2. Header values
    view.setUint32(4, 0x02, true);
    view.setUint32(8, shiftKey, true); // 0x26
    view.setUint32(12, hashCount, true);
    view.setUint32(16, hashDataPos, true);
    view.setUint32(20, 0x01, true);
    view.setUint32(24, stringDataPos, true);

    // 3. Write hash/index descriptors (16 bytes each)
    let ptr = hashDataPos;
    for (let i = 0; i < entries.length; i++) {
        view.setUint32(ptr, entries[i].id !== undefined ? entries[i].id : i, true);
        view.setUint32(ptr + 4, 0, true);
        view.setUint32(ptr + 8, entries[i].text.length, true); // char count
        view.setUint32(ptr + 12, encodedStrings[i].byteLength, true); // byte length
        ptr += 16;
    }

    // 4. Write string payload
    let strPtr = stringDataPos;
    for (const encoded of encodedStrings) {
        uint8View.set(encoded, strPtr);
        strPtr += encoded.byteLength;
    }

    return buffer;
}

export default repack;
