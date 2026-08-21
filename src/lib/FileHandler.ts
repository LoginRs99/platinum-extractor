import { addToast } from "../components/Toasts/ToastStore";
import { loadedComponentIndex, componentTabs } from "../components/Main/MainStore";
import { get, writable, type Writable } from "svelte/store";
import repackPKZ, { type PKZInputFile } from "../filetypes/PKZ/repack";
import repackPTD from "../filetypes/PTD/repack";
import repackBXM from "../filetypes/BXM/repack";
import repackCSV from "../filetypes/CSV/repack";
import repackDAT from "../filetypes/DAT/repack";

export interface VisualizerModule {
    component?: any;
    visualizerInfo?: {
        name: string;
        match: string;
        folderMatch: string[];
        description: string;
        buttonText: string;
        icon: string;
        credits: string;
    };
}

function loadComponents(): Record<string, any> {
    const fileTypes: Record<string, any> = {};
  
    const context = import.meta.glob<Record<string, any>>('../filetypes/*/*.svelte', { eager: true });
    for (const [path, module] of Object.entries(context)) {
        const normalized = path.replace(/\\/g, '/');
        const match = normalized.match(/(?:^|\/)filetypes\/([^/]+)\/([^/]+)\.svelte$/);
        if (!match) continue;
        const [, folderName, fileName] = match;
        if (folderName === 'Base') continue;
        if (fileName === 'main') {
            fileTypes[folderName] = module.default;
        }
    }
    return fileTypes;
}

function loadVisualizers(): Record<string, VisualizerModule> {
    const visualizerTypes: Record<string, VisualizerModule> = {};
  
    const context = import.meta.glob<Record<string, any>>('../visualizers/*/*.{ts,svelte}', { eager: true });
    for (const [path, module] of Object.entries(context)) {
        const normalized = path.replace(/\\/g, '/');
        const match = normalized.match(/(?:^|\/)visualizers\/([^/]+)\/([^/]+)\.(ts|svelte)$/);
        if (!match) continue;
        const [, folderName, fileName] = match;
        if (folderName === 'Base') continue;
        if (!visualizerTypes[folderName]) {
            visualizerTypes[folderName] = {};
        }
        switch (fileName) {
            case 'visualizer':
                visualizerTypes[folderName].component = module.default;
                break;
            case 'visualizerInfo':
                visualizerTypes[folderName].visualizerInfo = module.default;
                break;
            default:
                break;
        }
    }
    return visualizerTypes;
}

export class PlatinumFile {
    name: string;
    baseName: string; // Name without path
    data: Writable<any>;
    isPartial: boolean;
    repackable: boolean;
    unknown = false;
    icon = "file";
    resolvedType = "unknown";
    extractFn?: ((caller: PlatinumFile) => Promise<any>) | null;

    constructor(
        name: string,
        data: any,
        isPartial: boolean,
        repackable: boolean,
        resolvedType?: string,
        icon?: string,
        extractFn?: (caller: PlatinumFile) => Promise<any>
    ) {
        this.name = name;
        this.baseName = name.split('/').pop() || name;
        this.data = writable(data);
        this.isPartial = isPartial;
        this.repackable = repackable;
        if (extractFn) this.extractFn = extractFn;
        if (icon) this.icon = icon;
        if (resolvedType) this.resolvedType = resolvedType;

        if (data?.name && data?.target) {
            this.unknown = true;
        }
    }

    async extract() {
        if (!this.isPartial || !this.extractFn) return get(this.data);

        let newData = await this.extractFn(this);
        this.data.set(newData);
        this.isPartial = false;
        this.extractFn = null;
        return newData;
    }
}

export default class FileHandler {
    worker: Worker;
    components = loadComponents();
    visualizers = loadVisualizers();
    files: Writable<PlatinumFile[]> = writable([]);
    private pendingMessages = new Map<string, { resolve: (data: any) => void; reject: (error: any) => void }>();

    constructor() {
        this.worker = new Worker(new URL('./FileHandler.worker.ts', import.meta.url), { type: 'module' });
        
        this.worker.addEventListener('message', (event: MessageEvent) => {
            if (event.data === 'loaded') return;
            const { id, data } = event.data || {};
            if (id && this.pendingMessages.has(id)) {
                const handler = this.pendingMessages.get(id)!;
                this.pendingMessages.delete(id);
                if (data && (data.error || data.ok === false)) {
                    handler.reject(data.error || "An error occurred (received non-OK response)");
                } else {
                    handler.resolve(data);
                }
            }
        });

        this.worker.addEventListener('error', (event: ErrorEvent) => {
            for (const [, handler] of this.pendingMessages.entries()) {
                handler.reject(event);
            }
            this.pendingMessages.clear();
        });
    }

