<script lang="ts">
    import { X } from "@lucide/svelte";
    import { loadedComponentIndex, componentTabs, type Tab } from "../MainStore";

    interface Props {
        i: number;
        tab: Tab;
    }

    let { i, tab }: Props = $props();

    let isUnsaved = $derived(tab.unsaved);
    let isUnchanged = $derived(tab.unchanged);

    function removeComponent(e?: Event) {
        if (e) e.stopPropagation();

        if (tab.unsaved && $isUnsaved) {
            if (!confirm(`"${tab.name}" has unsaved changes. Are you sure you want to close it?`)) {
                return;
            }
        }

        const prevIdx = $loadedComponentIndex;
        $componentTabs = $componentTabs.filter((_, index) => i !== index);
        
        if (i <= prevIdx) {
            $loadedComponentIndex = Math.max(0, prevIdx - 1);
        }
    }

    function handleMouseDown(e: MouseEvent) {
        // Middle mouse click closes tab
        if (e.button === 1) {
            e.preventDefault();
            removeComponent();
        }
    }

    function handleKeyDown(e: KeyboardEvent) {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            $loadedComponentIndex = i;
        } else if (e.key === "Delete" || (e.ctrlKey && e.key === "w")) {
            e.preventDefault();
            removeComponent();
        }
    }
</script>

<div
    class="main-tab"
    class:active={$loadedComponentIndex === i}
    class:unsaved={$isUnsaved}
    class:unchanged={$isUnchanged}
    onclick={() => $loadedComponentIndex = i}
    onmousedown={handleMouseDown}
    onkeydown={handleKeyDown}
    role="tab"
    tabindex="0"
    aria-selected={$loadedComponentIndex === i}
    title={tab.name}
>
    <span class="tab-title">{tab.name}</span>

    {#if $isUnsaved}
        <span class="unsaved-dot" title="Unsaved changes"></span>
    {/if}

    <button
        type="button"
        class="tab-close-btn"
        onclick={removeComponent}
        title="Close tab"
        aria-label={`Close ${tab.name} tab`}
    >
        <X size={13} />
    </button>
</div>

<style>
    .main-tab {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 6px 12px;
        background-color: var(--bg-toolbar, #16161d);
        border: none;
        border-right: 1px solid var(--border-color, #2c2c38);
        border-bottom: 2px solid transparent;
        color: var(--text-muted, #9595a6);
        cursor: pointer;
        user-select: none;
        white-space: nowrap;
        height: 100%;
        box-sizing: border-box;
        font-size: 0.8rem;
        font-family: inherit;
        transition: all 0.1s ease;
        outline: none;
    }

    .main-tab:hover {
        background-color: var(--bg-card-subtle, #22222c);
        color: var(--text-color, #ededf2);
    }

    .main-tab.active {
        background-color: var(--bg-app, #121217);
        color: var(--text-color, #ededf2);
        border-bottom-color: var(--accent-primary, #0063db);
        font-weight: 500;
    }

    .main-tab:focus-visible {
        outline: 2px solid var(--accent-primary, #0063db) !important;
        outline-offset: -2px !important;
    }

    .main-tab.unchanged {
        font-style: italic;
    }

    .tab-title {
        max-width: 180px;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .unsaved-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background-color: #58a6ff;
        flex-shrink: 0;
    }

    .tab-close-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 18px;
        height: 18px;
        border-radius: 4px;
        border: none;
        background: transparent;
        color: var(--text-dim, #6d6d80);
        cursor: pointer;
        padding: 0;
        opacity: 0.6;
        transition: all 0.1s ease;
    }

    .main-tab:hover .tab-close-btn,
    .main-tab.active .tab-close-btn {
        opacity: 1;
    }

    .tab-close-btn:hover {
        background-color: var(--danger-bg, rgba(248, 81, 73, 0.2));
        color: var(--danger, #f85149);
    }
</style>