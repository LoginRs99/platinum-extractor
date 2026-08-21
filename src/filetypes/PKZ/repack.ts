import { ZstdInit } from "@oneidentity/zstd-js";

export interface PKZInputFile {
    name: string;
    data: ArrayBuffer;
    compressionType?: "None" | "ZStandard";
}

async function repack(files: PKZInputFile[], useZstd: boolean = true): Promise<ArrayBuffer> {
    if (!files || files.length === 0) return new ArrayBuffer(0);

    const encoder = new TextEncoder();
    let zstdStream: any = null;
    if (useZstd) {
        const { ZstdStream } = await ZstdInit();
        zstdStream = ZstdStream;
    }

    // 1. Build string table
    const stringTableParts: Uint8Array[] = [];
    const nameOffsets: number[] = [];
    let currentStrOffset = 0;

    const noneBytes = encoder.encode("None\0");
    const noneOffset = 0;
    stringTableParts.push(noneBytes);
    currentStrOffset += noneBytes.byteLength;

    const zstdBytes = encoder.encode("ZStandard\0");
    const zstdOffset = currentStrOffset;
    stringTableParts.push(zstdBytes);
    currentStrOffset += zstdBytes.byteLength;

    for (const f of files) {
        const nameBytes = encoder.encode(`${f.name}\0`);
        nameOffsets.push(currentStrOffset);
        stringTableParts.push(nameBytes);
        currentStrOffset += nameBytes.byteLength;
    }

    const rawStringTableSize = currentStrOffset;
    const alignedStringTableSize = (rawStringTableSize + 15) & ~15;

    const stringTableBuffer = new Uint8Array(alignedStringTableSize);
    let strPtr = 0;
    for (const part of stringTableParts) {
        stringTableBuffer.set(part, strPtr);
        strPtr += part.byteLength;
    }

    // 2. Compress files if ZStandard is requested
    const processedPayloads: { data: Uint8Array; uncompressedSize: number; compType: "None" | "ZStandard" }[] = [];
    let totalUncompressedSize = 0n;

    for (const f of files) {
        const uncompressedBytes = new Uint8Array(f.data);
        totalUncompressedSize += BigInt(uncompressedBytes.byteLength);

        if (useZstd && zstdStream && f.compressionType !== "None") {
            try {
                const compressed = zstdStream.compress(uncompressedBytes);
                processedPayloads.push({
                    data: compressed,
                    uncompressedSize: uncompressedBytes.byteLength,
                    compType: "ZStandard"
                });
            } catch {
                processedPayloads.push({
                    data: uncompressedBytes,
                    uncompressedSize: uncompressedBytes.byteLength,
                    compType: "None"
                });
            }
        } else {
            processedPayloads.push({
                data: uncompressedBytes,
                uncompressedSize: uncompressedBytes.byteLength,
                compType: "None"
            });
        }
    }

    const headerSize = 32;
    const fileDescriptorsOffset = headerSize;
    const descriptorSize = 32;
    const descriptorsTotalSize = files.length * descriptorSize;
    const stringTableOffset = fileDescriptorsOffset + descriptorsTotalSize;

    // Start data payload aligned to 64 bytes
    let payloadStartOffset = stringTableOffset + alignedStringTableSize;
    payloadStartOffset = (payloadStartOffset + 63) & ~63;

    const filePayloadOffsets: number[] = [];
    let curPayloadOffset = payloadStartOffset;

    for (const payload of processedPayloads) {
        curPayloadOffset = (curPayloadOffset + 63) & ~63;
        filePayloadOffsets.push(curPayloadOffset);
        curPayloadOffset += payload.data.byteLength;
    }

    const totalFileSize = (curPayloadOffset + 63) & ~63;
    const finalBuffer = new ArrayBuffer(totalFileSize);
    const view = new DataView(finalBuffer);
    const uint8View = new Uint8Array(finalBuffer);

    // 1. Write Header (32 bytes)
    view.setUint8(0, 0x70); // 'p'
    view.setUint8(1, 0x6b); // 'k'
    view.setUint8(2, 0x7a); // 'z'
    view.setUint8(3, 0x6c); // 'l'

    view.setUint32(4, 65536, true); // Version: 65536 (0x00010000)
    view.setBigUint64(8, totalUncompressedSize, true);
    view.setUint32(16, files.length, true);
    view.setUint32(20, fileDescriptorsOffset, true);
    view.setUint32(24, alignedStringTableSize, true);
    view.setUint32(28, 0, true); // reserved

    // 2. Write File Descriptors (32 bytes each)
    for (let i = 0; i < files.length; i++) {
        const descPtr = fileDescriptorsOffset + i * descriptorSize;
        const payload = processedPayloads[i];
        const isZstd = payload.compType === "ZStandard";

        view.setUint32(descPtr, nameOffsets[i], true); // nameOffset
        view.setUint32(descPtr + 4, isZstd ? zstdOffset : noneOffset, true); // compressionOffset
        view.setBigUint64(descPtr + 8, BigInt(payload.uncompressedSize), true); // uncompressed size
        view.setBigUint64(descPtr + 16, BigInt(filePayloadOffsets[i]), true); // payload offset
        view.setBigUint64(descPtr + 24, BigInt(payload.data.byteLength), true); // compressed size
    }

    // 3. Write String Table
    uint8View.set(stringTableBuffer, stringTableOffset);

    // 4. Write File Payloads
    for (let i = 0; i < processedPayloads.length; i++) {
        uint8View.set(processedPayloads[i].data, filePayloadOffsets[i]);
    }

    return finalBuffer;
}

export default repack;
