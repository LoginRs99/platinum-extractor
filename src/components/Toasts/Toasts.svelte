<script lang="ts">
    import { slide } from "svelte/transition";
    import {
        Info,
        CheckCircle2,
        AlertTriangle,
        AlertCircle,
        X,
        ExternalLink
    } from "@lucide/svelte";
    import { dismissToast, toasts, type Toast } from "./ToastStore";

    function getToastIcon(type?: string) {
        switch (type) {
            case "success": return CheckCircle2;
            case "warning": return AlertTriangle;
            case "danger": return AlertCircle;
            default: return Info;
        }
    }
</script>

{#if $toasts.length > 0}
    <div class="toast-container" role="region" aria-label="Notifications" aria-live="polite">
        {#each $toasts as toast (toast.id)}
            {@const IconComponent = getToastIcon(toast.type)}
            <div
                class="toast-card {toast.type || 'info'}"
                id={`toast-${toast.id}`}
                role="alert"
                transition:slide={{ duration: 200 }}
            >
                <div class="toast-header">
                    <div class="toast-icon">
                        <IconComponent size={18} />
                    </div>
                    <span class="toast-title">{toast.title}</span>
                    {#if toast.dismissable}
                        <button
                            class="toast-close"
                            onclick={() => dismissToast(toast.id)}
                            aria-label="Dismiss notification"
                        >
                            <X size={14} />
                        </button>
                    {/if}
                </div>

                {#if toast.message}
                    <div class="toast-message">{toast.message}</div>
                {/if}

                {#if toast.link}
                    <a
                        href={toast.link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="toast-link"
                    >
                        <span>{toast.link.text}</span>
                        <ExternalLink size={13} />
                    </a>
                {/if}

                {#if toast.onCancel}
                    <button class="toast-cancel-btn" onclick={toast.onCancel}>
                        Cancel
                    </button>
                {/if}

                {#if typeof toast.progress === "number"}
                    <div class="toast-progress">
                        <div class="toast-progress-bar" style="width: {toast.progress * 100}%"></div>
                    </div>
                {/if}
            </div>
        {/each}
    </div>
{/if}

<style>
    .toast-container {
        position: fixed;
        bottom: 16px;
        right: 16px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        z-index: 9999;
        max-width: 380px;
        width: calc(100vw - 32px);
        pointer-events: none;
    }

    .toast-card {
        pointer-events: auto;
        display: flex;
        flex-direction: column;
        background-color: var(--bg-card, #1c1c24);
        border: 1px solid var(--border-color, #2c2c38);
        border-radius: 10px;
        padding: 12px 14px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        gap: 6px;
        position: relative;
        overflow: hidden;
    }

    .toast-card.info {
        border-left: 4px solid var(--info, #58a6ff);
    }
    .toast-card.success {
        border-left: 4px solid var(--success, #2ea043);
    }
    .toast-card.warning {
        border-left: 4px solid var(--warning, #d29922);
    }
    .toast-card.danger {
        border-left: 4px solid var(--danger, #f85149);
    }

    .toast-header {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .toast-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    .toast-card.info .toast-icon { color: var(--info, #58a6ff); }
    .toast-card.success .toast-icon { color: var(--success, #2ea043); }
    .toast-card.warning .toast-icon { color: var(--warning, #d29922); }
    .toast-card.danger .toast-icon { color: var(--danger, #f85149); }

    .toast-title {
        font-weight: 600;
        font-size: 0.85rem;
        color: var(--text-color, #ededf2);
        flex-grow: 1;
    }

    .toast-close {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        border-radius: 4px;
        border: none;
        background: transparent;
        color: var(--text-muted, #9595a6);
        cursor: pointer;
        padding: 0;
        transition: color 0.1s ease;
    }

    .toast-close:hover {
        color: var(--text-color, #ededf2);
        background-color: var(--bg-card-subtle, #22222c);
    }

    .toast-message {
        font-size: 0.78rem;
        color: var(--text-muted, #9595a6);
        line-height: 1.4;
        word-break: break-word;
        white-space: pre-line;
    }

    .toast-link {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 0.75rem;
        font-weight: 500;
        color: var(--accent-primary, #0063db);
        margin-top: 4px;
    }

    .toast-link:hover {
        text-decoration: underline;
    }

    .toast-cancel-btn {
        align-self: flex-start;
        padding: 4px 8px;
        border-radius: 4px;
        border: 1px solid var(--border-color, #2c2c38);
        background-color: var(--bg-button, #242430);
        color: var(--text-color, #ededf2);
        font-size: 0.75rem;
        cursor: pointer;
        margin-top: 4px;
    }

    .toast-progress {
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 3px;
        background-color: rgba(255, 255, 255, 0.05);
    }

    .toast-progress-bar {
        height: 100%;
        background-color: var(--accent-primary, #0063db);
        transition: width 0.1s linear;
    }
</style>