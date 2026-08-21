<script lang="ts">
    import { onMount } from "svelte";
    import Prism from "prismjs";
    import "prismjs/components/prism-markup";
    import "prismjs/components/prism-csv";
    import { Copy, Check } from "@lucide/svelte";

    let {
        value = $bindable(""),
        language = "markup",
        readonly = false,
        onchange = (val: string) => {}
    }: {
        value: string;
        language?: string;
        readonly?: boolean;
        onchange?: (val: string) => void;
    } = $props();

    let textareaElem: HTMLTextAreaElement | undefined = $state();
    let preElem: HTMLPreElement | undefined = $state();
    let lineNumbersElem: HTMLDivElement | undefined = $state();
    let copied = $state(false);

    let lineCount = $derived(value.split("\n").length);
    let lineNumbers = $derived(Array.from({ length: lineCount }, (_, i) => i + 1));

    let highlightedCode = $derived.by(() => {
        const grammar = Prism.languages[language] || Prism.languages.markup;
        const code = value.endsWith("\n") ? value + " " : value;
        return Prism.highlight(code, grammar, language);
    });

    function handleScroll(e: Event) {
        const target = e.target as HTMLTextAreaElement;
        if (preElem) {
            preElem.scrollTop = target.scrollTop;
            preElem.scrollLeft = target.scrollLeft;
        }
        if (lineNumbersElem) {
            lineNumbersElem.scrollTop = target.scrollTop;
        }
    }

    function handleInput(e: Event) {
        const target = e.target as HTMLTextAreaElement;
        value = target.value;
        onchange(value);
    }

    function handleKeyDown(e: KeyboardEvent) {
        if (e.key === "Tab") {
            e.preventDefault();
            const target = e.target as HTMLTextAreaElement;
            const start = target.selectionStart;
            const end = target.selectionEnd;

            if (e.shiftKey) {
                // Outdent
                const before = value.substring(0, start);
                const after = value.substring(end);
                const lastNewline = before.lastIndexOf("\n");
                const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
                if (value.substring(lineStart, lineStart + 2) === "  ") {
                    value = value.substring(0, lineStart) + value.substring(lineStart + 2);
                    setTimeout(() => {
                        target.selectionStart = target.selectionEnd = Math.max(lineStart, start - 2);
                        onchange(value);
                    }, 0);
                } else if (value.charAt(lineStart) === "\t") {
                    value = value.substring(0, lineStart) + value.substring(lineStart + 1);
                    setTimeout(() => {
                        target.selectionStart = target.selectionEnd = Math.max(lineStart, start - 1);
                        onchange(value);
                    }, 0);
                }
            } else {
                // Indent with 2 spaces or tab
                value = value.substring(0, start) + "  " + value.substring(end);
                setTimeout(() => {
                    target.selectionStart = target.selectionEnd = start + 2;
                    onchange(value);
                }, 0);
            }
        }
    }

    async function copyToClipboard() {
        try {
            await navigator.clipboard.writeText(value);
            copied = true;
            setTimeout(() => { copied = false; }, 2000);
        } catch {
            // fallback
        }
    }
</script>

