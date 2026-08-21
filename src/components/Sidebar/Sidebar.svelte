<script lang="ts">
    import { get } from "svelte/store";
    import {
        Upload,
        Trash2,
        Search,
        X,
        Sun,
        Moon,
        FolderPlus,
        Package,
        Layers,
        Sparkles
    } from "@lucide/svelte";
    import FileDirectory from "./FileDirectory.svelte";
    import type FileHandler from "../../lib/FileHandler";
    import { componentTabs } from "../Main/MainStore";
    import { currentTheme, toggleTheme } from "../../lib/theme";

    let { fileHandler }: { fileHandler: FileHandler } = $props();

    let fileHandlerFiles = $derived(fileHandler.files);
    let isDragHovering = $state(false);
    let searchFilter = $state("");
    let fileInputElement: HTMLInputElement | undefined = $state();
    let folderInputElement: HTMLInputElement | undefined = $state();

    function handleDragDrop(e: DragEvent) {
        e.preventDefault();
        isDragHovering = false;
        if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
            fileHandler.import(Array.from(e.dataTransfer.files));
        }
    }

    async function handleFileChange(e: Event) {
        const target = e.target as HTMLInputElement;
        if (target.files && target.files.length > 0) {
            await fileHandler.import(Array.from(target.files));
            target.value = "";
        }
    }

    function deleteAllFiles() {
        if (confirm("Are you sure you want to clear all loaded files from the workspace?")) {
            $fileHandlerFiles = [];
            $componentTabs = [];
        }
    }

    let fileCount = $derived($fileHandlerFiles.length);
</script>

<aside
    class="sidebar"
    class:drag-over={isDragHovering}
    ondrop={handleDragDrop}
    ondragenter={() => isDragHovering = true}
    ondragleave={(e) => { if (e.target === e.currentTarget) isDragHovering = false; }}
    ondragover={(e) => e.preventDefault()}
    aria-label="File explorer"
