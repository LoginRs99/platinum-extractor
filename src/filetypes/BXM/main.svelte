<script lang="ts">
    import { CheckCircle2, XCircle, Loader2, Download, FileCode } from "@lucide/svelte";
    import CodeEditor from "../../components/Common/CodeEditor.svelte";
    import repackBXM from "./repack";
    import type { FileData, Node } from "./extract";

    let {
        name,
        data,
        setUnsavedChanges = () => {}
    }: {
        name: string;
        data: FileData;
        fileHandler?: any;
        setUnsavedChanges?: (value: boolean) => void;
    } = $props();

    function toXMLString(node: Node, depth = 0): string {
        if (!node) return "";
        let xml = "";
        if (depth > 0) xml += "\n" + "  ".repeat(depth);
        xml += `<${node.name}`;
        if (node.attributes) {
            for (const attr in node.attributes) {
                xml += ` ${attr}="${node.attributes[attr]}"`;
            }
        }
        if (!node.value && (!node.children || node.children.length === 0)) {
            xml += " />";
            return xml;
        }
        xml += ">";
        if (node.value) {
            xml += node.value;
        }
        if (node.children && node.children.length > 0) {
            for (const child of node.children) {
                xml += toXMLString(child, depth + 1);
            }
            xml += "\n" + "  ".repeat(depth);
        }
        xml += `</${node.name}>`;
        return xml;
    }

    let originalXML = $derived(data && data.data ? toXMLString(data.data) : "");
    let currentXML = $state("");
    let repackError: string | null | false = $state(false);
    let isInitialized = $state(false);

    $effect(() => {
        if (originalXML && !isInitialized) {
            currentXML = originalXML;
            isInitialized = true;
            validateXML(currentXML);
        }
    });

    function validateXML(xmlText: string) {
        if (!xmlText.trim()) {
            repackError = "Document is empty";
            return false;
        }
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlText, "text/xml");
        const parseError = doc.querySelector("parsererror");
        if (parseError) {
            repackError = parseError.textContent || "XML syntax error";
            return false;
        }
        repackError = false;
        return true;
    }

    function handleCodeChange(newVal: string) {
        currentXML = newVal;
        setUnsavedChanges(true);
        validateXML(newVal);
    }

    function xmlToNode(elem: Element): Node {
        const attributes: Record<string, string> = {};
        for (let i = 0; i < elem.attributes.length; i++) {
            const attr = elem.attributes[i];
            attributes[attr.name] = attr.value;
        }
        const children: Node[] = [];
        let value = "";
        for (let i = 0; i < elem.childNodes.length; i++) {
            const child = elem.childNodes[i];
            if (child.nodeType === 1) {
                // Element
                children.push(xmlToNode(child as Element));
            } else if (child.nodeType === 3) {
                // Text
                value += child.nodeValue || "";
            }
        }
        return {
            name: elem.tagName,
            value: value.trim(),
            attributes,
            children
        };
    }

    export function save(): FileData | false {
        if (!validateXML(currentXML)) return false;
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(currentXML, "text/xml");
            const rootNode = xmlToNode(doc.documentElement);
            const newData: FileData = {
                data: rootNode,
                encoding: data.encoding || "UTF-8"
            };
            return newData;
        } catch {
            return false;
        }
    }

    async function downloadBXM() {
        const saved = save();
        if (!saved) {
            alert("Please fix XML errors before exporting.");
            return;
        }
        const arrayBuffer = repackBXM(saved);
        const blob = new Blob([arrayBuffer], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = name.endsWith(".bxm") ? name : `${name}.bxm`;
        a.click();
        URL.revokeObjectURL(url);
    }

    function downloadXML() {
        const blob = new Blob([currentXML], { type: "text/xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = name.replace(/\.bxm$/i, "") + ".xml";
        a.click();
        URL.revokeObjectURL(url);
    }
</script>

<div class="bxm-editor">
    <header class="editor-header">
        <div class="status-indicator">
            {#if repackError === null}
                <Loader2 size={18} class="spin text-info" />
                <span>Checking XML structure...</span>
            {:else if repackError === false}
                <CheckCircle2 size={18} class="text-success" />
                <span class="status-text">Valid XML &bull; Ready to repack ({data.encoding || 'SHIFT-JIS'})</span>
            {:else}
                <XCircle size={18} class="text-danger" />
                <span class="status-text text-danger" title={repackError}>XML Error: {repackError}</span>
            {/if}
        </div>

        <div class="actions">
            <button class="action-btn" onclick={downloadXML} title="Download as readable XML">
                <FileCode size={15} />
                <span>Export XML</span>
            </button>
            <button class="action-btn primary" onclick={downloadBXM} disabled={repackError !== false} title="Repack to binary BXM and download">
                <Download size={15} />
                <span>Repack BXM</span>
            </button>
        </div>
    </header>

    <div class="editor-body">
        <CodeEditor
            value={currentXML}
            language="markup"
            onchange={handleCodeChange}
        />
    </div>
</div>

<style>
    .bxm-editor {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        padding: 12px;
        box-sizing: border-box;
        gap: 10px;
    }

    .editor-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 14px;
        background-color: var(--card-bg, #1e1e24);
        border: 1px solid var(--border-color, #2e2e36);
        border-radius: 8px;
        gap: 12px;
        flex-wrap: wrap;
    }

    .status-indicator {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.85rem;
        flex-grow: 1;
        min-width: 200px;
    }

    .status-text {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 500px;
    }

    .actions {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .action-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border-radius: 6px;
        border: 1px solid var(--border-color, #3a3a48);
        background-color: var(--button-bg, #272732);
        color: var(--text-color, #e0e0e8);
        font-size: 0.8rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;
    }

    .action-btn:hover:not(:disabled) {
        background-color: var(--button-hover-bg, #333342);
        border-color: var(--accent-color, #5865f2);
    }

    .action-btn.primary {
        background-color: #0063db;
        border-color: #0056bf;
        color: #ffffff;
    }

    .action-btn.primary:hover:not(:disabled) {
        background-color: #0056bf;
    }

    .action-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .editor-body {
        flex-grow: 1;
        height: calc(100% - 58px);
        overflow: hidden;
    }

    :global(.text-success) {
        color: #57f287;
    }

    :global(.text-danger) {
        color: #ed4245;
    }

    :global(.text-info) {
        color: #58a6ff;
    }

    :global(.spin) {
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
</style>