<div class="editor-wrapper">
    <div class="editor-toolbar">
        <div class="editor-stats">
            <span>{lineCount} lines</span>
            <span>{value.length} characters</span>
            <span class="lang-tag">{language.toUpperCase()}</span>
        </div>
        <button class="toolbar-btn" onclick={copyToClipboard} title="Copy to clipboard" aria-label="Copy to clipboard">
            {#if copied}
                <Check size={14} class="text-success" />
                <span>Copied!</span>
            {:else}
                <Copy size={14} />
                <span>Copy</span>
            {/if}
        </button>
    </div>

    <div class="editor-container">
        <div class="line-numbers" bind:this={lineNumbersElem} aria-hidden="true">
            {#each lineNumbers as num}
                <div class="line-num">{num}</div>
            {/each}
        </div>

        <div class="code-area">
            <pre
                bind:this={preElem}
                class="highlight-layer language-{language}"
                aria-hidden="true"
            ><!-- eslint-disable-next-line svelte/no-at-html-tags -->{@html highlightedCode}</pre>
            
            <textarea
                bind:this={textareaElem}
                {value}
                {readonly}
                spellcheck="false"
                autocapitalize="off"
                autocomplete="off"
                oninput={handleInput}
                onscroll={handleScroll}
                onkeydown={handleKeyDown}
                aria-label="Code editor"
            ></textarea>
        </div>
    </div>
</div>

<style>
    .editor-wrapper {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        background-color: var(--editor-bg, #1a1a1f);
        color: var(--editor-fg, #d4d4d8);
        border: 1px solid var(--border-color, #2e2e36);
        border-radius: 8px;
        overflow: hidden;
        font-family: 'JetBrains Mono', 'Fira Code', Consolas, Menlo, Monaco, monospace;
    }

    .editor-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px 12px;
        background-color: var(--toolbar-bg, #141418);
        border-bottom: 1px solid var(--border-color, #2e2e36);
        font-size: 0.75rem;
    }

    .editor-stats {
        display: flex;
        align-items: center;
        gap: 12px;
        color: var(--text-muted, #8b8b99);
    }

    .lang-tag {
        background-color: var(--tag-bg, #262630);
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: 600;
        font-size: 0.7rem;
    }

    .toolbar-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: transparent;
        border: 1px solid var(--border-color, #333340);
        color: var(--text-color, #d4d4d8);
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.75rem;
        cursor: pointer;
        transition: all 0.15s ease;
    }

    .toolbar-btn:hover {
        background-color: var(--hover-bg, #272733);
        border-color: var(--accent-color, #5865f2);
    }

    .editor-container {
        position: relative;
        display: flex;
        flex-grow: 1;
        height: calc(100% - 33px);
        overflow: hidden;
    }

    .line-numbers {
        display: flex;
        flex-direction: column;
        padding: 12px 8px 12px 12px;
        background-color: var(--gutter-bg, #16161b);
        border-right: 1px solid var(--border-color, #2e2e36);
        color: var(--line-num-color, #555566);
        text-align: right;
        user-select: none;
        overflow: hidden;
        min-width: 42px;
        font-size: 0.875rem;
        line-height: 1.5rem;
    }

    .line-num {
        height: 1.5rem;
    }

    .code-area {
        position: relative;
        flex-grow: 1;
        height: 100%;
        overflow: hidden;
    }

    .highlight-layer,
    textarea {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 12px 16px;
        font-family: inherit;
        font-size: 0.875rem;
        line-height: 1.5rem;
        white-space: pre;
        box-sizing: border-box;
        border: none;
        outline: none;
        tab-size: 2;
    }

    .highlight-layer {
        background: transparent;
        pointer-events: none;
        overflow: hidden;
        color: inherit;
        z-index: 1;
    }

    textarea {
        background: transparent;
        color: transparent;
        caret-color: var(--caret-color, #58a6ff);
        resize: none;
        z-index: 2;
        overflow: auto;
    }

    textarea::selection {
        background-color: rgba(88, 166, 255, 0.25);
    }

    /* Prism token highlighting */
    :global(.token.comment),
    :global(.token.prolog),
    :global(.token.doctype),
    :global(.token.cdata) {
        color: #727b8e;
        font-style: italic;
    }

    :global(.token.punctuation) {
        color: #8b949e;
    }

    :global(.token.property),
    :global(.token.tag),
    :global(.token.boolean),
    :global(.token.number),
    :global(.token.constant),
    :global(.token.symbol),
    :global(.token.deleted) {
        color: #79c0ff;
    }

    :global(.token.selector),
    :global(.token.attr-name),
    :global(.token.string),
    :global(.token.char),
    :global(.token.builtin),
    :global(.token.inserted) {
        color: #7ee787;
    }

    :global(.token.operator),
    :global(.token.entity),
    :global(.token.url),
    :global(.language-css .token.string),
    :global(.style .token.string) {
        color: #d2a8ff;
    }

    :global(.token.atrule),
    :global(.token.attr-value),
    :global(.token.keyword) {
        color: #ff7b72;
    }

    :global(.token.function),
    :global(.token.class-name) {
        color: #ffa657;
    }
</style>
