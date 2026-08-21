<script lang="ts">
    import { ChevronLeft, ChevronRight } from "@lucide/svelte";
    import Unloaded from "./Unloaded.svelte";
    import { componentTabs } from "./MainStore";
    import MainTab from "./components/MainTab.svelte";
    import MainBody from "./components/MainBody.svelte";
    import type FileHandler from "../../lib/FileHandler";

    let { fileHandler }: { fileHandler: FileHandler } = $props();

    let tabsHeader: HTMLElement | undefined = $state();

    function handleTabsScroll(e: WheelEvent) {
        if (tabsHeader) {
            tabsHeader.scrollLeft += e.deltaY;
        }
    }

    function scrollTabsLeft() {
        if (tabsHeader) {
            tabsHeader.scrollBy({ left: -150, behavior: "smooth" });
        }
    }

    function scrollTabsRight() {
        if (tabsHeader) {
            tabsHeader.scrollBy({ left: 150, behavior: "smooth" });
        }
    }
</script>

<div class="main-workspace">
    {#if $componentTabs.length > 0}
        <div class="tabs-bar">
            <header
                class="tabs-container"
                bind:this={tabsHeader}
                onwheel={handleTabsScroll}
                role="tablist"
                aria-label="Open files tabs"
            >
                {#each $componentTabs as tab, i (tab.name + i)}
                    <MainTab {i} {tab} />
                {/each}
            </header>
        </div>

        <div class="workspace-body">
            {#each $componentTabs as tab, i (tab.name + i)}
                <MainBody {i} {tab} {fileHandler} />
            {/each}
        </div>
    {:else}
        <main class="empty-workspace">
            <Unloaded />
        </main>
    {/if}
</div>

<style>
    .main-workspace {
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        height: 100%;
        width: 100%;
        overflow: hidden;
        background-color: var(--bg-app, #121217);
    }

    .tabs-bar {
        display: flex;
        align-items: center;
        height: var(--header-height, 48px);
        background-color: var(--bg-toolbar, #16161d);
        border-bottom: 1px solid var(--border-color, #2c2c38);
        flex-shrink: 0;
        overflow: hidden;
    }

    .tabs-container {
        display: flex;
        align-items: stretch;
        height: 100%;
        flex-grow: 1;
        overflow-x: auto;
        overflow-y: hidden;
    }

    .tabs-container::-webkit-scrollbar {
        height: 2px;
    }

    .tabs-container::-webkit-scrollbar-thumb {
        background-color: var(--border-color, #2c2c38);
    }

    .workspace-body {
        flex-grow: 1;
        height: calc(100% - var(--header-height, 48px));
        overflow: hidden;
    }

    .empty-workspace {
        flex-grow: 1;
        height: 100%;
        overflow-y: auto;
    }
</style>