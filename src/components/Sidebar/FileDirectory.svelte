<script lang="ts">
    import { get } from "svelte/store";
    import {
        Folder,
        FolderOpen,
        File as DefaultFileIcon,
        FileCode,
        FileText,
        Image as ImageIcon,
        Box,
        Layers,
        Sparkles,
        ChevronRight,
        ChevronDown
    } from "@lucide/svelte";
    import { componentTabs, loadedComponentIndex } from "../Main/MainStore";
    import { PlatinumFile } from "../../lib/FileHandler";
    import type FileHandler from "../../lib/FileHandler";
    import FileDirectory from "./FileDirectory.svelte";

    interface Props {
        fileHandler: FileHandler;
        tree?: any;
        root?: boolean;
        directoryName?: string;
        searchFilter?: string;
    }

    let {
        fileHandler,
        tree = {},
        root = false,
        directoryName = "root",
        searchFilter = ""
    }: Props = $props();

    let directoryOpen = $state(true);
    let files = $derived(fileHandler.files);

    function buildTree(allFiles: Array<PlatinumFile>) {
        const rootTree: Record<string, any> = {};

        for (const file of allFiles) {
            const parts = file.name.split("/");
            let current = rootTree;

            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                if (i === parts.length - 1) {
                    current[part] = file;
                } else {
                    if (!current[part]) current[part] = {};
                    current = current[part];
                }
            }
        }

        matchVisualizers(rootTree, "root");
        return rootTree;
    }

    function matchVisualizers(treeObj: Record<string, any>, folderName: string) {
        const fileNames: string[] = [];
        for (const key in treeObj) {
            if (treeObj[key] instanceof PlatinumFile) {
                fileNames.push(key);
            } else if (typeof treeObj[key] === "object" && !Array.isArray(treeObj[key])) {
                matchVisualizers(treeObj[key], key);
            }
        }

        for (const visKey in fileHandler.visualizers) {
            const visualizer = fileHandler.visualizers[visKey];
            const info = visualizer.visualizerInfo;
            if (!info || !info.match) continue;

            const folderRegex = new RegExp(info.match);
            if (!folderRegex.test(folderName)) continue;

            let allMatched = true;
            const remainingFiles = [...fileNames];

            for (const pattern of info.folderMatch || []) {
                if (pattern.startsWith("?")) {
                    const optionalRegex = new RegExp(pattern.slice(1));
                    const foundIdx = remainingFiles.findIndex(fn => optionalRegex.test(fn));
                    if (foundIdx !== -1) {
                        remainingFiles.splice(foundIdx, 1);
                    }
                } else {
                    const requiredRegex = new RegExp(pattern);
                    const foundIdx = remainingFiles.findIndex(fn => requiredRegex.test(fn));
                    if (foundIdx !== -1) {
                        remainingFiles.splice(foundIdx, 1);
                    } else {
                        allMatched = false;
                        break;
                    }
                }
            }

            if (allMatched && remainingFiles.length === 0) {
                if (treeObj._visualizers) {
                    (treeObj._visualizers as any[]).push(visualizer);
                } else {
                    treeObj._visualizers = [visualizer];
                }
            }
        }
    }

    let calculatedTree = $derived(root ? buildTree(get(files)) : tree);

    function getFileIcon(file: PlatinumFile) {
        const ext = file.baseName.split(".").pop()?.toLowerCase();
        if (ext === "bxm" || ext === "xml") return FileCode;
        if (ext === "csv") return FileText;
        if (ext === "wta" || ext === "wtp" || ext === "dds" || ext === "astc") return ImageIcon;
        if (ext === "col" || ext === "col2") return Box;
        if (ext === "dat" || ext === "dtt" || ext === "pkz") return Layers;
        return DefaultFileIcon;
    }

    function openFile(file: PlatinumFile) {
        if (file.unknown) {
            const storeData = get(file.data);
            const targetBuf = storeData?.target || storeData?.arrayBuffer;
            if (!targetBuf || targetBuf.byteLength === 0) {
                alert("This file is empty and cannot be downloaded.");
            } else {
                if (confirm(`"${file.name}" is an unrecognized file type. Download it directly?`)) {
                    const blob = new Blob([targetBuf], { type: "application/octet-stream" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = file.baseName;
                    a.click();
                    URL.revokeObjectURL(url);
                }
            }
        } else if (file.isPartial) {
            file.extract();
        } else {
            fileHandler.openFile(file);
        }
    }

    function launchVisualizer(visualizer: any, targetTree: any) {
        const matchedFiles: Record<string, PlatinumFile> = {};
        for (const k in targetTree) {
            if (targetTree[k] instanceof PlatinumFile) {
                matchedFiles[k] = targetTree[k];
            }
        }
        fileHandler.visualizeFolder(visualizer, Object.values(matchedFiles), directoryName);
    }

    function isFileActive(file: PlatinumFile): boolean {
        const tabs = $componentTabs;
        const currentIdx = $loadedComponentIndex;
        return tabs[currentIdx]?.file === file;
    }

    function matchesSearch(name: string): boolean {
        if (!searchFilter.trim()) return true;
        return name.toLowerCase().includes(searchFilter.toLowerCase());
    }
</script>

{#if root}
    <div class="tree-root" role="tree" aria-label="Loaded files and archives">
        {#each Object.keys(calculatedTree).sort() as key}
            {#if calculatedTree[key] instanceof PlatinumFile}
                {#if matchesSearch(key)}
                    {@const fileObj = calculatedTree[key]}
                    {@const IconComp = getFileIcon(fileObj)}
                    <button
                        class="tree-item file-item"
                        class:active={isFileActive(fileObj)}
                        class:is-partial={fileObj.isPartial}
                        onclick={() => openFile(fileObj)}
                        role="treeitem"
                        aria-selected={isFileActive(fileObj)}
                        title={fileObj.name}
                    >
                        <span class="icon-wrap">
                            <IconComp size={16} />
                        </span>
                        <span class="item-name">{key}</span>
                        {#if fileObj.isPartial}
                            <span class="badge partial">PKZ</span>
                        {/if}
                    </button>
                {/if}
            {:else if key !== "_visualizers" && typeof calculatedTree[key] === "object" && !Array.isArray(calculatedTree[key])}
                <FileDirectory
                    {fileHandler}
                    tree={calculatedTree[key]}
                    directoryName={key}
                    {searchFilter}
                />
            {/if}
        {/each}
    </div>
{:else}
    <div class="tree-branch" role="group">
        <button
            class="tree-item dir-item"
            onclick={() => directoryOpen = !directoryOpen}
            role="treeitem"
            aria-expanded={directoryOpen}
            aria-selected={false}
            title={directoryName}
        >
            <span class="chevron-wrap">
                {#if directoryOpen}
                    <ChevronDown size={14} />
                {:else}
                    <ChevronRight size={14} />
                {/if}
            </span>
            <span class="icon-wrap dir-icon">
                {#if directoryOpen}
                    <FolderOpen size={16} />
                {:else}
                    <Folder size={16} />
                {/if}
            </span>
            <span class="item-name dir-name">{directoryName}</span>
        </button>

        {#if directoryOpen}
            <div class="branch-children">
                {#if calculatedTree._visualizers}
                    {#each calculatedTree._visualizers as vis}
                        <button
                            class="visualizer-launch-btn"
                            onclick={() => launchVisualizer(vis, calculatedTree)}
                        >
                            <Sparkles size={14} />
                            <span>{vis.visualizerInfo?.buttonText || "Open in Visualizer"}</span>
                        </button>
                    {/each}
                {/if}

                {#each Object.keys(calculatedTree).sort() as key}
                    {#if calculatedTree[key] instanceof PlatinumFile}
                        {#if matchesSearch(key)}
                            {@const fileObj = calculatedTree[key]}
                            {@const IconComp = getFileIcon(fileObj)}
                            <button
                                class="tree-item file-item"
                                class:active={isFileActive(fileObj)}
                                class:is-partial={fileObj.isPartial}
                                onclick={() => openFile(fileObj)}
                                role="treeitem"
                                aria-selected={isFileActive(fileObj)}
                                title={fileObj.name}
                            >
                                <span class="icon-wrap">
                                    <IconComp size={16} />
                                </span>
                                <span class="item-name">{key}</span>
                                {#if fileObj.isPartial}
                                    <span class="badge partial">PKZ</span>
                                {/if}
                            </button>
                        {/if}
                    {:else if key !== "_visualizers" && typeof calculatedTree[key] === "object" && !Array.isArray(calculatedTree[key])}
                        <FileDirectory
                            {fileHandler}
                            tree={calculatedTree[key]}
                            directoryName={key}
                            {searchFilter}
                        />
                    {/if}
                {/each}
            </div>
        {/if}
    </div>
{/if}

<style>
    .tree-root {
        display: flex;
        flex-direction: column;
        width: 100%;
        gap: 1px;
    }

    .tree-branch {
        display: flex;
        flex-direction: column;
        width: 100%;
    }

    .branch-children {
        display: flex;
        flex-direction: column;
        margin-left: 14px;
        padding-left: 6px;
        border-left: 1px solid var(--border-subtle, #242430);
        gap: 1px;
    }

    .tree-item {
        display: flex;
        align-items: center;
        width: 100%;
        padding: 5px 8px;
        border-radius: 5px;
        border: 1px solid transparent;
        background: transparent;
        color: var(--text-color, #ededf2);
        cursor: pointer;
        text-align: left;
        font-size: 0.82rem;
        gap: 6px;
        user-select: none;
        box-sizing: border-box;
        transition: background-color 0.1s ease;
    }

    .tree-item:hover {
        background-color: var(--bg-sidebar-hover, #22222c);
    }

    .tree-item.active {
        background-color: var(--bg-sidebar-active, #2a2a38);
        border-color: rgba(0, 99, 219, 0.5);
        color: #ffffff;
        font-weight: 500;
    }

    .chevron-wrap {
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--text-dim, #6d6d80);
        width: 14px;
        flex-shrink: 0;
    }

    .icon-wrap {
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--text-muted, #9595a6);
        flex-shrink: 0;
    }

    .icon-wrap.dir-icon {
        color: #58a6ff;
    }

    .item-name {
        flex-grow: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .dir-name {
        font-weight: 500;
    }

    .badge {
        padding: 1px 5px;
        border-radius: 3px;
        font-size: 0.65rem;
        font-weight: 600;
        text-transform: uppercase;
        flex-shrink: 0;
    }

    .badge.partial {
        background-color: rgba(210, 153, 34, 0.2);
        color: #d29922;
        border: 1px solid rgba(210, 153, 34, 0.4);
    }

    .visualizer-launch-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        margin: 4px 6px;
        padding: 5px 10px;
        border-radius: 6px;
        border: 1px solid rgba(0, 99, 219, 0.4);
        background: linear-gradient(135deg, rgba(0, 99, 219, 0.2), rgba(0, 99, 219, 0.05));
        color: #58a6ff;
        font-size: 0.75rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;
    }

    .visualizer-launch-btn:hover {
        background: rgba(0, 99, 219, 0.35);
        color: #ffffff;
        border-color: #0063db;
    }
</style>