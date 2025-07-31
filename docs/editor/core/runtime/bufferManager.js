import { createArrayN, isNumber } from "../../utils/utility.js";
import { GPU } from "../../utils/webGPU.js";

export class BufferManager {
    constructor(runtimeData, bufferName, struct, calculateFormula) {
        this.runtimeData = runtimeData;
        this.bufferName = bufferName;
        // this.buffer = GPU.createBuffer(0, ["s"]);
        this.buffer = GPU.createBuffer(0, ["v","s"]);
        this.struct = struct;
        this.structByteSize = GPU.getStructByteSize(struct);
        this.formula = calculateFormula;
        this.formulaParts = calculateFormula.split(" ");
        this.formulaParts = this.formulaParts.map(value => isNumber(value) ? Number(value) : value);
        this.sourceOffsetType = "";
    }

    async getObjectData(object) {
        const offset = object.runtimeOffsetData[this.sourceOffsetType];
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

    get influenceValues() {
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
        // GPU.writeBuffer(this.buffer, GPU.createBitData(createArrayN(this.runtimeData.order.lenght * this.struct, [])));
        this.buffer.destroy();
        this.buffer = GPU.createBuffer(0, ["v","s"]);
    }

    delete(object) {
        const offset = object.runtimeOffsetData[this.sourceOffsetType];
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
}