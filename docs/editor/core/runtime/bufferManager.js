import { isNumber } from "../../utils/utility.js";
import { GPU } from "../../utils/webGPU.js";

export class BufferManager {
    constructor(runtimeData, bufferName, struct, calculateFormula) {
        this.runtimeData = runtimeData;
        this.bufferName = bufferName;
        this.buffer = GPU.createBuffer(0, ["v","s"]);
        this.struct = struct;
        this.structByteSize = GPU.getStructByteSize(struct);
        this.formula = calculateFormula;
        this.formulaParts = calculateFormula.split(" ");
        this.formulaParts = this.formulaParts.map(value => isNumber(value) ? Number(value) : value);
        this.sourceOffsetType = "";
    }

    get minimumOrMoreBuffer() {
        if (this.buffer.size == 0) return GPU.createBuffer(this.structByteSize, ["v","s"]);
        else return this.buffer;
    }

    async getObjectData(object) {
        const offset = object.runtimeOffsetData.start[this.sourceOffsetType];
        const readNum = this.getObjectUseSize(object);
        return await GPU.getStructDataFromGPUBuffer(this.buffer, this.struct, offset, readNum);
    }

    getObjectUseSize(object) {
        let ans = 0;
        let operator = "+";
        for (const part of this.formulaParts) {
            if ("*/+-".includes(part)) {
                operator = part;
            } else {
                let value = 0;
                if (isNumber(part)) {
                    value = part;
                } else {
                    value = object[part];
                }
                if (operator == "+") {
                    ans += value;
                } else if (operator == "-") {
                    ans -= value;
                } else if (operator == "*") {
                    ans *= value;
                } else if (operator == "/") {
                    ans /= value;
                }
            }
        }
        return Math.ceil(ans);
    }

    get influenceValues() { // サイズ計算で使われる変数
        const influenceValues = [];
        for (const part of this.formulaParts) {
            if ("*/+-".includes(part)) {
            } else if (isNumber(part)) {
            } else {
                influenceValues.push(part);
            }
        }
        return influenceValues;
    }

    reset() {
        this.buffer.destroy();
        this.buffer = GPU.createBuffer(0, ["v","s"]);
    }

    delete(object) {
        const offset = object.runtimeOffsetData.start[this.sourceOffsetType];
        const readNum = this.getObjectUseSize(object);
        this.buffer = GPU.deleteStructDataFromGPUBuffer(this.buffer, offset, readNum, this.struct);
    }

    append(object) {
        const byte = this.getObjectUseSize(object) * this.structByteSize;
        this.buffer = GPU.appendEmptyToBuffer(this.buffer, byte);
    }

    insert(object, offset) {
        const byte = this.getObjectUseSize(object) * this.structByteSize;
        this.buffer = GPU.insertEmptyToBuffer(this.buffer, offset, byte);
    }

    update(deleteOffset1, deleteOffset2, insertOffset1, insertOffset2, data) {
        // console.log("更新",this,deleteOffset1, deleteOffset2, insertOffset1, insertOffset2, data)
        const beforeBuffer = GPU.copyBufferToNewBuffer(this.buffer, 0, this.structByteSize * deleteOffset1);
        const afterBuffer = GPU.copyBufferToNewBuffer(this.buffer, this.structByteSize * deleteOffset2, this.buffer.size - this.structByteSize * deleteOffset2);
        let newDataBuffer;
        if (data) {
            const newData = GPU.createBitData(data, this.struct);
            newDataBuffer = GPU.createBuffer((insertOffset2 - insertOffset1) * this.structByteSize, this.buffer.usage, newData);
        } else {
            newDataBuffer = GPU.createBuffer((insertOffset2 - insertOffset1) * this.structByteSize, this.buffer.usage);
        }
        this.buffer = GPU.concatBuffer(GPU.concatBuffer(beforeBuffer, newDataBuffer), afterBuffer);
    }
}