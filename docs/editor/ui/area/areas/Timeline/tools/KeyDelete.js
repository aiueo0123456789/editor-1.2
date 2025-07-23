import { app } from "../../../../../app/app.js";
import { ModalOperator } from "../../../../../operators/modalOperator.js";

export class KeyDelete {
    constructor(/** @type {ModalOperator} */operator) {
        this.operator = operator;
        this.selectKeys = app.appConfig.areasConfig["Timeline"].getSelectKey();
        this.activateKey = "x";
    }

    init() {
        this.selectKeys.forEach((key) => {
            key.keyframeBlock.deleteKeyframe(key);
        })
        return {complete: true};
    }
}