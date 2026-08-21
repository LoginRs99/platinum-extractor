<script lang="ts">
    import { Package, ShieldCheck, Zap, Layers, Sparkles, FileCode, Cpu } from "@lucide/svelte";
</script>

<div class="welcome-container">
    <div class="welcome-card">
        <header class="welcome-hero">
            <div class="hero-badge">
                <Package size={36} />
            </div>
            <div class="version-tag">v2.0 Modernized Edition</div>
            <h1>Platinum Extractor</h1>
            <p class="tagline">
                Fast, 100% client-side game archive extractor & modding tool for PlatinumGames titles.
            </p>
        </header>

        <div class="features-grid">
            <div class="feature-item">
                <div class="feature-icon"><Zap size={20} /></div>
                <div>
                    <h4>100% Client-Side</h4>
                    <p>All decompression and parsing happens locally in WebAssembly & Web Workers. No files are ever uploaded.</p>
                </div>
            </div>
            <div class="feature-item">
                <div class="feature-icon"><Layers size={20} /></div>
                <div>
                    <h4>Archive & Container Formats</h4>
                    <p>Extract and repack DAT, DTT, EVN, PKZ (Zstandard / Oodle Kraken), and BXM binary XML trees.</p>
                </div>
            </div>
            <div class="feature-item">
                <div class="feature-icon"><Cpu size={20} /></div>
                <div>
                    <h4>WebGL Texture Previews</h4>
                    <p>Full hardware-accelerated preview of ASTC & DDS textures with Tegra X1 deswizzling for Switch dumps.</p>
                </div>
            </div>
            <div class="feature-item">
                <div class="feature-icon"><ShieldCheck size={20} /></div>
                <div>
                    <h4>18 Games Supported</h4>
                    <p>Astral Chain, NieR:Automata, NieR Replicant, Bayonetta 1–3, Metal Gear Rising, Vanquish, and more.</p>
                </div>
            </div>
        </div>

        <div class="quick-start-box">
            <h3>Quick Start</h3>
            <p>Drag and drop any game file (<code>.dat</code>, <code>.pkz</code>, <code>.wta</code>, <code>.bxm</code>, <code>.csv</code>) onto this window to begin extracting.</p>
        </div>

        <footer class="welcome-footer">
            <p>Special thanks to the Astral Chain and NieR modding communities.</p>
            <p class="credits">
                Credits: Kerilk's <em>bayonetta_tools</em> &bull; kohos' <em>CriTools</em> &bull; Icons by Icons8 &bull; PlatinumGames
            </p>
        </footer>
    </div>
</div>

<style>
    .welcome-container {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        padding: 24px;
        box-sizing: border-box;
        overflow-y: auto;
    }

    .welcome-card {
        max-width: 720px;
        width: 100%;
        background-color: var(--bg-card, #1c1c24);
        border: 1px solid var(--border-color, #2c2c38);
        border-radius: 14px;
        padding: 36px 40px;
        box-shadow: 0 12px 36px rgba(0, 0, 0, 0.4);
        display: flex;
        flex-direction: column;
        gap: 28px;
    }

    .welcome-hero {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
    }

    .hero-badge {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 68px;
        height: 68px;
        border-radius: 16px;
        background: linear-gradient(135deg, #0063db, #0049a3);
        color: #ffffff;
        box-shadow: 0 6px 20px rgba(0, 99, 219, 0.35);
        margin-bottom: 16px;
    }

    .version-tag {
        font-size: 0.72rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #58a6ff;
        background-color: rgba(0, 99, 219, 0.15);
        padding: 3px 10px;
        border-radius: 20px;
        border: 1px solid rgba(0, 99, 219, 0.3);
        margin-bottom: 8px;
    }

    h1 {
        margin: 0;
        font-size: 2rem;
        font-weight: 800;
        letter-spacing: -0.02em;
        color: var(--text-color, #ededf2);
    }

    .tagline {
        margin: 8px 0 0 0;
        font-size: 0.95rem;
        color: var(--text-muted, #9595a6);
        max-width: 520px;
        line-height: 1.5;
    }

    .features-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 16px;
    }

    .feature-item {
        display: flex;
        gap: 12px;
        padding: 14px;
        background-color: var(--bg-card-subtle, #22222c);
        border: 1px solid var(--border-subtle, #282836);
        border-radius: 10px;
    }

    .feature-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border-radius: 8px;
        background-color: rgba(0, 99, 219, 0.15);
        color: #58a6ff;
        flex-shrink: 0;
    }

    .feature-item h4 {
        margin: 0 0 4px 0;
        font-size: 0.88rem;
        color: var(--text-color, #ededf2);
    }

    .feature-item p {
        margin: 0;
        font-size: 0.78rem;
        color: var(--text-muted, #9595a6);
        line-height: 1.4;
    }

    .quick-start-box {
        background: linear-gradient(135deg, rgba(0, 99, 219, 0.1), transparent);
        border: 1px solid rgba(0, 99, 219, 0.25);
        border-radius: 10px;
        padding: 16px 20px;
    }

    .quick-start-box h3 {
        margin: 0 0 6px 0;
        font-size: 0.9rem;
        color: #58a6ff;
    }

    .quick-start-box p {
        margin: 0;
        font-size: 0.82rem;
        color: var(--text-muted, #9595a6);
        line-height: 1.4;
    }

    .quick-start-box code {
        background-color: rgba(0, 0, 0, 0.3);
        padding: 2px 6px;
        border-radius: 4px;
        font-family: monospace;
        color: var(--text-color, #ededf2);
    }

    .welcome-footer {
        border-top: 1px solid var(--border-subtle, #282836);
        padding-top: 16px;
        text-align: center;
    }

    .welcome-footer p {
        margin: 4px 0;
        font-size: 0.75rem;
        color: var(--text-dim, #6d6d80);
    }

    .credits {
        font-size: 0.7rem;
    }
</style>