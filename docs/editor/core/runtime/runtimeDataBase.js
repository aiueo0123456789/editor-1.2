import { objectInit } from "../../utils/utility.js";
import { BufferManager } from "./bufferManager.js";

// そのうち動的ストレージバッファ（dynamic storage buffer）を使うかも
export class RuntimeDataBase {
    constructor(/** @type {Application} */ app, offsetNameConverter) {
        this.app = app;
        this.order = [];
        this.offsetAndFormulas = {};
        this.offsetNameConverter = offsetNameConverter;
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
        this.setOffset(object);
    }

    insert(object, index) {
        if (this.order.includes(object)) return ;
        this.order.splice(index,0,object);
        for (const buffer of this.allBuffers) {
            buffer.insert(object, this.order[index].offsetAndFormulas[buffer.sourceOffsetType] * buffer.structByteSize);
        }
        this.setGroup();
        this.setOffset(object);
    }

    update() {
        for (const buffer of this.allBuffers) {
            buffer.reset();
            for (const object of this.order) {
                buffer.append(object);
            }
        }
        this.setGroup();
        this.setAllObjectOffset();
    }

    delete(object) {
        if (!this.order.includes(object)) return ;
        this.order.splice(this.order.indexOf(object), 1);
        for (const buffer of this.allBuffers) {
            buffer.delete(object);
        }
        this.setGroup();
        this.setOffset(object);
    }

    offsetCreate() {
        const alreadyDetected = [];
        const alreadyFoundID = {};
        objectInit(this.offsetAndFormulas);
        for (const key in this) {
            const p = this[key];
            if (p instanceof BufferManager) {
                let result = p.influenceValues;
                let hash;
                const ids = [];
                for (const value of result) {
                    if (!alreadyDetected.includes(value)) {
                        alreadyDetected.push(value);
                    }
                    ids.push(alreadyDetected.indexOf(value));
                }
                hash = ids.sort((a,b) => a > b).join("*");
                if (!alreadyFoundID[hash]) {
                    this.offsetAndFormulas[result.join("*")] = result;
                    alreadyFoundID[hash] = true;
                }
                p.sourceOffsetType = this.offsetNameConverter[result.join("*")];
            }
        }
    }

    setOffset(object) {
        if (!this.order.includes(object)) return ;
        // const offsets = new Array(this.offsetAndFormulas.length).fill(0);
        const offsets = {};
        for (const key in this.offsetAndFormulas) {
            offsets[key] = 0;
        }
        for (const nowObject of this.order) {
            if (nowObject == object) {
                // nowObject.runtimeOffsetData = offsets;
                objectInit(nowObject.runtimeOffsetData);
                for (const key in offsets) {
                    nowObject.runtimeOffsetData[this.offsetNameConverter[key]] = offsets[key];
                }
                console.log(nowObject)
                this.updateAllocationData(object);
                return ;
            }
            for (const key in this.offsetAndFormulas) {
                let value = 1;
                for (const parameter of this.offsetAndFormulas[key]) {
                    value *= nowObject[parameter];
                }
                offsets[key] += value;
            }
        }
    }

    setAllObjectOffset() {
        const offsets = {};
        for (const key in this.offsetAndFormulas) {
            offsets[key] = 0;
        }
        for (const object of this.order) {
            objectInit(object.runtimeOffsetData);
            for (const key in offsets) {
                object.runtimeOffsetData[this.offsetNameConverter[key]] = offsets[key];
            }
            this.updateAllocationData(object);
            for (const key in this.offsetAndFormulas) {
                let value = 1;
                for (const parameter of this.offsetAndFormulas[key]) {
                    value *= object[parameter];
                }
                offsets[key] += value;
            }
        }
    }
}