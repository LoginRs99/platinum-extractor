import PlatinumFileReader from "./PlatinumFileReader";

export interface FileTypeModule {
    extract?: (file: PlatinumFileReader) => Promise<any>;
    extract_partial?: (partialFile: any, baseFile: any) => Promise<any>;
    repack?: (data: any) => Promise<ArrayBuffer> | ArrayBuffer;
    fileInfo?: {
        ext: string | string[];
        name: string;
        magic: string | string[];
        description: string;
        icon: string;
        credits: string;
    };
    FileData?: any;
}

function loadFileTypes(): Record<string, FileTypeModule> {
    const fileTypes: Record<string, FileTypeModule> = {};
  
    const context = import.meta.glob<Record<string, any>>('../filetypes/*/*.ts', { eager: true });
    for (const [path, module] of Object.entries(context)) {
        const normalized = path.replace(/\\/g, '/');
        const match = normalized.match(/(?:^|\/)filetypes\/([^/]+)\/([^/]+)\.ts$/);
        if (!match) continue;
        const [, folderName, fileName] = match;
        if (folderName === 'Base') continue;
        if (!fileTypes[folderName]) {
            fileTypes[folderName] = {};
        }
        switch (fileName) {
            case 'extract':
                fileTypes[folderName].extract = module.default;
                fileTypes[folderName].FileData = module.FileData;
                break;
            case 'extract_partial':
                fileTypes[folderName].extract_partial = module.default;
                break;
            case 'repack':
                fileTypes[folderName].repack = module.default;
                break;
            case 'fileInfo':
                fileTypes[folderName].fileInfo = module.default;
                break;
            default:
                break;
        }
    }
    return fileTypes;
}

const filetypes = loadFileTypes();

// Exported (only) so it can be unit-tested directly - it is otherwise only ever
// called from parseMessage() inside this worker module.
export function resolveFile(magic: string, name: string): string | undefined {
    let magicMatch = Object.keys(filetypes).find((filetype) => {
        const info = filetypes[filetype].fileInfo;
        if (!info || !info.magic) return false;
        if (Array.isArray(info.magic)) {
            return info.magic.includes(magic);
        }
        return info.magic === magic;
    });
    if (magicMatch) return magicMatch;

    const ext = name.split(".").pop()?.toUpperCase() || "";
    let filetypeMatch = Object.keys(filetypes).find((filetype) => {
        const info = filetypes[filetype].fileInfo;
        if (filetype.toUpperCase() === ext) return true;
        if (info && info.ext) {
            if (Array.isArray(info.ext)) {
                return info.ext.map(e => e.toUpperCase()).includes(ext);
            }
            return info.ext.toUpperCase() === ext;
        }
        return false;
    });
    if (filetypeMatch) return filetypeMatch;
}

function replyBase(id: string, data: any) {
    self.postMessage({ id, data });
}

async function parseMessage(type: string, data: any, reply: (data: any) => void) {
    switch (type) {
        case 'extract': {
            let name = data.target?.name || data.name || "";
            
            if (!data.target || data.target.byteLength === 0) {
                reply({ ok: false, error: `File ${name} is empty`, data: { target: data.target, name: data.name } });
                return;
            }

            let fileReader = new PlatinumFileReader(data.target);
            let magic = await fileReader.readString(0, 4);
            let filetype = resolveFile(magic, name);

            if (!filetype || !filetypes[filetype] || !filetypes[filetype].extract) {
                // No registered parser recognizes this file (unknown magic + unknown extension).
                // Don't dead-end the extraction: hand back the raw, undecoded bytes so the
                // caller can still inspect/download them. This is NOT an error condition -
                // `ok: true` with `data.target` set is how PlatinumFile detects "unknown" files
                // (see FileHandler.ts, `this.unknown = data?.name && data?.target`).
                console.warn(`No filetype found for ${name} with magic ${magic} - returning raw bytes`);
                reply({
                    ok: true,
                    filetype: undefined,
                    icon: "file",
                    isRepackable: false,
                    hasPartialFiles: false,
                    data: { name, target: data.target }
                });
                return;
            }

            try {
                let extractedData = await filetypes[filetype].extract!(fileReader);

                // Has files, but they are not compressed (DAT/DTT)
                if (!filetypes[filetype].extract_partial && extractedData && extractedData.files) {
                    for (let i = 0; i < extractedData.files.length; i++) {
                        extractedData.files[i] = await new Promise((resolve) => {
                            parseMessage(
                                'extract',
                                { target: extractedData.files[i].arrayBuffer, name: extractedData.files[i].name },
                                (res) => resolve({ name: extractedData.files[i].name, data: res.data, filetype: res.filetype })
                            );
                        });
                    }
                }

                reply({
                    ok: true,
                    filetype,
                    icon: filetypes[filetype].fileInfo?.icon || "file",
                    isRepackable: !!filetypes[filetype].repack,
                    hasPartialFiles: !!filetypes[filetype].extract_partial,
                    data: extractedData
                });
            } catch (err: any) {
                console.error(`Extraction failed for ${name}:`, err);
                reply({ ok: false, error: err?.message || String(err), data: { target: data.target, name } });
            }

            break;
        }
        case 'extract_partial': {
            let partialFile = data.partialFile;
            let baseFile = data.baseFile;
            if (!filetypes[data.filetype] || !filetypes[data.filetype].extract_partial) {
                reply({ ok: false, error: `Partial extractor for ${data.filetype} not found` });
                return;
            }
            try {
                let partialData = await filetypes[data.filetype].extract_partial!(partialFile, baseFile);
                parseMessage('extract', { target: partialData.data, name: partialData.name }, reply);
            } catch (err: any) {
                reply({ ok: false, error: err?.message || String(err) });
            }
            break;
        }
        case 'repack': {
            let targetType = data.filetype;
            if (!filetypes[targetType] || !filetypes[targetType].repack) {
                reply({ ok: false, error: `Repacker for ${targetType} not found` });
                return;
            }
            try {
                let repacked = await filetypes[targetType].repack!(data.data);
                reply({ ok: true, data: repacked });
            } catch (err: any) {
                reply({ ok: false, error: err?.message || String(err) });
            }
            break;
        }
        case 'fileInfo':
            reply({ ok: true, data: filetypes });
            break;
    }
}

// Guarded so this module can be imported directly in unit tests (e.g. to exercise
// resolveFile()) without a real Worker global. Inside an actual Web Worker, `self` is
// always defined, so this guard never changes runtime behavior there.
if (typeof self !== "undefined" && typeof self.onmessage !== "undefined") {
    self.onmessage = async (event: MessageEvent) => {
        if (!event.data || !event.data.type) return;
        await parseMessage(event.data.type, event.data.data, replyBase.bind(null, event.data.id));
    };
}

if (typeof self !== "undefined" && typeof self.postMessage === "function") {
    self.postMessage("loaded");
}