    async sendMessage(type: string, data: any): Promise<any> {
        const id = Math.random().toString(36).substring(2) + Date.now().toString(36);
        return new Promise((resolve, reject) => {
            this.pendingMessages.set(id, { resolve, reject });
            this.worker.postMessage({ data, type, id });
        });
    }

    openFile(file: PlatinumFile) {
        const currentData = get(file.data);
        if (currentData && currentData.arrayBuffer && currentData.name) {
            addToast({
                type: 'warning',
                timeout: 10000,
                title: `Failed to open ${file.name.split("/").pop()}`,
                message: "I don't currently support opening this file type right now, but you can open an issue to request support!"
            });
            return;
        }

        // resolve component
        let component = this.components[file.resolvedType];
        if (!component) {
            addToast({
                type: 'warning',
                timeout: 10000,
                title: `Failed to open ${file.name.split("/").pop()}`,
                message: `Despite an implementation existing (${file.resolvedType}), no component was found for this file type.\nAre you sure you should be opening this file?`
            });
            return;
        }

        if (get(componentTabs).map(tab => tab.file).includes(file)) {
            componentTabs.update(tabs => tabs.map(tab => {
                if (tab.file === file) {
                    tab.unchanged.set(false);
                }
                return tab;
            }));
            loadedComponentIndex.set(get(componentTabs).map(tab => tab.file).indexOf(file));
            return;
        }

        // set component
        componentTabs.update(tabs => [...tabs.filter(tab => !get(tab.unchanged)), {
            name: file.name.split("/").pop() || file.name,
            file,
            unchanged: writable(true),
            unsaved: writable(false),
            component
        }]);
        loadedComponentIndex.set(get(componentTabs).length - 1);
    }

    /**
     * Create a tab for the given visualizer.
     */
    visualizeFolder(visualizer: VisualizerModule, files: PlatinumFile[], folderName: string) {
        if (!visualizer.component) {
            addToast({
                type: 'warning',
                timeout: 10000,
                title: `Failed to visualize folder`,
                message: "Despite an implementation existing, no component was found for this visualizer.\nPlease add a Svelte component to this visualizer."
            });
            return;
        }

        let tabName = (visualizer.visualizerInfo?.name || "Visualizer") + " - " + folderName;

        if (get(componentTabs).map(tab => tab.name).includes(tabName)) {
            componentTabs.update(tabs => tabs.map(tab => {
                if (tab.name === tabName) {
                    tab.unchanged.set(false);
                }
                return tab;
            }));
            loadedComponentIndex.set(get(componentTabs).map(tab => tab.name).indexOf(tabName));
            return;
        }

        // set component
        componentTabs.update(tabs => [...tabs.filter(tab => !get(tab.unchanged)), {
            name: tabName,
            files,
            unchanged: writable(true),
            unsaved: writable(false),
            component: visualizer.component
        }]);
        loadedComponentIndex.set(get(componentTabs).length - 1);
    }

    async extractPartialFile(baseFiletype: string, baseFile: any, partialFile: any, caller: PlatinumFile) {
        let response: any = await this.sendMessage('extract_partial', { baseFile, partialFile, filetype: baseFiletype })
            .catch((e) => {
                addToast({
                    type: 'warning',
                    timeout: 10000,
                    title: `Failed to extract ${partialFile.name} from ${baseFile.baseFile?.name || 'archive'}`,
                    message: String(e)
                });
            });
        
        if (!response) return undefined;

        // Compressed (in PKZ) -> Archive formats (DAT/DTT)
        if (response.data && response.data.files) {
            let currentFiles = get(this.files);
            const callerIdx = currentFiles.indexOf(caller);
            if (callerIdx !== -1) {
                currentFiles.splice(callerIdx, 1);
            }
            currentFiles.push(
                ...response.data.files.map(
                    (f: any) => new PlatinumFile(partialFile.name + "/" + f.name, f.data, response.hasPartialFiles, response.isRepackable, f.filetype, response.icon)
                )
            );
            this.files.set(currentFiles);
            return response.data;
        }

        // Leaf file: the worker has resolved the decompressed bytes to a concrete filetype
        // (or, if none matched, to a raw "unknown" payload - see FileHandler.worker.ts).
        // Update the caller in place so it reflects the REAL resolved type instead of the
        // parent archive's type (e.g. "PKZ") it was created with, and unwrap `response.data`
        // so `file.data` holds the actual payload rather than the whole worker response.
        caller.resolvedType = response.filetype || "unknown";
        caller.icon = response.icon || caller.icon;
        caller.repackable = !!response.isRepackable;
        caller.unknown = !!(response.data && response.data.name && response.data.target);

        return response.data;
    }

