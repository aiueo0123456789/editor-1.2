import { ModalOperator } from "../../../../../utils/ui/modalOperator";

export class VerticesAppendModal {
    constructor(/** @type {ModalOperator} */operator) {
        this.operator = operator;
        this.target = null;
        this.position = [];
    }
}