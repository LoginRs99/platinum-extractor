<script lang="ts">
    import { onMount } from "svelte";
    import { ZoomIn, ZoomOut, Maximize2, Download, Image as ImageIcon } from "@lucide/svelte";
    import { WTATexture } from "../extract";

    let { texture, wtpFile }: {
        texture: WTATexture;
        wtpFile: ArrayBuffer | null;
    } = $props();

    let canvasContainer: HTMLDivElement | undefined = $state();
    let zoomLevel = $state(1);
    let isCheckerboard = $state(true);
    let errorMessage = $state<string | null>(null);
    let currentCanvas: HTMLCanvasElement | null = $state(null);
    let isRendering = $state(false);

    $effect(() => {
        if (texture && wtpFile) {
            renderTexture();
        }
    });

    async function renderTexture() {
        if (!wtpFile || wtpFile.byteLength === 0) {
            errorMessage = "WTP data buffer is empty or missing";
            return;
        }

        errorMessage = null;
        isRendering = true;

        try {
            // Create a slice of wtpFile to avoid any potential buffer detachment
            const wtpSlice = wtpFile.slice(0);
            
            const targetCanvas = document.createElement("canvas");
            targetCanvas.width = texture.width || 256;
            targetCanvas.height = texture.height || 256;
            targetCanvas.className = "rendered-canvas";

            const loadedCanvas: any = texture.load(wtpSlice, targetCanvas);
            
            if (canvasContainer && loadedCanvas) {
                canvasContainer.innerHTML = "";
                if (typeof HTMLCanvasElement !== "undefined" && loadedCanvas instanceof HTMLCanvasElement) {
                    currentCanvas = loadedCanvas;
                    canvasContainer.appendChild(loadedCanvas);
                } else if (typeof OffscreenCanvas !== "undefined" && loadedCanvas instanceof OffscreenCanvas) {
                    const displayCanvas = document.createElement("canvas");
                    displayCanvas.width = loadedCanvas.width;
                    displayCanvas.height = loadedCanvas.height;
                    displayCanvas.className = "rendered-canvas";
                    const ctx = displayCanvas.getContext("2d");
                    if (ctx) {
                        ctx.drawImage(loadedCanvas, 0, 0);
                    }
                    currentCanvas = displayCanvas;
                    canvasContainer.appendChild(displayCanvas);
                }
            }
        } catch (err: any) {
            console.error("Texture render failed:", err);
            errorMessage = err?.message || "Failed to decompress texture";
        } finally {
            isRendering = false;
        }
    }

    function downloadPNG() {
        if (!currentCanvas) return;
        try {
            const dataUrl = currentCanvas.toDataURL("image/png");
            const a = document.createElement("a");
            a.href = dataUrl;
            a.download = `texture_${texture.identifier || "0"}.png`;
            a.click();
        } catch (err) {
            console.error("PNG export error:", err);
        }
    }

    function downloadRaw() {
        if (!wtpFile) return;
        try {
            const wtpSlice = wtpFile.slice(0);
            const rawBuffer = texture.download(wtpSlice);
            const ext = texture._format?.includes("ASTC") ? "astc" : "dds";
            const blob = new Blob([rawBuffer], { type: "application/octet-stream" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `texture_${texture.identifier || "0"}.${ext}`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Raw texture export error:", err);
        }
    }

    function zoomIn() {
        zoomLevel = Math.min(zoomLevel * 1.25, 10);
    }

    function zoomOut() {
        zoomLevel = Math.max(zoomLevel / 1.25, 0.1);
    }

    function resetZoom() {
        zoomLevel = 1;
    }
</script>

<div class="texture-viewer-container">
    <div class="viewer-toolbar">
        <div class="meta-info">
            <span class="meta-badge format">{texture._format || "Unknown Format"}</span>
            <span class="meta-badge dims">{texture.width} &times; {texture.height}</span>
            <span class="meta-badge id">ID: 0x{texture.identifier}</span>
        </div>

        <div class="viewer-controls">
            <button class="ctrl-btn" onclick={() => isCheckerboard = !isCheckerboard} title="Toggle checkerboard background">
                <span>{isCheckerboard ? "Dark BG" : "Grid BG"}</span>
            </button>
            <button class="ctrl-btn icon" onclick={zoomOut} title="Zoom Out" aria-label="Zoom Out">
                <ZoomOut size={16} />
            </button>
            <button class="ctrl-btn text" onclick={resetZoom} title="Reset Zoom">
                <span>{Math.round(zoomLevel * 100)}%</span>
            </button>
            <button class="ctrl-btn icon" onclick={zoomIn} title="Zoom In" aria-label="Zoom In">
                <ZoomIn size={16} />
            </button>
            <button class="ctrl-btn primary" onclick={downloadPNG} title="Export as PNG image">
                <ImageIcon size={15} />
                <span>Export PNG</span>
            </button>
            <button class="ctrl-btn primary" onclick={downloadRaw} title="Export raw DDS/ASTC texture">
                <Download size={15} />
                <span>Export {texture._format?.includes("ASTC") ? "ASTC" : "DDS"}</span>
            </button>
        </div>
    </div>

    <div class="canvas-viewport" class:checkerboard={isCheckerboard}>
        {#if errorMessage}
            <div class="error-overlay">
                <p><strong>Texture Preview Error:</strong> {errorMessage}</p>
                <button class="ctrl-btn primary" onclick={downloadRaw}>
                    <Download size={14} />
                    <span>Download Raw File Anyway</span>
                </button>
            </div>
        {/if}
        <div
            class="canvas-wrapper"
            style="transform: scale({zoomLevel});"
            bind:this={canvasContainer}
        ></div>
    </div>
</div>

<style>
    .texture-viewer-container {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background-color: var(--viewer-bg, #111116);
    }

    .viewer-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 14px;
        background-color: var(--toolbar-bg, #18181f);
        border-bottom: 1px solid var(--border-color, #2e2e36);
        gap: 12px;
        flex-wrap: wrap;
    }

    .meta-info {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .meta-badge {
        padding: 3px 8px;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 600;
        font-family: monospace;
    }

    .meta-badge.format {
        background-color: rgba(0, 99, 219, 0.2);
        color: #58a6ff;
        border: 1px solid rgba(0, 99, 219, 0.4);
    }

    .meta-badge.dims {
        background-color: rgba(87, 242, 135, 0.15);
        color: #57f287;
    }

    .meta-badge.id {
        background-color: var(--card-bg, #262630);
        color: var(--text-muted, #8b8b99);
    }

    .viewer-controls {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .ctrl-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 5px 10px;
        border-radius: 5px;
        border: 1px solid var(--border-color, #333340);
        background-color: var(--button-bg, #22222c);
        color: var(--text-color, #e0e0e8);
        font-size: 0.75rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;
    }

    .ctrl-btn:hover {
        background-color: var(--button-hover-bg, #2c2c3a);
        border-color: var(--accent-color, #5865f2);
    }

    .ctrl-btn.primary {
        background-color: #0063db;
        border-color: #0056bf;
        color: #ffffff;
    }

    .ctrl-btn.primary:hover {
        background-color: #0056bf;
    }

    .ctrl-btn.icon {
        padding: 5px;
    }

    .canvas-viewport {
        position: relative;
        flex-grow: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: auto;
        padding: 24px;
        background-color: #16161b;
    }

    .canvas-viewport.checkerboard {
        background-color: #18181f;
        background-image: linear-gradient(45deg, #202028 25%, transparent 25%),
                          linear-gradient(-45deg, #202028 25%, transparent 25%),
                          linear-gradient(45deg, transparent 75%, #202028 75%),
                          linear-gradient(-45deg, transparent 75%, #202028 75%);
        background-size: 20px 20px;
        background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
    }

    .canvas-wrapper {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.1s ease-out;
        transform-origin: center center;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    }

    :global(.rendered-canvas) {
        display: block;
        max-width: none;
        image-rendering: pixelated;
        border-radius: 4px;
    }

    .error-overlay {
        position: absolute;
        top: 24px;
        background-color: rgba(237, 66, 69, 0.9);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 10;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
    }
</style>