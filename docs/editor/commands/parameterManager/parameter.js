import { ParameterManager } from "../../core/objects/parameterManager.js";
import { indexOfSplice, insertToArray, pushToArray } from "../../utils/utility.js";

export class AppendParameterInParameterManager {
    constructor(/** @type {ParameterManager} */parameterManager) {
        this.parameterManager = parameterManager;
        this.newParameter = ParameterManager.createParameter();
    }

    execute() {
        pushToArray(this.parameterManager.parameters, this.newParameter);
        return {consumed: true};
    }

    undo() {
        indexOfSplice(this.parameterManager.parameters, this.newParameter);
    }
}

export class DeleteParameterInParameterManager {
    constructor(/** @type {ParameterManager} */parameterManager, parameter) {
        this.parameterManager = parameterManager;
        this.deleteParameter = parameter;
        this.deleteIndex = 0;
    }

    execute() {
        this.deleteIndex = indexOfSplice(this.parameterManager.parameters, this.deleteParameter);
        return {consumed: true};
    }

    undo() {
        console.log("巻き戻し",this)
        insertToArray(this.parameterManager.parameters, this.deleteIndex, this.deleteParameter);
    }
}