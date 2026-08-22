import type { FileData, PTDEntry, SectionInfo } from "./extract";

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

    // If structured rawPrefix and multi-section headerInfo are present, perform structured repacking
    if (data.rawPrefix && data.headerInfo && Array.isArray(data.headerInfo.sections)) {
        const sections: SectionInfo[] = data.headerInfo.sections;
        const sectionCount: number = data.headerInfo.sectionCount || sections.length;

        const totalExpected = sections.reduce((sum: number, s: SectionInfo) => sum + s.textCount, 0);
        if (entries.length !== totalExpected) {
            throw new Error(`PTD repack failed: expected ${totalExpected} entries, got ${entries.length}. Entries can be edited in place but not added/removed for structured repacking.`);
        }

        const curPrefix = new Uint8Array(data.rawPrefix);
        let entryCursor = 0;

        const outputBlocks: Uint8Array[] = [];
        outputBlocks.push(curPrefix);

        for (let s = 0; s < sectionCount; s++) {
            const sec = sections[s];
            const secEntries = entries.slice(entryCursor, entryCursor + sec.textCount);
            entryCursor += sec.textCount;

            const encodedStrings: Uint8Array[] = [];
            let relStringOffset = sec.textCount * 16; // offset from textDescPos

            const targetDescBlock = s === 0 ? outputBlocks[0] : outputBlocks[outputBlocks.length - 1];
            const targetDescOffset = s === 0 ? sec.textDescPos : (targetDescBlock.byteLength - sec.textCount * 16);
            const descView = new DataView(targetDescBlock.buffer, targetDescBlock.byteOffset, targetDescBlock.byteLength);

            for (let i = 0; i < sec.textCount; i++) {
                const entry = secEntries[i];
                const encoded = encodeString(entry.text || "", shiftKey);
                encodedStrings.push(encoded);

                const p = targetDescOffset + i * 16;
                descView.setUint32(p + 4, relStringOffset, true);
                descView.setUint32(p + 8, (entry.text || "").length + 1, true);
                descView.setUint32(p + 12, encoded.byteLength, true);

                relStringOffset += encoded.byteLength;
            }

            // Concatenate text string payload
            const textPayload = new Uint8Array(relStringOffset - sec.textCount * 16);
            let strPtr = 0;
            for (const enc of encodedStrings) {
                textPayload.set(enc, strPtr);
                strPtr += enc.byteLength;
            }
            outputBlocks.push(textPayload);

            // Push charNameAndSuffix block
            const charNameSuffixCopy = new Uint8Array(sec.charNameAndSuffix.byteLength);
            charNameSuffixCopy.set(sec.charNameAndSuffix);
            outputBlocks.push(charNameSuffixCopy);
        }

        // Calculate total length and allocate final 16-byte aligned buffer
        const totalLen = outputBlocks.reduce((sum, b) => sum + b.byteLength, 0);
        const alignedLen = (totalLen + 15) & ~15;
        const finalBuffer = new ArrayBuffer(alignedLen);
        const finalUint8 = new Uint8Array(finalBuffer);
        finalUint8.fill(shiftKey);

        let offset = 0;
        for (const b of outputBlocks) {
            finalUint8.set(b, offset);
            offset += b.byteLength;
        }

        const finalView = new DataView(finalBuffer);

        // Patch CharName offsets and Section Header offsets
        let runningDelta = 0;
        for (let s = 0; s < sectionCount; s++) {
            const sec = sections[s];
            const secEntries = entries.slice(
                sections.slice(0, s).reduce((sum, x) => sum + x.textCount, 0),
                sections.slice(0, s + 1).reduce((sum, x) => sum + x.textCount, 0)
            );

            let newTextLen = 0;
            for (const e of secEntries) {
                newTextLen += encodeString(e.text || "", shiftKey).byteLength;
            }

            // Patch CharName header offset in this section
            const patchedCharNameHeaderPos = (s === 0 ? sec.charNameHeaderPos : (sec.charNameHeaderPos + runningDelta));
            finalView.setUint32(patchedCharNameHeaderPos + 8, sec.textCount * 16 + newTextLen, true);

            // Compute delta for this section
            const origTextLen = sec.charNameDescPos - (sec.textDescPos + sec.textCount * 16);
            const sectionDelta = newTextLen - origTextLen;
            runningDelta += sectionDelta;

            // Patch next section's offsets in the 20-byte section header table
            if (s + 1 < sectionCount) {
                const nextSec = sections[s + 1];
                const origOff1 = finalView.getUint32(nextSec.sectionHeaderPos + 8, true);
                const origOff2 = finalView.getUint32(nextSec.sectionHeaderPos + 16, true);
                finalView.setUint32(nextSec.sectionHeaderPos + 8, origOff1 + runningDelta, true);
                finalView.setUint32(nextSec.sectionHeaderPos + 16, origOff2 + runningDelta, true);
            }
        }

        return finalBuffer;
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
