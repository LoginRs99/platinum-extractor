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

function resolveFile(magic: string, name: string): string | undefined {
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
                console.warn(`No filetype found for ${name} with magic ${magic}`);
                reply({ ok: false, error: `No filetype found for ${name} with magic ${magic}`, data: { target: data.target, name: data.name } });
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

self.onmessage = async (event: MessageEvent) => {
    if (!event.data || !event.data.type) return;
    await parseMessage(event.data.type, event.data.data, replyBase.bind(null, event.data.id));
};

self.postMessage("loaded");