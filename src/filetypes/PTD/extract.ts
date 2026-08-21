import type PlatinumFileReader from "../../lib/PlatinumFileReader";

export interface PTDEntry {
    id: number;
    key?: string;
    text: string;
}

export interface PTDSection {
    sectionId: number;
    name?: string;
    entries: PTDEntry[];
}

export interface FileData {
    magic: string;
    version: number;
    sections: PTDSection[];
}

async function extract(file: PlatinumFileReader): Promise<FileData> {
    const arrayBuffer = await file.read();
    const view = new DataView(arrayBuffer);
    const decoderUtf8 = new TextDecoder("utf-8");
    const decoderUtf16 = new TextDecoder("utf-16le");

    if (arrayBuffer.byteLength < 16) {
        return {
            magic: "PTD\0",
            version: 1,
            sections: []
        };
    }

    const magic = String.fromCharCode(
        view.getUint8(0),
        view.getUint8(1),
        view.getUint8(2),
        view.getUint8(3)
    );

    const version = view.getUint32(4, true);
    const count = view.getUint32(8, true);
    const tableOffset = view.getUint32(12, true) || 16;

    const sections: PTDSection[] = [];
    const entries: PTDEntry[] = [];

    // Parse string offset table
    if (tableOffset > 0 && tableOffset < arrayBuffer.byteLength) {
        let offset = tableOffset;
        const entryCount = Math.min(count, Math.floor((arrayBuffer.byteLength - tableOffset) / 8));

        for (let i = 0; i < entryCount; i++) {
            const entryId = view.getUint32(offset, true);
            const strOffset = view.getUint32(offset + 4, true);
            offset += 8;

            if (strOffset < arrayBuffer.byteLength) {
                // Find null terminator
                let end = strOffset;
                while (end < arrayBuffer.byteLength && view.getUint8(end) !== 0) {
                    end++;
                }

                let text = "";
                if (end > strOffset) {
                    const slice = arrayBuffer.slice(strOffset, end);
                    try {
                        text = decoderUtf8.decode(slice);
                    } catch {
                        text = decoderUtf16.decode(slice);
                    }
                }

                entries.push({
                    id: entryId,
                    text
                });
            }
        }
    } else {
        // Fallback: Linear scan for null-terminated strings if offset table is non-standard
        let pos = 16;
        let strIdx = 0;
        while (pos < arrayBuffer.byteLength) {
            // skip null padding
            while (pos < arrayBuffer.byteLength && view.getUint8(pos) === 0) {
                pos++;
            }
            if (pos >= arrayBuffer.byteLength) break;

            let start = pos;
            while (pos < arrayBuffer.byteLength && view.getUint8(pos) !== 0) {
                pos++;
            }

            if (pos > start) {
                const slice = arrayBuffer.slice(start, pos);
                let text = "";
                try {
                    text = decoderUtf8.decode(slice);
                } catch {
                    text = decoderUtf16.decode(slice);
                }
                if (text.trim().length > 0) {
                    entries.push({
                        id: strIdx++,
                        text
                    });
                }
            }
            pos++;
        }
    }

    sections.push({
        sectionId: 0,
        name: "MainText",
        entries
    });

    return {
        magic,
        version,
        sections
    };
}

export default extract;
