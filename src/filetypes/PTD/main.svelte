<script lang="ts">
    import { Search, Download, Upload, FileText, AlertCircle } from "@lucide/svelte";
    import type { FileData, PTDEntry } from "./extract";
    import repack from "./repack";
    import { addToast } from "../../components/Toasts/ToastStore";

    let {
        name,
        data,
        setUnsavedChanges = () => {}
    }: {
        name: string;
        data: FileData;
        setUnsavedChanges?: (value: boolean) => void;
    } = $props();

    let ptdData: FileData = $state({
        magic: "PTD\0",
        shiftKey: 0x26,
        parseMethod: "structured",
        entries: []
    });

    $effect(() => {
        if (data && Array.isArray(data.entries)) {
            ptdData = data;
        }
    });

    let searchQuery = $state("");
    let fileInput: HTMLInputElement | undefined = $state();

    let filteredEntries = $derived(
        (ptdData.entries || []).filter(entry => {
            if (!searchQuery.trim()) return true;
            const query = searchQuery.toLowerCase();
            return (
                String(entry.id).includes(query) ||
                (entry.key || "").toLowerCase().includes(query) ||
                (entry.text || "").toLowerCase().includes(query)
            );
        })
    );

    // Virtualization / Windowing
    let containerElement: HTMLDivElement | undefined = $state();
    let scrollTop = $state(0);
    let containerHeight = $state(600);

    const ROW_HEIGHT = 72;
    const OVERSCAN = 10;

    let totalRows = $derived(filteredEntries.length);
    let startIndex = $derived(Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN));
    let endIndex = $derived(Math.min(totalRows, Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + OVERSCAN));

    let topSpacerHeight = $derived(startIndex * ROW_HEIGHT);
    let bottomSpacerHeight = $derived((totalRows - endIndex) * ROW_HEIGHT);

    let visibleEntries = $derived(filteredEntries.slice(startIndex, endIndex));

    function handleScroll(e: Event) {
        const target = e.target as HTMLDivElement;
        scrollTop = target.scrollTop;
    }

    export function save(): FileData {
        setUnsavedChanges(false);
        return $state.snapshot(ptdData);
    }

    function handleTextChange() {
        setUnsavedChanges(true);
    }

    function exportJSON() {
        const exportObj = {
            magic: "PTD",
            count: ptdData.entries.length,
            entries: ptdData.entries.map(e => ({
                id: e.id,
                key: e.key || `String_${e.id}`,
                text: e.text
            }))
        };

        const jsonContent = JSON.stringify(exportObj, null, 2);
        const blob = new Blob([jsonContent], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const baseName = name.replace(/\.bin$/i, "").replace(/\.ptd$/i, "");
        a.href = url;
        a.download = `${baseName}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    function importJSON(e: Event) {
        const target = e.target as HTMLInputElement;
        if (!target.files || target.files.length === 0) return;

        const file = target.files[0];
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const parsed = JSON.parse(reader.result as string);
                if (parsed && Array.isArray(parsed.entries)) {
                    ptdData.entries = parsed.entries;
                } else if (Array.isArray(parsed)) {
                    ptdData.entries = parsed;
                } else if (typeof parsed === "object") {
                    const entries: PTDEntry[] = [];
                    let idx = 0;
                    for (const [k, v] of Object.entries(parsed)) {
                        if (typeof v === "string") {
                            entries.push({ id: idx++, key: k, text: v });
                        }
                    }
                    if (entries.length > 0) {
                        ptdData.entries = entries;
                    }
                }
                setUnsavedChanges(true);
                addToast({
                    type: "info",
                    title: "JSON Imported",
                    message: `Imported ${ptdData.entries.length} entries into ${name}`
                });
            } catch (err: any) {
                addToast({
                    type: "danger",
                    title: "Import Error",
                    message: "Failed to parse JSON file: " + (err?.message || String(err))
                });
            }
            target.value = "";
        };
        reader.readAsText(file);
    }

    async function downloadRepackedBIN() {
        try {
            if (ptdData.parseMethod === "fallback") {
                addToast({
                    type: "warning",
                    title: "Fallback Repack Warning",
                    message: "This file was extracted using fallback heuristic. Edits may produce a file that does not load correctly in-game."
                });
            }
            const buffer = await repack($state.snapshot(ptdData));
            const blob = new Blob([buffer], { type: "application/octet-stream" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = name.endsWith(".bin") ? name : `${name}.bin`;
            a.click();
            URL.revokeObjectURL(url);
            addToast({
                type: "success",
                title: "Repack Successful",
                message: `Successfully repacked ${name} (${(buffer.byteLength / 1024).toFixed(1)} KB)`
            });
        } catch (err: any) {
            addToast({
                type: "danger",
                title: "Repack Failed",
                message: err?.message || String(err)
            });
        }
    }
</script>

<div class="ptd-editor">
    <header class="ptd-toolbar">
        <div class="toolbar-left">
            <div class="search-box">
                <Search size={14} class="search-icon" />
                <input
                    type="text"
                    placeholder="Search strings, keys, or ID..."
                    bind:value={searchQuery}
                    aria-label="Filter text"
                />
            </div>
            <span class="count-badge">{filteredEntries.length} of {ptdData.entries.length} strings</span>
        </div>

        <div class="toolbar-right">
            <button class="action-btn" onclick={exportJSON} title="Export all text to clean JSON for translation">
                <Download size={14} />
                <span>Export JSON</span>
            </button>

            <button class="action-btn" onclick={() => fileInput?.click()} title="Import translated JSON file">
                <Upload size={14} />
                <span>Import JSON</span>
            </button>

            <button class="action-btn primary" onclick={downloadRepackedBIN} title="Compile & Download binary .bin file for emulator/console">
                <FileText size={14} />
                <span>Repack to .BIN</span>
            </button>
        </div>
    </header>

    {#if ptdData.parseMethod === "fallback"}
        <div class="fallback-warning-banner">
            <span class="warning-icon">
                <AlertCircle size={16} />
            </span>
            <div class="warning-content">
                <strong>Fallback Parse Warning:</strong>
                <span>This file's structure wasn't fully understood and was parsed using a raw byte scanner. Edits may produce a file that does not load correctly in-game. Proceed with caution.</span>
            </div>
        </div>
    {/if}

    <div
        class="table-container"
        bind:this={containerElement}
        bind:clientHeight={containerHeight}
        onscroll={handleScroll}
    >
        <table class="strings-table">
            <thead>
                <tr>
                    <th class="col-id">ID / Key</th>
                    <th class="col-text">Text Content</th>
                </tr>
            </thead>
            <tbody>
                {#if topSpacerHeight > 0}
                    <tr class="virtual-spacer" style="height: {topSpacerHeight}px;">
                        <td colspan="2"></td>
                    </tr>
                {/if}

                {#each visibleEntries as entry (entry.id)}
                    <tr class="string-row">
                        <td class="col-id">
                            <div class="id-group">
                                <span class="id-tag">#{entry.id}</span>
                                {#if entry.key}
                                    <span class="key-name">{entry.key}</span>
                                {/if}
                            </div>
                        </td>
                        <td class="col-text">
                            <textarea
                                class="text-input"
                                bind:value={entry.text}
                                oninput={handleTextChange}
                                rows="2"
                                placeholder="Enter text..."
                            ></textarea>
                        </td>
                    </tr>
                {/each}

                {#if bottomSpacerHeight > 0}
                    <tr class="virtual-spacer" style="height: {bottomSpacerHeight}px;">
                        <td colspan="2"></td>
                    </tr>
                {/if}

                {#if filteredEntries.length === 0}
                    <tr>
                        <td colspan="2" class="empty-state">
                            {#if ptdData.entries.length === 0}
                                No text strings found in this file.
                            {:else}
                                No strings match "{searchQuery}"
                            {/if}
                        </td>
                    </tr>
                {/if}
            </tbody>
        </table>
    </div>

    <!-- Hidden JSON File Input -->
    <input
        type="file"
        accept=".json"
        onchange={importJSON}
        bind:this={fileInput}
        style="display: none;"
    />
</div>

<style>
    .ptd-editor {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background-color: var(--bg-app, #121217);
    }

    .ptd-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 16px;
        background-color: var(--bg-toolbar, #16161d);
        border-bottom: 1px solid var(--border-color, #2c2c38);
        flex-shrink: 0;
        gap: 12px;
        flex-wrap: wrap;
    }

    .toolbar-left,
    .toolbar-right {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .search-box {
        display: flex;
        align-items: center;
        background-color: var(--bg-app, #121217);
        border: 1px solid var(--border-color, #2c2c38);
        border-radius: 6px;
        padding: 4px 8px;
        gap: 6px;
        width: 240px;
    }

    .search-box input {
        border: none;
        outline: none;
        background: transparent;
        color: var(--text-color, #ededf2);
        font-size: 0.8rem;
        width: 100%;
    }

    .count-badge {
        font-size: 0.75rem;
        color: var(--text-muted, #9595a6);
    }

    .action-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border-radius: 6px;
        border: 1px solid var(--border-color, #2c2c38);
        background-color: var(--bg-button, #242430);
        color: var(--text-color, #ededf2);
        font-size: 0.78rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;
    }

    .action-btn:hover {
        background-color: var(--bg-button-hover, #2e2e3e);
        border-color: var(--accent-primary, #0063db);
    }

    .action-btn.primary {
        background-color: var(--accent-primary, #0063db);
        border-color: var(--accent-primary, #0063db);
        color: #ffffff;
    }

    .action-btn.primary:hover {
        background-color: var(--accent-hover, #0056bf);
    }

    .fallback-warning-banner {
        display: flex;
        align-items: center;
        gap: 10px;
        background-color: rgba(234, 179, 8, 0.15);
        border-bottom: 1px solid rgba(234, 179, 8, 0.35);
        color: #fbbf24;
        padding: 8px 16px;
        font-size: 0.8rem;
        line-height: 1.4;
        flex-shrink: 0;
    }

    .warning-icon {
        display: flex;
        align-items: center;
        color: #f59e0b;
        flex-shrink: 0;
    }

    .warning-content {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
    }

    .table-container {
        flex-grow: 1;
        overflow-y: auto;
        padding: 12px 16px;
        position: relative;
    }

    .strings-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.85rem;
    }

    .strings-table th {
        text-align: left;
        padding: 8px 12px;
        background-color: var(--bg-card, #1c1c24);
        color: var(--text-muted, #9595a6);
        border-bottom: 1px solid var(--border-color, #2c2c38);
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        position: sticky;
        top: -12px;
        z-index: 10;
    }

    .strings-table td {
        padding: 6px 12px;
        border-bottom: 1px solid var(--border-subtle, #242430);
        vertical-align: top;
    }

    .virtual-spacer td {
        padding: 0 !important;
        border: none !important;
        height: inherit;
    }

    .string-row {
        height: 72px;
        box-sizing: border-box;
    }

    .col-id {
        width: 180px;
    }

    .id-group {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .id-tag {
        display: inline-block;
        font-family: monospace;
        font-size: 0.75rem;
        color: #58a6ff;
        background-color: rgba(0, 99, 219, 0.15);
        padding: 2px 6px;
        border-radius: 4px;
        border: 1px solid rgba(0, 99, 219, 0.3);
        align-self: flex-start;
    }

    .key-name {
        font-family: monospace;
        font-size: 0.72rem;
        color: var(--text-muted, #9595a6);
        word-break: break-all;
    }

    .col-text {
        width: 100%;
    }

    .text-input {
        width: 100%;
        background-color: var(--bg-editor, #15151c);
        color: var(--text-color, #ededf2);
        border: 1px solid var(--border-color, #2c2c38);
        border-radius: 6px;
        padding: 6px 8px;
        font-family: inherit;
        font-size: 0.85rem;
        line-height: 1.4;
        resize: vertical;
        outline: none;
        box-sizing: border-box;
    }

    .text-input:focus {
        border-color: var(--accent-primary, #0063db);
    }

    .empty-state {
        padding: 32px;
        text-align: center;
        color: var(--text-muted, #9595a6);
    }
</style>
