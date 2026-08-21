<script lang="ts">
    import type FileHandler from "../../lib/FileHandler";
    import type { PlatinumFile } from "../../lib/FileHandler";

    let {
        name,
        files = {},
        fileHandler,
        setUnsavedChanges = () => {}
    }: {
        name: string;
        files: Record<string, PlatinumFile>;
        fileHandler?: FileHandler;
        setUnsavedChanges?: (value: boolean) => void;
    } = $props();
</script>

<div class="base-visualizer">
    <h2>Visualizer: {name}</h2>
    <div class="files-grid">
        {#each Object.keys(files) as fileName}
            <div class="file-item">
                <span>{files[fileName].name}</span>
            </div>
        {/each}
    </div>
</div>

<style>
    .base-visualizer {
        padding: 24px;
        color: var(--text-color, #e0e0e8);
    }
    .files-grid {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 16px;
    }
    .file-item {
        padding: 8px 12px;
        background-color: var(--card-bg, #1e1e24);
        border: 1px solid var(--border-color, #2e2e36);
        border-radius: 6px;
        font-family: monospace;
    }
</style>