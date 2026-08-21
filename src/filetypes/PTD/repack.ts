import type { FileData, PTDEntry } from "./extract";

function encodeString(str: string, shiftKey: number = 0x26): Uint8Array {
    const len = str.length;
    const bytes = new Uint8Array((len + 1) * 2);
    for (let i = 0; i < len; i++) {
        const code = str.charCodeAt(i);
        bytes[i * 2] = ((code & 0xFF) + shiftKey) % 256;
        bytes[i * 2 + 1] = (((code >> 8) & 0xFF) + shiftKey) % 256;
    }
    bytes[len * 2] = (0 + shiftKey) % 256;
    bytes[len * 2 + 1] = (0 + shiftKey) % 256;
    return bytes;
}

async function repack(data: FileData | any): Promise<ArrayBuffer> {
    if (!data) return new ArrayBuffer(0);

    const shiftKey = data.shiftKey || 0x26;
    const entries: PTDEntry[] = Array.isArray(data.entries) ? data.entries : [];

    // If structured rawPrefix and rawSuffix are present, perform 100% structured repacking
    if (data.rawPrefix && data.headerInfo) {
        const rawPrefix = new Uint8Array(data.rawPrefix);
        const rawSuffix = data.rawSuffix ? new Uint8Array(data.rawSuffix) : new Uint8Array(0);

        const newPrefix = new Uint8Array(rawPrefix.byteLength);
        newPrefix.set(rawPrefix);
        const prefixView = new DataView(newPrefix.buffer);

        const textDataPos = data.headerInfo.textDataPos;
        const textCount = entries.length;

        // Encode modified strings
        const encodedStrings: Uint8Array[] = [];
        let currentRelOffset = textCount * 16;

        for (let i = 0; i < textCount; i++) {
            const entry = entries[i];
            const encoded = encodeString(entry.text || "", shiftKey);
            encodedStrings.push(encoded);

            const descPos = textDataPos + i * 16;
            prefixView.setUint32(descPos + 4, currentRelOffset, true);
            prefixView.setUint32(descPos + 8, (entry.text || "").length + 1, true);
            prefixView.setUint32(descPos + 12, encoded.byteLength, true);

            currentRelOffset += encoded.byteLength;
        }

        // Update CharName header offset
        const charNameHeaderOffset = textDataPos - 12;
        prefixView.setUint32(charNameHeaderOffset + 8, currentRelOffset, true);

        // Compute total aligned buffer
        const totalRawSize = newPrefix.byteLength + (currentRelOffset - textCount * 16) + rawSuffix.byteLength;
        const alignedSize = (totalRawSize + 15) & ~15;

        const buffer = new ArrayBuffer(alignedSize);
        const uint8View = new Uint8Array(buffer);
        uint8View.fill(shiftKey);

        uint8View.set(newPrefix, 0);

        let writePtr = newPrefix.byteLength;
        for (const strBytes of encodedStrings) {
            uint8View.set(strBytes, writePtr);
            writePtr += strBytes.byteLength;
        }

        uint8View.set(rawSuffix, writePtr);

        return buffer;
    }

    // Fallback: Standalone PTD construction
    const headerSize = 28;
    const hashDataPos = headerSize;
    const hashCount = entries.length;
    const hashBlockSize = hashCount * 16;
    const stringDataPos = hashDataPos + hashBlockSize;

    const encodedStrings: Uint8Array[] = [];
    let currentStrOffset = stringDataPos;
    const stringOffsets: number[] = [];

    for (const entry of entries) {
        stringOffsets.push(currentStrOffset);
        const encoded = encodeString(entry.text || "", shiftKey);
        encodedStrings.push(encoded);
        currentStrOffset += encoded.byteLength;
    }

    const rawTotalSize = currentStrOffset;
    const alignedSize = (rawTotalSize + 15) & ~15;

    const buffer = new ArrayBuffer(alignedSize);
    const view = new DataView(buffer);
    const uint8View = new Uint8Array(buffer);
    uint8View.fill(shiftKey);

    view.setUint8(0, 0x50); // 'P'
    view.setUint8(1, 0x54); // 'T'
    view.setUint8(2, 0x44); // 'D'
    view.setUint8(3, 0x00); // '\0'

    view.setUint32(4, 0x02, true);
    view.setUint32(8, shiftKey, true);
    view.setUint32(12, hashCount, true);
    view.setUint32(16, hashDataPos, true);
    view.setUint32(20, 0x01, true);
    view.setUint32(24, stringDataPos, true);

    let ptr = hashDataPos;
    for (let i = 0; i < entries.length; i++) {
        view.setUint32(ptr, entries[i].id !== undefined ? entries[i].id : i, true);
        view.setUint32(ptr + 4, 0, true);
        view.setUint32(ptr + 8, (entries[i].text || "").length + 1, true);
        view.setUint32(ptr + 12, encodedStrings[i].byteLength, true);
        ptr += 16;
    }

    let strPtr = stringDataPos;
    for (const encoded of encodedStrings) {
        uint8View.set(encoded, strPtr);
        strPtr += encoded.byteLength;
    }

    return buffer;
}

export default repack;
