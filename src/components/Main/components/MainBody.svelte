<script lang="ts">
    import Unloaded from "../Unloaded.svelte";
    import { componentTabs, loadedComponentIndex, type Tab } from "../MainStore";
    import type FileHandler from "../../../lib/FileHandler";
    import { addToast } from "../../Toasts/ToastStore";

    interface Props {
        i: number;
        tab: Tab;
        fileHandler: FileHandler;
    }

    let { i, tab, fileHandler }: Props = $props();

    let dataStore = $derived(tab.file?.data);
    let files = $derived(tab.files);
    let saveFn: (() => any) | null = $state(null);

    let DynamicComponent = $derived(tab?.component || Unloaded);

    function checkSave(e: KeyboardEvent) {
        if ((e.ctrlKey || e.metaKey) && e.key === "s") {
            e.preventDefault();
            if ($loadedComponentIndex === i && saveFn) {
                const result = saveFn();
                if (result === false) {
                    tab.unchanged.set(false);
                    addToast({
                        type: "warning",
                        title: "Cannot Save",
                        message: "Please resolve any formatting or validation errors before saving.",
                        timeout: 4000
                    });
                } else if (result !== undefined) {
                    if (tab.file && tab.file.data) {
                        tab.file.data.set(result);
                    }
                    tab.unchanged.set(false);
                    tab.unsaved.set(false);
                    addToast({
                        type: "success",
                        title: "Saved",
                        message: `Successfully saved changes to ${tab.name}.`,
                        timeout: 3000
                    });
                }
            }
        }
    }
</script>

<svelte:window onkeydown={checkSave} />

<div class="main-body" style={$loadedComponentIndex !== i ? "display: none" : ""}>
    <DynamicComponent
        name={tab?.name}
        files={files}
        fileHandler={fileHandler}
        data={dataStore ? $dataStore : undefined}
        bind:save={saveFn}
        setUnsavedChanges={(isUnsaved: boolean) => {
            tab.unchanged.set(false);
            tab.unsaved.set(isUnsaved);
        }}
    />
</div>

<style>
    .main-body {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background-color: var(--bg-app, #121217);
    }
</style>