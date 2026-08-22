import { ZstdInit } from '@oneidentity/zstd-js';
import { load as loadOOZ, decompressUnsafe as decompressOOZ } from 'ooz-wasm';
import PlatinumFileReader from "../../lib/PlatinumFileReader";
import type { FileData, PartialFile } from "./extract";

let zstdDecompress: any = null;

async function extract_partial(partialFile: PartialFile, fileData: FileData) : Promise<{name: string, data: ArrayBuffer}> {
    // Create a new file reader
    let platinumFileReader = new PlatinumFileReader(fileData.baseFile);

    // Read the file
    let arrayBuffer = await platinumFileReader.read(
        partialFile.offset,
        partialFile.offset + partialFile.compressedSize
    );

    switch(partialFile.compressionType) {
        case 'ZStandard':
            if (!zstdDecompress) {
                let { ZstdStream } = await ZstdInit();
                zstdDecompress = ZstdStream;
            }
            arrayBuffer = zstdDecompress.decompress(new Uint8Array(arrayBuffer)).buffer;
            break;
        case 'OodleKraken': {
            // Note: ooz-wasm is not very consistent at extraction, and you often need to search
            // for the DAT header in the wasm memory to find the correct offset.
            await loadOOZ();
            let success = false;
            const maxAttempts = 5;
            for (let attempt = 0; attempt < maxAttempts; attempt++) {
                const decomp = await decompressOOZ(new Uint8Array(arrayBuffer), partialFile.size);
                const copyBuf = new Uint8Array(decomp.byteLength);
                copyBuf.set(decomp);
                const decompBuffer = copyBuf.buffer;
                const bit32 = new Uint32Array(decompBuffer);
                const header = bit32.indexOf(5521732);
                if (
                    header !== -1 &&
                    header * 4 + partialFile.size <= decompBuffer.byteLength &&
                    !(header * 4 > decompBuffer.byteLength - partialFile.size)
                ) {
                    arrayBuffer = decompBuffer.slice(header * 4, header * 4 + partialFile.size);
                    success = true;
                    break;
                }
            }
            if (!success) {
                throw new Error(`Failed to decompress OodleKraken payload with valid DAT header after ${maxAttempts} attempts for ${partialFile.name}`);
            }
            break;
        }
        case 'None':
            break;
        default:
            console.warn(`Unknown compression type: ${partialFile.compressionType}`);
    }

    // Return name and data as an object
    return {name: partialFile.name, data: arrayBuffer};
}

export default extract_partial;