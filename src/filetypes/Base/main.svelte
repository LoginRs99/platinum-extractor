<script lang="ts">
    import type { FileData } from "./extract";
    import type FileHandler from "../../lib/FileHandler";

    let { name, data, fileHandler, setUnsavedChanges }: {
        name: string;
        data: FileData;
        fileHandler?: FileHandler;
        setUnsavedChanges?: (value: boolean) => void;
    } = $props();

    export function save(): FileData | false {
        return { myData: "Hello, world! This is my modded data." };
    }
</script>

<div class="base-container">
    <h2>{name}</h2>
    <p>Data: {data?.myData || "No data"}</p>
</div>

<style>
    .base-container {
        padding: 24px;
        color: var(--text-color, #e0e0e0);
    }
</style>