    async import(files: File[]) {
        for (let file of files) {
            let response: any = await this.sendMessage('extract', { target: file })
                .catch((e) => {
                    addToast({
                        type: 'warning',
                        timeout: 10000,
                        title: `Failed to extract ${file.name}`,
                        message: String(e)
                    });
                });

            if (!response) continue;

            // Archive formats (DAT/DTT)
            if (response.data && response.data.files) {
                if (response.data.files.length === 0) {
                    addToast({
                        type: 'warning',
                        timeout: 10000,
                        title: `Failed to extract ${file.name}`,
                        message: "No files found in archive"
                    });
                    continue;
                }

                // Partial files (large formats, PKZ/CPK)
                let baseFn: ((p: any, c: any) => Promise<any>) | undefined = undefined;
                if (response.hasPartialFiles) {
                    baseFn = (partialFile: any, caller: any) => this.extractPartialFile(response.filetype, response.data, partialFile, caller);
                }

                this.files.update(f => [...f,
                    ...response.data.files.map(
                        (subFile: any) => new PlatinumFile(
                            subFile.name,
                            subFile.data,
                            response.hasPartialFiles,
                            response.isRepackable,
                            response.filetype,
                            response.icon,
                            baseFn ? baseFn.bind(this, subFile) : undefined
                        )
                    )
                ]);
            } else {
                // Single file
                this.files.update(f => [
                    ...f,
                    new PlatinumFile(file.name, response.data, false, response.isRepackable, response.filetype, response.icon)
                ]);
            }
        }
    }

    async getFileBuffer(file: PlatinumFile): Promise<ArrayBuffer> {
        if (file.isPartial) {
            await file.extract();
        }

        const rawData = get(file.data);
        if (!rawData) return new ArrayBuffer(0);

        if (rawData instanceof ArrayBuffer) {
            return rawData;
        }
        if (rawData instanceof Uint8Array) {
            const copy = new Uint8Array(rawData.byteLength);
            copy.set(rawData);
            return copy.buffer;
        }
        if (rawData.target instanceof ArrayBuffer) {
            return rawData.target;
        }
        if (rawData.arrayBuffer instanceof ArrayBuffer) {
            return rawData.arrayBuffer;
        }

        if (file.resolvedType === "PTD") {
            return await repackPTD(rawData);
        }
        if (file.resolvedType === "BXM") {
            return await repackBXM(rawData);
        }
        if (file.resolvedType === "CSV") {
            return await repackCSV(rawData);
        }
        if (file.resolvedType === "DAT") {
            return await repackDAT(rawData);
        }

        try {
            const resp = await this.sendMessage('repack', { filetype: file.resolvedType, data: rawData });
            if (resp && resp.data instanceof ArrayBuffer) {
                return resp.data;
            }
        } catch {
            // Ignore worker repack failure
        }

        return new ArrayBuffer(0);
    }

    async repackPKZ(filesToRepack?: PlatinumFile[], archiveName: string = "archive.pkz"): Promise<ArrayBuffer> {
        const targetFiles = filesToRepack && filesToRepack.length > 0 ? filesToRepack : get(this.files);
        if (targetFiles.length === 0) {
            throw new Error("No files loaded to repack into PKZ archive.");
        }

        const pkzInputs: PKZInputFile[] = [];
        for (const file of targetFiles) {
            const buffer = await this.getFileBuffer(file);
            let name = file.name;
            if (name.includes("/")) {
                const parts = name.split("/");
                name = parts[parts.length - 1];
            }
            pkzInputs.push({
                name,
                data: buffer,
                compressionType: "ZStandard"
            });
        }

        return await repackPKZ(pkzInputs, true);
    }
}