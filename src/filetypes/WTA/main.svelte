<script lang="ts">
    import { get } from "svelte/store";
    import { Image as ImageIcon, Search, Download, AlertCircle, Archive } from "@lucide/svelte";
    import JSZip from "jszip";
    import { WTATexture, type FileData } from "./extract";
    import type FileHandler from "../../lib/FileHandler";
    import ImageComponent from "./components/Image.svelte";

    let {
        name,
        data,
        fileHandler
    }: {
        name: string;
        data: FileData;
        fileHandler?: FileHandler;
        setUnsavedChanges?: (value: boolean) => void;
    } = $props();

    export function save(): FileData | false {
        return false;
    }

    let searchQuery = $state("");
    let selectedIndex = $state(0);
    let isExportingZip = $state(false);

    let recreatedTextures = $derived(
        (data?.textures || []).map(x => WTATexture.recreate(x))
    );

    let filteredTextures = $derived(
        recreatedTextures.map((t, originalIdx) => ({ texture: t, originalIdx }))
            .filter(({ texture }) => {
                if (!searchQuery.trim()) return true;
                const query = searchQuery.toLowerCase();
                const id = (texture.identifier || "").toLowerCase();
                const format = (texture._format || "").toLowerCase();
                const dims = `${texture.width}x${texture.height}`;
                return id.includes(query) || format.includes(query) || dims.includes(query);
            })
    );

    let wtpArrayBuffer = $derived.by(() => {
        if (!fileHandler) return null;
        const allFiles = get(fileHandler.files);
        const wtpName = name.replace(/\.wta$/i, ".wtp");
        const match = allFiles.find(f => f.name.endsWith(wtpName) || f.name.toLowerCase().endsWith(wtpName.toLowerCase()));
        if (!match) return null;
        
        const fileStoreData = get(match.data);
        if (fileStoreData instanceof ArrayBuffer) {
            return fileStoreData;
        }
        if (fileStoreData?.target instanceof ArrayBuffer) {
            return fileStoreData.target;
        }
        if (fileStoreData?.arrayBuffer instanceof ArrayBuffer) {
            return fileStoreData.arrayBuffer;
        }
        return null;
    });

    async function exportAllAsZip() {
        if (!wtpArrayBuffer || recreatedTextures.length === 0) return;
        isExportingZip = true;
        try {
            const zip = new JSZip();
            const baseName = name.replace(/\.wta$/i, "");
            const folder = zip.folder(baseName) || zip;

            for (let i = 0; i < recreatedTextures.length; i++) {
                const tex = recreatedTextures[i];
                try {
                    const raw = tex.download(wtpArrayBuffer.slice(0));
                    const ext = tex._format?.includes("ASTC") ? "astc" : "dds";
                    folder.file(`${baseName}_${tex.identifier || i}.${ext}`, raw);
                } catch (e) {
                    console.warn(`Failed to export texture ${tex.identifier}:`, e);
                }
            }

            const content = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(content);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${baseName}_textures.zip`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("ZIP export failed:", err);
            alert("Failed to create ZIP export");
        } finally {
            isExportingZip = false;
        }
    }
</script>

<div class="wta-main-container">
    {#if !wtpArrayBuffer}
        <div class="missing-wtp-notice">
            <AlertCircle size={40} class="text-warning" />
            <h2>Associated WTP file not loaded</h2>
            <p>
                To view textures from <strong>{name}</strong>, the accompanying <strong>{name.replace(/\.wta$/i, ".wtp")}</strong> texture data file must also be present in the loaded files list.
            </p>
            <p class="hint">
                Tip: If you opened a DAT archive, ensure the full archive was extracted.
            </p>
        </div>
    {:else}
        <div class="wta-workspace">
            <div class="viewer-section">
                {#if recreatedTextures[selectedIndex]}
                    <ImageComponent
                        texture={recreatedTextures[selectedIndex]}
                        wtpFile={wtpArrayBuffer}
                    />
                {:else}
                    <div class="no-selection">
                        <ImageIcon size={48} />
                        <p>Select a texture from the sidebar to preview</p>
                    </div>
                {/if}
            </div>

            <aside class="texture-sidebar">
                <div class="sidebar-header">
                    <div class="search-box">
                        <Search size={14} class="search-icon" />
                        <input
                            type="text"
                            placeholder="Filter textures (ID, format, dimensions)..."
                            bind:value={searchQuery}
                            aria-label="Filter textures"
                        />
                    </div>
                    <button
                        class="bulk-export-btn"
                        onclick={exportAllAsZip}
                        disabled={isExportingZip}
                        title="Download all textures in archive as a ZIP"
                    >
                        <Archive size={14} />
                        <span>{isExportingZip ? "Compressing..." : "Export All (ZIP)"}</span>
                    </button>
                </div>

                <div class="texture-items-list" role="listbox" aria-label="Texture list">
                    {#each filteredTextures as { texture, originalIdx }}
                        <button
                            class="texture-card"
                            class:active={selectedIndex === originalIdx}
                            onclick={() => selectedIndex = originalIdx}
                            role="option"
                            aria-selected={selectedIndex === originalIdx}
                        >
                            <div class="texture-icon-box">
                                <ImageIcon size={20} />
                            </div>
                            <div class="texture-details">
                                <div class="top-line">
                                    <span class="texture-id">0x{texture.identifier}</span>
                                    <span class="texture-dims">{texture.width} &times; {texture.height}</span>
                                </div>
                                <div class="bottom-line">
                                    <span class="texture-format">{texture._format || "Unknown"}</span>
                                    <span class="texture-mips">{texture.mipCount || 1} mip{texture.mipCount === 1 ? "" : "s"}</span>
                                </div>
                            </div>
                        </button>
                    {/each}
                    {#if filteredTextures.length === 0}
                        <div class="empty-search">No textures match "{searchQuery}"</div>
                    {/if}
                </div>
            </aside>
        </div>
    {/if}
</div>

<style>
    .wta-main-container {
        display: flex;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background-color: var(--bg-color, #18181f);
    }

    .missing-wtp-notice {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        padding: 32px;
        text-align: center;
        box-sizing: border-box;
    }

    .missing-wtp-notice h2 {
        margin: 16px 0 8px 0;
        color: var(--text-color, #f0f0f5);
    }

    .missing-wtp-notice p {
        margin: 4px 0;
        color: var(--text-muted, #8b8b99);
        max-width: 480px;
        font-size: 0.9rem;
    }

    .missing-wtp-notice .hint {
        margin-top: 16px;
        font-size: 0.8rem;
        color: var(--text-dim, #666675);
    }

    .wta-workspace {
        display: flex;
        width: 100%;
        height: 100%;
        overflow: hidden;
    }

    .viewer-section {
        flex-grow: 1;
        height: 100%;
        overflow: hidden;
        position: relative;
    }

    .no-selection {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: var(--text-muted, #8b8b99);
        gap: 12px;
    }

    .texture-sidebar {
        width: 320px;
        flex-shrink: 0;
        height: 100%;
        display: flex;
        flex-direction: column;
        background-color: var(--card-bg, #18181f);
        border-left: 1px solid var(--border-color, #2e2e36);
    }

    .sidebar-header {
        padding: 12px;
        border-bottom: 1px solid var(--border-color, #2e2e36);
        display: flex;
        flex-direction: column;
        gap: 8px;
        background-color: var(--toolbar-bg, #141418);
    }

    .search-box {
        display: flex;
        align-items: center;
        background-color: var(--bg-dark, #1c1c24);
        border: 1px solid var(--border-color, #2e2e36);
        border-radius: 6px;
        padding: 4px 8px;
        gap: 6px;
    }

    .search-box input {
        border: none;
        outline: none;
        background: transparent;
        color: var(--text-color, #e0e0e8);
        font-size: 0.8rem;
        width: 100%;
    }

    .bulk-export-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 6px 12px;
        border-radius: 6px;
        border: 1px solid var(--border-color, #3a3a48);
        background-color: var(--button-bg, #262632);
        color: var(--text-color, #e0e0e8);
        font-size: 0.75rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;
    }

    .bulk-export-btn:hover:not(:disabled) {
        background-color: var(--button-hover-bg, #303040);
        border-color: var(--accent-color, #5865f2);
    }

    .bulk-export-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .texture-items-list {
        flex-grow: 1;
        overflow-y: auto;
        padding: 8px;
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .texture-card {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 12px;
        border-radius: 6px;
        border: 1px solid transparent;
        background-color: var(--card-bg-subtle, #1e1e26);
        color: var(--text-color, #d4d4dc);
        cursor: pointer;
        text-align: left;
        width: 100%;
        box-sizing: border-box;
        transition: all 0.15s ease;
    }

    .texture-card:hover:not(.active) {
        background-color: var(--hover-bg, #272733);
        border-color: var(--border-color, #333342);
    }

    .texture-card.active {
        background-color: rgba(0, 99, 219, 0.18);
        border-color: #0063db;
        color: #ffffff;
    }

    .texture-icon-box {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border-radius: 6px;
        background-color: rgba(0, 0, 0, 0.2);
        flex-shrink: 0;
        color: var(--text-muted, #8b8b99);
    }

    .texture-card.active .texture-icon-box {
        color: #58a6ff;
    }

    .texture-details {
        display: flex;
        flex-direction: column;
        gap: 2px;
        flex-grow: 1;
        overflow: hidden;
    }

    .top-line,
    .bottom-line {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .texture-id {
        font-family: monospace;
        font-size: 0.8rem;
        font-weight: 600;
    }

    .texture-dims {
        font-size: 0.75rem;
        color: var(--text-muted, #8b8b99);
        font-family: monospace;
    }

    .texture-format {
        font-size: 0.7rem;
        color: var(--text-dim, #717180);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 150px;
    }

    .texture-mips {
        font-size: 0.7rem;
        color: var(--text-dim, #717180);
    }

    .empty-search {
        padding: 24px 12px;
        text-align: center;
        color: var(--text-muted, #8b8b99);
        font-size: 0.85rem;
    }

    :global(.text-warning) {
        color: #fee75c;
    }
</style>