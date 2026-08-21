export interface PKZInputFile {
    name: string;
    data: ArrayBuffer;
    compressionType?: "None" | "ZStandard";
}

async function repack(files: PKZInputFile[]): Promise<ArrayBuffer> {
    if (!files || files.length === 0) return new ArrayBuffer(0);

    const encoder = new TextEncoder();

    // 1. Build string table
    // Store compression string "None" first
    const stringTableParts: Uint8Array[] = [];
    const nameOffsets: number[] = [];
    let currentStrOffset = 0;

    const noneBytes = encoder.encode("None\0");
    stringTableParts.push(noneBytes);
    const noneOffset = 0;
    currentStrOffset += noneBytes.byteLength;

    for (const f of files) {
        const nameBytes = encoder.encode(`${f.name}\0`);
        nameOffsets.push(currentStrOffset);
        stringTableParts.push(nameBytes);
        currentStrOffset += nameBytes.byteLength;
    }

    const rawStringTableSize = currentStrOffset;
    // Align string table to 16 bytes
    const alignedStringTableSize = (rawStringTableSize + 15) & ~15;

    const stringTableBuffer = new Uint8Array(alignedStringTableSize);
    let strPtr = 0;
    for (const part of stringTableParts) {
        stringTableBuffer.set(part, strPtr);
        strPtr += part.byteLength;
    }

    const headerSize = 32;
    const fileDescriptorsOffset = headerSize;
    const descriptorSize = 32;
    const descriptorsTotalSize = files.length * descriptorSize;
    const stringTableOffset = fileDescriptorsOffset + descriptorsTotalSize;

    // Start data payload aligned to 16 bytes
    let payloadStartOffset = stringTableOffset + alignedStringTableSize;
    payloadStartOffset = (payloadStartOffset + 15) & ~15;

    // Compute payload offsets
    const filePayloadOffsets: number[] = [];
    let curPayloadOffset = payloadStartOffset;
    let totalUncompressedSize = 0n;

    for (const f of files) {
        // 16-byte alignment per file
        curPayloadOffset = (curPayloadOffset + 15) & ~15;
        filePayloadOffsets.push(curPayloadOffset);
        curPayloadOffset += f.data.byteLength;
        totalUncompressedSize += BigInt(f.data.byteLength);
    }

    const totalFileSize = (curPayloadOffset + 15) & ~15;
    const finalBuffer = new ArrayBuffer(totalFileSize);
    const view = new DataView(finalBuffer);
    const uint8View = new Uint8Array(finalBuffer);

    // 1. Write Header (32 bytes)
    // Magic 'pkzl' (0x6c7a6b70 in LE)
    view.setUint8(0, 0x70); // 'p'
    view.setUint8(1, 0x6b); // 'k'
    view.setUint8(2, 0x7a); // 'z'
    view.setUint8(3, 0x6c); // 'l'

    view.setUint32(4, 1, true); // version 1
    view.setBigUint64(8, totalUncompressedSize, true);
    view.setUint32(16, files.length, true);
    view.setUint32(20, fileDescriptorsOffset, true);
    view.setUint32(24, alignedStringTableSize, true);
    view.setUint32(28, 0, true); // reserved

    // 2. Write File Descriptors (32 bytes each)
    for (let i = 0; i < files.length; i++) {
        const descPtr = fileDescriptorsOffset + i * descriptorSize;
        view.setUint32(descPtr, nameOffsets[i], true); // nameOffset
        view.setUint32(descPtr + 4, noneOffset, true); // compressionOffset ("None")
        view.setBigUint64(descPtr + 8, BigInt(files[i].data.byteLength), true); // uncompressed size
        view.setBigUint64(descPtr + 16, BigInt(filePayloadOffsets[i]), true); // payload offset
        view.setBigUint64(descPtr + 24, BigInt(files[i].data.byteLength), true); // compressed size
    }

    // 3. Write String Table
    uint8View.set(stringTableBuffer, stringTableOffset);

    // 4. Write File Payloads
    for (let i = 0; i < files.length; i++) {
        uint8View.set(new Uint8Array(files[i].data), filePayloadOffsets[i]);
    }

    return finalBuffer;
}

export default repack;
