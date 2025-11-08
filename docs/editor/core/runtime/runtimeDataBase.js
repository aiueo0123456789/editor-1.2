import { Application } from "../../app/app.js";
import { objectInit } from "../../utils/utility.js";
import { GPU } from "../../utils/webGPU.js";
import { BufferManager } from "./bufferManager.js";

// そのうち動的ストレージバッファ（dynamic storage buffer）を使うかも
export class RuntimeDataBase {
    constructor(/** @type {Application} */ app, offsetNameConverter) {
        /** @type {Application} */
        this.app = app;
        this.order = [];
        this.lastRuntimeOffset = {};
        this.offsetAndFormulas = {};
        this.offsetNameConverter = offsetNameConverter;
    }

    updateLastRuntimeOffset() {
        for (const object of this.order) {
            this.lastRuntimeOffset[object.id] = structuredClone(object.runtimeOffsetData);
        }
    }

    get allBuffers() {
        const buffers = [];
        for (const key in this) {
            if (this[key] instanceof BufferManager) {
                buffers.push(this[key]);
            }
        }
        return buffers
    }

    append(object) {
        if (this.order.includes(object)) return ;
        this.order.push(object);
        for (const buffer of this.allBuffers) {
            buffer.append(object);
        }
        this.setGroup();
        this.setOffset();
    }

    insert(object, index) {
        if (this.order.includes(object)) return ;
        this.order.splice(index,0,object);
        for (const buffer of this.allBuffers) {
            buffer.insert(object, this.order[index].offsetAndFormulas[buffer.sourceOffsetType] * buffer.structByteSize);
        }
        this.setGroup();
        this.setOffset();
    }

    update(object) {
        const lastRuntimeOffsetCache = structuredClone(this.lastRuntimeOffset);
        const myRuntimeData = lastRuntimeOffsetCache[object.id];
        this.setOffset();
        const newData = this.getObjectDataForGPU(object);
        for (const [buffer, data] of newData) {
            buffer.update(myRuntimeData.start[buffer.sourceOffsetType], myRuntimeData.end[buffer.sourceOffsetType], object.runtimeOffsetData.start[buffer.sourceOffsetType], object.runtimeOffsetData.end[buffer.sourceOffsetType], data);
        }
        this.setGroup();
    }

    updateAtParts(object, newData) {
        const lastRuntimeOffsetCache = structuredClone(this.lastRuntimeOffset);
        const myRuntimeData = lastRuntimeOffsetCache[object.id];
        this.setOffset();
        for (const [buffer, data] of newData) {
            buffer.update(myRuntimeData.start[buffer.sourceOffsetType], myRuntimeData.end[buffer.sourceOffsetType], object.runtimeOffsetData.start[buffer.sourceOffsetType], object.runtimeOffsetData.end[buffer.sourceOffsetType], data);
        }
        this.setGroup();
    }

    delete(object) {
        if (!this.order.includes(object)) return ;
        this.order.splice(this.order.indexOf(object), 1);
        for (const buffer of this.allBuffers) {
            buffer.delete(object);
        }
        this.setGroup();
        this.setOffset();
    }

    offsetCreate() {
        const alreadyDetected = [];
        const alreadyFoundID = {};
        objectInit(this.offsetAndFormulas);
        for (const key in this) {
            const p = this[key];
            if (p instanceof BufferManager) { // 全てのbufferで使うオフセットの検出
                let influenceValues = p.influenceValues;  // サイズ計算で使われる変数
                let hash;
                const ids = [];
                for (const value of influenceValues) {
                    if (!alreadyDetected.includes(value)) {
                        alreadyDetected.push(value);
                    }
                    ids.push(alreadyDetected.indexOf(value));
                }
                hash = ids.sort((a,b) => a > b).join("*");
                if (!alreadyFoundID[hash]) {
                    this.offsetAndFormulas[influenceValues.join("*")] = influenceValues;
                    alreadyFoundID[hash] = true;
                }
                p.sourceOffsetType = this.offsetNameConverter[influenceValues.join("*")];
            }
        }
    }

    // 全てのオブジェクトのruntimeOffsetData.startの更新
    setOffset() {
        const offsets = {};
        for (const key in this.offsetAndFormulas) {
            offsets[key] = 0;
        }
        for (const object of this.order) {
            objectInit(object.runtimeOffsetData.start);
            for (const key in offsets) {
                object.runtimeOffsetData.start[this.offsetNameConverter[key]] = offsets[key];
            }
            this.updateAllocationData(object);
            for (const key in this.offsetAndFormulas) {
                let value = 1;
                for (const parameter of this.offsetAndFormulas[key]) {
                    value *= object[parameter];
                }
                offsets[key] += value;
            }
            objectInit(object.runtimeOffsetData.end);
            for (const key in offsets) {
                object.runtimeOffsetData.end[this.offsetNameConverter[key]] = offsets[key];
            }
        }
        this.updateLastRuntimeOffset();
    }
}