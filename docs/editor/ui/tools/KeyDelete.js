import { app } from "../../../main.js";
import { ToolPanelOperator } from "../../operators/toolPanelOperator.js";

export class KeyDelete {
    constructor(/** @type {ToolPanelOperator} */operator) {
        this.operator = operator;
        this.selectKeys = app.appConfig.areasConfig["Timeline"].getSelectKey();
        this.activateKey = "x";
    }

    init() {
        return {complete: true};
    }

    execute() {
        this.selectKeys.forEach((key) => {
            key.keyframeBlock.deleteKeyframe(key);
        })
    }
}