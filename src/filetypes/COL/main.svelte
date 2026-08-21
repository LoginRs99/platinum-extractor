<script lang="ts">
    import { Box, ExternalLink } from "@lucide/svelte";
    import type { FileData } from "./extract";

    let { name, data }: {
        name: string;
        data?: FileData;
        fileHandler?: any;
        setUnsavedChanges?: (value: boolean) => void;
    } = $props();

    export function save(): FileData | false {
        return false;
    }
</script>

<div class="col-container">
    <div class="col-card">
        <div class="icon-wrapper">
            <Box size={48} class="col-icon" />
        </div>
        <h2>Collision Map File: {name}</h2>
        <p class="description">
            Platinum Games collision maps (<code>COL2</code>) contain 3D mesh physics, walkmesh boundaries, and trigger volumes.
        </p>
        <div class="info-box">
            <h3>Editing with Blender</h3>
            <p>
                To view and edit collision models in full 3D, use the official open-source Blender add-on <strong>NieR2Blender2NieR</strong>.
            </p>
            <a
                href="https://github.com/cabalex/NieR2Blender2NieR"
                rel="noopener noreferrer"
                target="_blank"
                class="download-btn"
            >
                <ExternalLink size={16} />
                <span>Get NieR2Blender2NieR Add-on</span>
            </a>
        </div>
    </div>
</div>

<style>
    .col-container {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        padding: 24px;
        box-sizing: border-box;
    }

    .col-card {
        max-width: 520px;
        background-color: var(--card-bg, #1e1e24);
        border: 1px solid var(--border-color, #2e2e36);
        border-radius: 12px;
        padding: 32px;
        text-align: center;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    }

    .icon-wrapper {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 80px;
        height: 80px;
        border-radius: 50%;
        background-color: rgba(0, 99, 219, 0.15);
        color: #0063db;
        margin-bottom: 16px;
    }

    h2 {
        margin: 0 0 12px 0;
        font-size: 1.25rem;
        color: var(--text-color, #f0f0f5);
    }

    .description {
        color: var(--text-muted, #8b8b99);
        font-size: 0.9rem;
        line-height: 1.5;
        margin-bottom: 24px;
    }

    .info-box {
        background-color: var(--bg-dark, #141418);
        border: 1px solid var(--border-color, #2e2e36);
        border-radius: 8px;
        padding: 20px;
        text-align: left;
    }

    .info-box h3 {
        margin: 0 0 8px 0;
        font-size: 0.95rem;
        color: var(--text-color, #f0f0f5);
    }

    .info-box p {
        margin: 0 0 16px 0;
        font-size: 0.85rem;
        color: var(--text-muted, #8b8b99);
        line-height: 1.4;
    }

    .download-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        background-color: #0063db;
        color: #ffffff;
        text-decoration: none;
        border-radius: 6px;
        font-size: 0.85rem;
        font-weight: 500;
        transition: background-color 0.15s ease;
    }

    .download-btn:hover {
        background-color: #0056bf;
    }
</style>