>
    <header class="sidebar-header">
        <div class="brand">
            <div class="logo-badge">
                <Package size={18} />
            </div>
            <div class="title-group">
                <span class="brand-title">Platinum Extractor</span>
                <span class="brand-sub">Game Archive Tool</span>
            </div>
        </div>

        <button
            class="theme-toggle-btn"
            onclick={toggleTheme}
            title={$currentTheme === "dark" ? "Switch to Light theme" : "Switch to Dark theme"}
            aria-label="Toggle theme"
        >
            {#if $currentTheme === "dark"}
                <Sun size={16} />
            {:else}
                <Moon size={16} />
            {/if}
        </button>
    </header>

    <div class="search-bar-container">
        <div class="search-input-wrapper">
            <Search size={14} class="search-icon" />
            <input
                type="text"
                placeholder="Search loaded files..."
                bind:value={searchFilter}
                aria-label="Search files"
            />
            {#if searchFilter}
                <button class="clear-search-btn" onclick={() => searchFilter = ""} aria-label="Clear search">
                    <X size={12} />
                </button>
            {/if}
        </div>
    </div>

    <div class="file-list-area">
        {#if fileCount === 0}
            <div class="empty-state">
                <div class="empty-icon-box">
                    <Upload size={32} />
                </div>
                <h3>No files loaded</h3>
                <p>Drag & drop Platinum Games files here, or use the upload buttons below.</p>
                <div class="supported-formats">
                    <span>PKZ</span>
                    <span>DAT</span>
                    <span>DTT</span>
                    <span>WTA</span>
                    <span>BXM</span>
                    <span>CSV</span>
                    <span>MCD</span>
                </div>
            </div>
        {:else}
            <FileDirectory {fileHandler} root={true} {searchFilter} />
        {/if}
    </div>

    <footer class="sidebar-footer">
        <div class="stats-row">
            <span>{fileCount} item{fileCount === 1 ? "" : "s"} loaded</span>
            {#if fileCount > 0}
                <button class="clear-all-btn" onclick={deleteAllFiles} title="Clear all files">
                    <Trash2 size={13} />
                    <span>Clear All</span>
                </button>
            {/if}
        </div>

        <div class="upload-buttons-row">
            <button class="upload-btn primary" onclick={() => fileInputElement?.click()}>
                <Upload size={14} />
                <span>Upload Files</span>
            </button>
            <button class="upload-btn secondary" onclick={() => folderInputElement?.click()} title="Upload directory of files">
                <FolderPlus size={14} />
                <span>Folder</span>
            </button>
        </div>
    </footer>

    <!-- Hidden file inputs -->
    <input
        type="file"
        accept=".pkz,.dat,.dtt,.cpk,.csv,.bxm,.seq,.wta,.wtp,.col,.col2,.wmb,.mot,.eff,.evn"
        multiple
        onchange={handleFileChange}
        bind:this={fileInputElement}
        style="display: none;"
    />
    <input
        type="file"
        webkitdirectory
        multiple
        onchange={handleFileChange}
        bind:this={folderInputElement}
        style="display: none;"
    />

    {#if isDragHovering}
        <div class="drag-drop-overlay" aria-hidden="true">
            <div class="drop-modal">
                <Upload size={48} />
                <h3>Drop files to extract</h3>
                <p>Supports .pkz, .dat, .dtt, .wta, .bxm, .csv, and more</p>
            </div>
        </div>
    {/if}
</aside>

<style>
    .sidebar {
        position: relative;
        display: flex;
        flex-direction: column;
        width: var(--sidebar-width, 320px);
        height: 100%;
        flex-shrink: 0;
        background-color: var(--bg-sidebar, #181820);
        border-right: 1px solid var(--border-color, #2c2c38);
        box-sizing: border-box;
        overflow: hidden;
    }

    .sidebar-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px;
        height: var(--header-height, 48px);
        border-bottom: 1px solid var(--border-color, #2c2c38);
        background-color: var(--bg-sidebar, #181820);
        flex-shrink: 0;
        box-sizing: border-box;
    }

    .brand {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .logo-badge {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 30px;
        height: 30px;
        border-radius: 6px;
        background: linear-gradient(135deg, #0063db, #0049a3);
        color: #ffffff;
    }

    .title-group {
        display: flex;
        flex-direction: column;
    }

    .brand-title {
        font-weight: 700;
        font-size: 0.85rem;
        letter-spacing: -0.01em;
        color: var(--text-color, #ededf2);
    }

    .brand-sub {
        font-size: 0.65rem;
        color: var(--text-muted, #9595a6);
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .theme-toggle-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 30px;
        height: 30px;
        border-radius: 6px;
        border: 1px solid var(--border-color, #2c2c38);
        background: transparent;
        color: var(--text-muted, #9595a6);
        cursor: pointer;
        transition: all 0.15s ease;
    }

    .theme-toggle-btn:hover {
        background-color: var(--bg-sidebar-hover, #22222c);
        color: var(--text-color, #ededf2);
    }

    .search-bar-container {
        padding: 8px 12px;
        border-bottom: 1px solid var(--border-subtle, #242430);
        flex-shrink: 0;
    }

    .search-input-wrapper {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 10px;
        background-color: var(--bg-app, #121217);
        border: 1px solid var(--border-color, #2c2c38);
        border-radius: 6px;
    }

    .search-input-wrapper input {
        border: none;
        outline: none;
        background: transparent;
        color: var(--text-color, #ededf2);
        font-size: 0.8rem;
        width: 100%;
    }

    :global(.search-icon) {
        color: var(--text-dim, #6d6d80);
        flex-shrink: 0;
    }

    .clear-search-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        border: none;
        background: transparent;
        color: var(--text-dim, #6d6d80);
        cursor: pointer;
        padding: 2px;
    }

    .file-list-area {
        flex-grow: 1;
        overflow-y: auto;
        padding: 8px;
    }

    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 32px 16px;
        color: var(--text-muted, #9595a6);
        gap: 10px;
    }

    .empty-icon-box {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 64px;
        height: 64px;
        border-radius: 12px;
        background-color: rgba(255, 255, 255, 0.03);
        color: var(--text-dim, #6d6d80);
    }

    .empty-state h3 {
        margin: 0;
        font-size: 0.95rem;
        color: var(--text-color, #ededf2);
    }

    .empty-state p {
        margin: 0;
        font-size: 0.78rem;
        line-height: 1.4;
    }

    .supported-formats {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 4px;
        margin-top: 8px;
    }

    .supported-formats span {
        font-size: 0.65rem;
        font-weight: 600;
        padding: 2px 6px;
        border-radius: 4px;
        background-color: var(--bg-card, #1c1c24);
        color: var(--text-dim, #6d6d80);
        border: 1px solid var(--border-subtle, #242430);
    }

    .sidebar-footer {
        padding: 10px 12px;
        border-top: 1px solid var(--border-color, #2c2c38);
        background-color: var(--bg-sidebar, #181820);
        display: flex;
        flex-direction: column;
        gap: 8px;
        flex-shrink: 0;
    }

    .stats-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 0.72rem;
        color: var(--text-dim, #6d6d80);
    }

    .clear-all-btn {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        border: none;
        background: transparent;
        color: var(--danger, #f85149);
        font-size: 0.72rem;
        cursor: pointer;
        padding: 2px 4px;
        border-radius: 4px;
    }

    .clear-all-btn:hover {
        background-color: var(--danger-bg, rgba(248, 81, 73, 0.15));
    }

    .upload-buttons-row {
        display: flex;
        gap: 8px;
    }

    .upload-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 0.8rem;
        font-weight: 500;
        cursor: pointer;
        border: 1px solid transparent;
        transition: all 0.15s ease;
    }

    .upload-btn.primary {
        flex-grow: 1;
        background-color: var(--accent-primary, #0063db);
        color: #ffffff;
    }

    .upload-btn.primary:hover {
        background-color: var(--accent-hover, #0056bf);
    }

    .upload-btn.secondary {
        background-color: var(--bg-button, #242430);
        border-color: var(--border-color, #2c2c38);
        color: var(--text-color, #ededf2);
    }

    .upload-btn.secondary:hover {
        background-color: var(--bg-button-hover, #2e2e3e);
    }

    .drag-drop-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 99, 219, 0.85);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 100;
        pointer-events: none;
    }

    .drop-modal {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        color: #ffffff;
        gap: 8px;
        padding: 24px;
    }

    .drop-modal h3 {
        margin: 0;
        font-size: 1.2rem;
    }

    .drop-modal p {
        margin: 0;
        font-size: 0.8rem;
        opacity: 0.85;
    }
</style>