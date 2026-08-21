<script lang="ts">
    import { Search, Download, Upload, Save, FileText, Check, Plus, Trash2 } from "@lucide/svelte";
    import type { FileData, PTDEntry } from "./extract";
    import repack from "./repack";

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
        version: 1,
        sections: [{ sectionId: 0, name: "MainText", entries: [] }]
    });

    $effect(() => {
        if (data && data.sections) {
            ptdData = data;
        }
    });

    let searchQuery = $state("");
    let fileInput: HTMLInputElement | undefined = $state();

    let allEntries = $derived(
        ptdData.sections.flatMap(s => s.entries)
    );

    let filteredEntries = $derived(
        allEntries.filter(entry => {
            if (!searchQuery.trim()) return true;
            const query = searchQuery.toLowerCase();
            return (
                String(entry.id).includes(query) ||
                (entry.text || "").toLowerCase().includes(query)
            );
        })
    );

    export function save(): FileData {
        setUnsavedChanges(false);
        return $state.snapshot(ptdData);
    }

    function handleTextChange() {
        setUnsavedChanges(true);
    }

    function exportJSON() {
        const jsonContent = JSON.stringify(ptdData, null, 2);
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
                if (parsed && Array.isArray(parsed.sections)) {
                    ptdData = parsed;
                } else if (parsed && Array.isArray(parsed.entries)) {
                    ptdData = {
                        magic: "PTD\0",
                        version: 1,
                        sections: [{ sectionId: 0, name: "MainText", entries: parsed.entries }]
                    };
                }
                setUnsavedChanges(true);
            } catch (err) {
                alert("Failed to parse JSON file: " + String(err));
            }
            target.value = "";
        };
        reader.readAsText(file);
    }

    async function downloadRepackedBIN() {
        const buffer = await repack($state.snapshot(ptdData));
        const blob = new Blob([buffer], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = name.endsWith(".bin") ? name : `${name}.bin`;
        a.click();
        URL.revokeObjectURL(url);
    }
</script>

<div class="ptd-editor">
    <header class="ptd-toolbar">
        <div class="toolbar-left">
            <div class="search-box">
                <Search size={14} class="search-icon" />
                <input
                    type="text"
                    placeholder="Search strings or ID..."
                    bind:value={searchQuery}
                    aria-label="Filter text"
                />
            </div>
            <span class="count-badge">{filteredEntries.length} of {allEntries.length} strings</span>
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

    <div class="table-container">
        <table class="strings-table">
            <thead>
                <tr>
                    <th class="col-id">ID</th>
                    <th class="col-text">Text / Translation Content</th>
                </tr>
            </thead>
            <tbody>
                {#each filteredEntries as entry (entry.id)}
                    <tr>
                        <td class="col-id">
                            <span class="id-tag">#{entry.id}</span>
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
                {#if filteredEntries.length === 0}
                    <tr>
                        <td colspan="2" class="empty-state">
                            No strings match "{searchQuery}"
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
        width: 220px;
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

    .table-container {
        flex-grow: 1;
        overflow-y: auto;
        padding: 12px 16px;
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
        top: 0;
        z-index: 10;
    }

    .strings-table td {
        padding: 6px 12px;
        border-bottom: 1px solid var(--border-subtle, #242430);
        vertical-align: top;
    }

    .col-id {
        width: 90px;
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
