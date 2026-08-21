<script lang="ts">
    import { Compass, FileCode, FileText, ChevronRight, Layers, Sparkles } from "@lucide/svelte";
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

    let fileList = $derived(Object.values(files || {}));

    let questDataFile = $derived(
        fileList.find(f => f.baseName === "QuestData.bxm" || f.name.endsWith("QuestData.bxm"))
    );

    let bezierDataFile = $derived(
        fileList.find(f => f.baseName === "BezierData.bxm" || f.name.endsWith("BezierData.bxm"))
    );

    let dialogueFiles = $derived(
        fileList.filter(f => f.baseName.includes("Talk") || f.baseName.includes("Speech") || f.baseName.includes("Subtitle"))
    );

    let tableFiles = $derived(
        fileList.filter(f => f.baseName.endsWith(".csv") && !f.baseName.includes("Talk") && !f.baseName.includes("Speech") && !f.baseName.includes("Subtitle"))
    );

    let otherFiles = $derived(
        fileList.filter(f => f !== questDataFile && f !== bezierDataFile && !dialogueFiles.includes(f) && !tableFiles.includes(f))
    );

    function openFile(file: PlatinumFile) {
        if (fileHandler) {
            fileHandler.openFile(file);
        }
    }
</script>

<div class="quest-visualizer">
    <header class="quest-header">
        <div class="quest-title-area">
            <div class="quest-badge">
                <Compass size={24} />
            </div>
            <div>
                <h2>Astral Chain Quest: {name}</h2>
                <p class="subtitle">Complete logic archive &bull; {fileList.length} files detected</p>
            </div>
        </div>
    </header>

    <div class="quest-grid">
        <!-- Core Mission Logic -->
        <section class="quest-section">
            <div class="section-title">
                <Layers size={18} class="text-accent" />
                <h3>Core Mission Logic</h3>
            </div>
            <div class="cards-list">
                {#if questDataFile}
                    <button class="file-card primary" onclick={() => openFile(questDataFile)}>
                        <div class="file-icon-box">
                            <FileCode size={20} />
                        </div>
                        <div class="card-info">
                            <span class="card-name">QuestData.bxm</span>
                            <span class="card-desc">Main quest state machine, stages & mission flow</span>
                        </div>
                        <ChevronRight size={16} class="arrow" />
                    </button>
                {/if}

                {#if bezierDataFile}
                    <button class="file-card" onclick={() => openFile(bezierDataFile)}>
                        <div class="file-icon-box">
                            <FileCode size={20} />
                        </div>
                        <div class="card-info">
                            <span class="card-name">BezierData.bxm</span>
                            <span class="card-desc">Camera paths, spline curves & animation anchors</span>
                        </div>
                        <ChevronRight size={16} class="arrow" />
                    </button>
                {/if}
            </div>
        </section>

        <!-- Dialogue & Scripts -->
        {#if dialogueFiles.length > 0}
            <section class="quest-section">
                <div class="section-title">
                    <Sparkles size={18} class="text-success" />
                    <h3>Dialogue & Scripts ({dialogueFiles.length})</h3>
                </div>
                <div class="cards-list scrollable">
                    {#each dialogueFiles as file}
                        <button class="file-card" onclick={() => openFile(file)}>
                            <div class="file-icon-box">
                                {#if file.baseName.endsWith(".bxm")}
                                    <FileCode size={18} />
                                {:else}
                                    <FileText size={18} />
                                {/if}
                            </div>
                            <div class="card-info">
                                <span class="card-name">{file.baseName}</span>
                                <span class="card-desc">Dialogue triggers and script text</span>
                            </div>
                            <ChevronRight size={16} class="arrow" />
                        </button>
                    {/each}
                </div>
            </section>
        {/if}

        <!-- Configuration & Balance Tables -->
        {#if tableFiles.length > 0}
            <section class="quest-section">
                <div class="section-title">
                    <FileText size={18} class="text-info" />
                    <h3>Tables & Loot Balance ({tableFiles.length})</h3>
                </div>
                <div class="cards-list">
                    {#each tableFiles as file}
                        <button class="file-card" onclick={() => openFile(file)}>
                            <div class="file-icon-box">
                                <FileText size={18} />
                            </div>
                            <div class="card-info">
                                <span class="card-name">{file.baseName}</span>
                                <span class="card-desc">Loot drops, mission rewards & configuration</span>
                            </div>
                            <ChevronRight size={16} class="arrow" />
                        </button>
                    {/each}
                </div>
            </section>
        {/if}

        <!-- Other Files -->
        {#if otherFiles.length > 0}
            <section class="quest-section">
                <div class="section-title">
                    <Layers size={18} class="text-muted" />
                    <h3>Additional Assets ({otherFiles.length})</h3>
                </div>
                <div class="cards-list">
                    {#each otherFiles as file}
                        <button class="file-card" onclick={() => openFile(file)}>
                            <div class="file-icon-box">
                                <FileCode size={18} />
                            </div>
                            <div class="card-info">
                                <span class="card-name">{file.baseName}</span>
                                <span class="card-desc">{file.resolvedType || "Asset file"}</span>
                            </div>
                            <ChevronRight size={16} class="arrow" />
                        </button>
                    {/each}
                </div>
            </section>
        {/if}
    </div>
</div>

<style>
    .quest-visualizer {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        overflow-y: auto;
        padding: 24px;
        box-sizing: border-box;
        gap: 20px;
        background-color: var(--bg-color, #14141a);
    }

    .quest-header {
        background: linear-gradient(135deg, rgba(0, 99, 219, 0.15) 0%, rgba(20, 20, 26, 0.8) 100%);
        border: 1px solid var(--border-color, #2e2e3a);
        border-radius: 12px;
        padding: 20px 24px;
    }

    .quest-title-area {
        display: flex;
        align-items: center;
        gap: 16px;
    }

    .quest-badge {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 48px;
        height: 48px;
        border-radius: 10px;
        background-color: #0063db;
        color: #ffffff;
    }

    h2 {
        margin: 0;
        font-size: 1.35rem;
        color: var(--text-color, #f0f0f5);
    }

    .subtitle {
        margin: 4px 0 0 0;
        font-size: 0.85rem;
        color: var(--text-muted, #8b8b99);
    }

    .quest-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        gap: 16px;
    }

    .quest-section {
        display: flex;
        flex-direction: column;
        background-color: var(--card-bg, #1a1a22);
        border: 1px solid var(--border-color, #2a2a36);
        border-radius: 10px;
        padding: 16px;
        gap: 12px;
    }

    .section-title {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .section-title h3 {
        margin: 0;
        font-size: 0.95rem;
        color: var(--text-color, #e0e0e8);
    }

    .cards-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .cards-list.scrollable {
        max-height: 280px;
        overflow-y: auto;
    }

    .file-card {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 14px;
        background-color: var(--bg-dark, #131318);
        border: 1px solid var(--border-color, #262632);
        border-radius: 8px;
        color: var(--text-color, #d4d4dc);
        cursor: pointer;
        text-align: left;
        width: 100%;
        box-sizing: border-box;
        transition: all 0.15s ease;
    }

    .file-card:hover {
        background-color: var(--hover-bg, #22222d);
        border-color: var(--accent-color, #0063db);
        transform: translateX(2px);
    }

    .file-card.primary {
        background-color: rgba(0, 99, 219, 0.08);
        border-color: rgba(0, 99, 219, 0.3);
    }

    .file-card.primary:hover {
        background-color: rgba(0, 99, 219, 0.15);
        border-color: #0063db;
    }

    .file-icon-box {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 6px;
        background-color: rgba(255, 255, 255, 0.04);
        color: #58a6ff;
        flex-shrink: 0;
    }

    .card-info {
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        gap: 2px;
        overflow: hidden;
    }

    .card-name {
        font-family: monospace;
        font-weight: 600;
        font-size: 0.85rem;
    }

    .card-desc {
        font-size: 0.75rem;
        color: var(--text-muted, #8b8b99);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    :global(.arrow) {
        color: var(--text-dim, #555566);
        flex-shrink: 0;
    }

    :global(.text-accent) {
        color: #0063db;
    }
</style>