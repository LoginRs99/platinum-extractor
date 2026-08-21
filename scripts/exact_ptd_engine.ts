import * as fs from "fs";
import * as path from "path";

export interface PTDEntry {
    id: number;
    hash: string;
    key?: string;
    text: string;
}

export interface PTDStructuredData {
    magic: string;
    shiftKey: number;
    entries: PTDEntry[];
    rawPrefix: Buffer;
    rawSuffix: Buffer;
    headerInfo: {
        stringDataPos: number;
        hasGroupId: boolean;
        groupCount: number;
        textCount: number;
        charNameCount: number;
        textDataPos: number;
        origTextPayloadLength: number;
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

export function encodeString(str: string, shiftKey = 0x26): Uint8Array {
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

export function parseExactPTD(buf: Buffer): PTDStructuredData {
    const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

    const shiftKey = view.getUint32(8, true) || 0x26;
    const hashCount = view.getUint32(12, true);
    const hashDataPos = view.getUint32(16, true);
    const stringDataPos = view.getUint32(24, true);

    // 1. Read hash table (key names)
    const hashNames: Record<string, string> = {};
    let hashNamePos = hashDataPos + hashCount * 16;
    for (let i = 0; i < hashCount; i++) {
        const p = hashDataPos + i * 16;
        const hash = view.getUint32(p, true).toString(16).padStart(8, '0');
        const charLength = view.getUint32(p + 8, true);
        const byteLength = view.getUint32(p + 12, true);

        if (hashNamePos + byteLength <= buf.length) {
            const name = decodeString(buf.slice(hashNamePos, hashNamePos + byteLength), shiftKey);
            hashNames[hash] = name;
            hashNamePos += byteLength;
        }
    }

    // 2. Read section headers at stringDataPos
    let cur = stringDataPos;
    const fileInfoHash = view.getUint32(cur, true);
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
    const charNameHeaderPos = cur;
    cur += 12; // CharName header

    const textDataPos = cur;
    const textDescriptorsEnd = textDataPos + textCount * 16;

    let textPtr = textDescriptorsEnd;
    const entries: PTDEntry[] = [];
    for (let i = 0; i < textCount; i++) {
        const p = textDataPos + i * 16;
        const hash = view.getUint32(p, true).toString(16).padStart(8, '0');
        const byteLen = view.getUint32(p + 12, true);

        const text = decodeString(buf.slice(textPtr, textPtr + byteLen), shiftKey);
        const key = hashNames[hash] || `Key_${hash}`;

        entries.push({
            id: i,
            hash,
            key,
            text
        });
        textPtr += byteLen;
    }

    const origTextPayloadLength = textPtr - textDescriptorsEnd;
    const rawPrefix = Buffer.from(buf.slice(0, textDescriptorsEnd));
    const rawSuffix = Buffer.from(buf.slice(textPtr)); // CharName descriptor table & trailing bytes

    return {
        magic: "PTD\0",
        shiftKey,
        entries,
        rawPrefix,
        rawSuffix,
        headerInfo: {
            stringDataPos,
            hasGroupId,
            groupCount,
            textCount,
            charNameCount,
            textDataPos,
            origTextPayloadLength
        }
    };
}

export function repackExactStructuredPTD(ptd: PTDStructuredData): Buffer {
    const shiftKey = ptd.shiftKey || 0x26;
    const textCount = ptd.entries.length;

    const newPrefix = Buffer.from(ptd.rawPrefix);
    const prefixView = new DataView(newPrefix.buffer, newPrefix.byteOffset, newPrefix.byteLength);

    const textDataPos = ptd.headerInfo.textDataPos;
    const textDescriptorsEnd = textDataPos + textCount * 16;

    // 1. Encode all modified strings
    const encodedStrings: Uint8Array[] = [];
    let currentRelOffset = textCount * 16; // offset relative to textDataPos

    for (let i = 0; i < textCount; i++) {
        const entry = ptd.entries[i];
        const encoded = encodeString(entry.text || "", shiftKey);
        encodedStrings.push(encoded);

        // Update Text Descriptor
        const descPos = textDataPos + i * 16;
        prefixView.setUint32(descPos + 4, currentRelOffset, true); // relative string offset
        prefixView.setUint32(descPos + 8, (entry.text || "").length + 1, true); // char count with null
        prefixView.setUint32(descPos + 12, encoded.byteLength, true); // byte length

        currentRelOffset += encoded.byteLength;
    }

    // 2. Update CharName header's block offset to point after new string block!
    const charNameHeaderOffset = textDataPos - 12;
    prefixView.setUint32(charNameHeaderOffset + 8, currentRelOffset, true);

    // 3. Assemble new buffer: [newPrefix] + [newStrings] + [rawSuffix (CharName table)] + [0x26 padding]
    const totalRawSize = newPrefix.length + (currentRelOffset - textCount * 16) + ptd.rawSuffix.length;
    const alignedSize = (totalRawSize + 15) & ~15;

    const outBuf = Buffer.alloc(alignedSize, shiftKey);
    newPrefix.copy(outBuf, 0);

    let writePtr = newPrefix.length;
    for (const strBytes of encodedStrings) {
        Buffer.from(strBytes).copy(outBuf, writePtr);
        writePtr += strBytes.byteLength;
    }

    ptd.rawSuffix.copy(outBuf, writePtr);

    return outBuf;
}
