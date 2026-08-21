<script lang="ts">
    import { Loader2 } from "@lucide/svelte";

    let { size = 20, class: className = "" }: { size?: number; class?: string } = $props();
</script>

<span class="loading-spinner {className}" role="status" aria-label="Loading">
    <Loader2 {size} class="spin" />
</span>

<style>
    .loading-spinner {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: var(--accent-primary, #0063db);
    }

    :global(.spin) {
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
</style>