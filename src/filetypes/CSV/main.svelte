<script lang="ts">
    import { Table, FileText, Download, CheckCircle2 } from "@lucide/svelte";
    import CodeEditor from "../../components/Common/CodeEditor.svelte";
    import repackCSV from "./repack";
    import type { FileData } from "./extract";

    let {
        name,
        data,
        setUnsavedChanges = () => {}
    }: {
        name: string;
        data: FileData;
        fileHandler?: any;
        setUnsavedChanges?: (value: boolean) => void;
    } = $props();

    let viewMode: "table" | "code" = $state("table");

    function toCSVString(rows: string[][]): string {
        if (!rows || rows.length === 0) return "";
        return rows.map(row => row.join(",")).join("\n");
    }

    function parseCSVString(text: string): string[][] {
        if (!text.trim()) return [];
        return text.split(/\r?\n/).map(line => line.split(","));
    }

    let csvText = $state("");
    let tableRows = $state<string[][]>([]);
    let isInitialized = $state(false);

    $effect(() => {
        if (data && data.data && !isInitialized) {
            tableRows = JSON.parse(JSON.stringify(data.data));
            csvText = toCSVString(tableRows);
            isInitialized = true;
        }
    });

    function handleCodeChange(newText: string) {
        csvText = newText;
        tableRows = parseCSVString(newText);
        setUnsavedChanges(true);
    }

    function handleCellEdit(rowIndex: number, colIndex: number, event: Event) {
        const target = event.target as HTMLInputElement;
        tableRows[rowIndex][colIndex] = target.value;
        csvText = toCSVString(tableRows);
        setUnsavedChanges(true);
    }

    export function save(): FileData | false {
        const rows = parseCSVString(csvText);
        return { data: rows };
    }

    async function downloadCSVFile() {
        const saved = save();
        if (!saved) return;
        const arrayBuffer = await repackCSV(saved);
        const blob = new Blob([arrayBuffer], { type: "text/csv;charset=shift_jis" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = name.endsWith(".csv") ? name : `${name}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }
</script>

<div class="csv-editor">
    <header class="editor-header">
        <div class="view-toggle">
            <button
                class="toggle-btn"
                class:active={viewMode === "table"}
                onclick={() => { viewMode = "table"; tableRows = parseCSVString(csvText); }}
                title="Spreadsheet Table View"
            >
                <Table size={15} />
                <span>Table</span>
            </button>
            <button
                class="toggle-btn"
                class:active={viewMode === "code"}
                onclick={() => { viewMode = "code"; csvText = toCSVString(tableRows); }}
                title="Raw CSV Text Editor"
            >
                <FileText size={15} />
                <span>Raw Text</span>
            </button>
        </div>

        <div class="stats-info">
            <CheckCircle2 size={16} class="text-success" />
            <span>{tableRows.length} rows &bull; {tableRows[0]?.length || 0} columns</span>
        </div>

        <div class="actions">
            <button class="action-btn primary" onclick={downloadCSVFile} title="Download SHIFT-JIS CSV">
                <Download size={15} />
                <span>Download CSV</span>
            </button>
        </div>
    </header>

    <div class="editor-body">
        {#if viewMode === "table"}
            <div class="table-container">
                <table class="csv-table">
                    <thead>
                        <tr>
                            <th class="row-index-header">#</th>
                            {#if tableRows.length > 0}
                                {#each tableRows[0] as _, cIndex}
                                    <th>Col {cIndex + 1}</th>
                                {/each}
                            {/if}
                        </tr>
                    </thead>
                    <tbody>
                        {#each tableRows as row, rIndex}
                            <tr>
                                <td class="row-index">{rIndex + 1}</td>
                                {#each row as cell, cIndex}
                                    <td class="cell">
                                        <input
                                            type="text"
                                            value={cell}
                                            oninput={(e) => handleCellEdit(rIndex, cIndex, e)}
                                            aria-label={`Row ${rIndex + 1}, Column ${cIndex + 1}`}
                                        />
                                    </td>
                                {/each}
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        {:else}
            <CodeEditor
                value={csvText}
                language="csv"
                onchange={handleCodeChange}
            />
        {/if}
    </div>
</div>

<style>
    .csv-editor {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        padding: 12px;
        box-sizing: border-box;
        gap: 10px;
    }

    .editor-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 14px;
        background-color: var(--card-bg, #1e1e24);
        border: 1px solid var(--border-color, #2e2e36);
        border-radius: 8px;
        gap: 12px;
    }

    .view-toggle {
        display: flex;
        align-items: center;
        background-color: var(--bg-dark, #141418);
        padding: 3px;
        border-radius: 6px;
        border: 1px solid var(--border-color, #2e2e36);
    }

    .toggle-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: 4px;
        border: none;
        background: transparent;
        color: var(--text-muted, #8b8b99);
        font-size: 0.8rem;
        cursor: pointer;
        transition: all 0.15s ease;
    }

    .toggle-btn.active {
        background-color: var(--accent-color, #0063db);
        color: #ffffff;
        font-weight: 500;
    }

    .stats-info {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 0.8rem;
        color: var(--text-muted, #8b8b99);
    }

    .action-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border-radius: 6px;
        border: 1px solid var(--border-color, #3a3a48);
        background-color: var(--button-bg, #272732);
        color: var(--text-color, #e0e0e8);
        font-size: 0.8rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;
    }

    .action-btn.primary {
        background-color: #0063db;
        border-color: #0056bf;
        color: #ffffff;
    }

    .action-btn.primary:hover {
        background-color: #0056bf;
    }

    .editor-body {
        flex-grow: 1;
        height: calc(100% - 58px);
        overflow: hidden;
    }

    .table-container {
        width: 100%;
        height: 100%;
        overflow: auto;
        border: 1px solid var(--border-color, #2e2e36);
        border-radius: 8px;
        background-color: var(--editor-bg, #1a1a1f);
    }

    .csv-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.85rem;
        font-family: inherit;
    }

    .csv-table th {
        position: sticky;
        top: 0;
        background-color: var(--toolbar-bg, #141418);
        color: var(--text-muted, #8b8b99);
        padding: 8px 12px;
        border-bottom: 1px solid var(--border-color, #2e2e36);
        border-right: 1px solid var(--border-color, #2e2e36);
        text-align: left;
        font-weight: 600;
        z-index: 2;
    }

    .row-index-header,
    .row-index {
        width: 40px;
        text-align: center !important;
        background-color: var(--gutter-bg, #16161b) !important;
        color: var(--line-num-color, #555566);
        user-select: none;
        position: sticky;
        left: 0;
        z-index: 1;
    }

    .csv-table td {
        border-bottom: 1px solid var(--border-color, #24242e);
        border-right: 1px solid var(--border-color, #24242e);
        padding: 0;
    }

    .cell input {
        width: 100%;
        padding: 6px 10px;
        border: none;
        outline: none;
        background: transparent;
        color: var(--text-color, #d4d4d8);
        font-family: inherit;
        font-size: 0.85rem;
        box-sizing: border-box;
    }

    .cell input:focus {
        background-color: rgba(88, 166, 255, 0.1);
        box-shadow: inset 0 0 0 1px #58a6ff;
    }
</style>