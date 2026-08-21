/// <reference types="svelte" />
/// <reference types="vite/client" />

declare module 'encoding-japanese' {
    const Encoding: any;
    export default Encoding;
}

declare module 'ooz-wasm' {
    export function load(): Promise<void>;
    export function decompressUnsafe(data: Uint8Array, uncompressedSize: number): Promise<Uint8Array>;
    export function decompress(data: Uint8Array, uncompressedSize: number): Promise<Uint8Array>;
}