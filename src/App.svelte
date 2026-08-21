<script lang="ts">
    import { onMount } from "svelte";
    import FileHandler from "./lib/FileHandler";
    import { addToast } from "./components/Toasts/ToastStore";
    import Toasts from "./components/Toasts/Toasts.svelte";
    import Sidebar from "./components/Sidebar/Sidebar.svelte";
    import Main from "./components/Main/Main.svelte";
    import { currentTheme, applyTheme } from "./lib/theme";
    import { Menu, X } from "@lucide/svelte";

    let fileHandler: FileHandler | undefined = $state();
    let isSidebarOpen = $state(true);

    onMount(() => {
        applyTheme($currentTheme);
        fileHandler = new FileHandler();

        addToast({
            title: "Platinum Extractor 2.0",
            message: "100% client-side game archive extractor & modding tool.\nDrag and drop files to get started!",
            type: "info",
            timeout: 5000,
            dismissable: true
        });
    });

    function toggleSidebar() {
        isSidebarOpen = !isSidebarOpen;
    }
</script>

<div class="app-layout" class:sidebar-collapsed={!isSidebarOpen}>
    {#if fileHandler}
        <button
            class="mobile-menu-toggle"
            onclick={toggleSidebar}
            aria-label={isSidebarOpen ? "Hide sidebar" : "Show sidebar"}
            title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
            {#if isSidebarOpen}
                <X size={18} />
            {:else}
                <Menu size={18} />
            {/if}
        </button>

        <div class="sidebar-wrapper" class:hidden={!isSidebarOpen}>
            <Sidebar {fileHandler} />
        </div>

        <div class="main-wrapper">
            <Main {fileHandler} />
        </div>

        <Toasts />
    {/if}
</div>

<style>
    .app-layout {
        display: flex;
        width: 100vw;
        height: 100vh;
        overflow: hidden;
        position: relative;
        background-color: var(--bg-app, #121217);
        color: var(--text-color, #ededf2);
    }

    .sidebar-wrapper {
        height: 100%;
        display: flex;
        flex-shrink: 0;
        z-index: 20;
        transition: transform 0.2s ease-in-out;
    }

    .main-wrapper {
        flex-grow: 1;
        height: 100%;
        overflow: hidden;
        position: relative;
    }

    .mobile-menu-toggle {
        display: none;
        position: fixed;
        top: 10px;
        left: 10px;
        z-index: 30;
        width: 32px;
        height: 32px;
        border-radius: 6px;
        border: 1px solid var(--border-color, #2c2c38);
        background-color: var(--bg-sidebar, #181820);
        color: var(--text-color, #ededf2);
        cursor: pointer;
        align-items: center;
        justify-content: center;
    }

    @media (max-width: 768px) {
        .mobile-menu-toggle {
            display: flex;
        }

        .sidebar-wrapper {
            position: absolute;
            top: 0;
            left: 0;
            height: 100%;
            transform: translateX(0);
            box-shadow: 4px 0 24px rgba(0, 0, 0, 0.5);
        }

        .sidebar-wrapper.hidden {
            transform: translateX(-100%);
            pointer-events: none;
        }
    }
</style>