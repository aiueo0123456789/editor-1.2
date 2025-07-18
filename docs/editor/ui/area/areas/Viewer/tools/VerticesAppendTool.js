import { ModalOperator } from "../../補助/ModalOperator.js";

export class VerticesAppendModal {
    constructor(/** @type {ModalOperator} */operator) {
        this.operator = operator;
        this.target = null;
        this.position = [];
    }
}