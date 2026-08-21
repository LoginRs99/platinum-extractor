export default class PlatinumFileReader {
    file: File|Blob|ArrayBuffer;
    
    constructor(fileBuffer: File|Blob|ArrayBuffer) {
        this.file = fileBuffer;
    }

    /**
     * Reads the file and returns an ArrayBuffer.
     * @param start (optional)
     * @param end (optional)
     * @returns ArrayBuffer
     */
    async read(start?: number, end?: number): Promise<ArrayBuffer> {
        if (this.file instanceof ArrayBuffer) {
            return this.file.slice(start, end);
        }

        if (this.file && typeof (this.file as Blob).arrayBuffer === 'function') {
            const sliced = (this.file as Blob).slice(start, end);
            return await sliced.arrayBuffer();
        }

        return new Promise((resolve, reject) => {
            if (typeof FileReader === 'undefined') {
                reject(new Error('FileReader is not defined in this environment'));
                return;
            }
            const reader = new FileReader();
            reader.onload = () => {
                resolve(reader.result as ArrayBuffer);
            };
            reader.onerror = () => {
                reject(reader.error);
            };
            reader.readAsArrayBuffer((this.file as Blob).slice(start, end));
        });
    }

    async readString(start?: number, end?: number): Promise<string> {
        if (this.file instanceof ArrayBuffer) {
            return new TextDecoder().decode(this.file.slice(start, end));
        }

        if (this.file && typeof (this.file as Blob).text === 'function') {
            const sliced = (this.file as Blob).slice(start, end);
            return await sliced.text();
        }

        return new Promise((resolve, reject) => {
            if (typeof FileReader === 'undefined') {
                reject(new Error('FileReader is not defined in this environment'));
                return;
            }
            const reader = new FileReader();
            reader.onload = () => {
                resolve(reader.result as string);
            };
            reader.onerror = () => {
                reject(reader.error);
            };
            reader.readAsText((this.file as Blob).slice(start, end));
        });
    }

    async readUint8(offset: number): Promise<number> {
        const buffer = await this.read(offset, offset + 1);
        return new DataView(buffer).getUint8(0);
    }

    async readUint16(offset: number, littleEndian=false): Promise<number> {
        const buffer = await this.read(offset, offset + 2);
        return new DataView(buffer).getUint16(0, littleEndian);
    }

    async readUint32(offset: number, littleEndian=false): Promise<number> {
        const buffer = await this.read(offset, offset + 4);
        return new DataView(buffer).getUint32(0, littleEndian);
    }

    async readInt8(offset: number): Promise<number> {
        const buffer = await this.read(offset, offset + 1);
        return new DataView(buffer).getInt8(0);
    }

    async readInt16(offset: number, littleEndian=false): Promise<number> {
        const buffer = await this.read(offset, offset + 2);
        return new DataView(buffer).getInt16(0, littleEndian);
    }

    async readInt32(offset: number, littleEndian=false): Promise<number> {
        const buffer = await this.read(offset, offset + 4);
        return new DataView(buffer).getInt32(0, littleEndian);
    }

    async readFloat32(offset: number, littleEndian=false): Promise<number> {
        const buffer = await this.read(offset, offset + 4);
        return new DataView(buffer).getFloat32(0, littleEndian);
    }
}