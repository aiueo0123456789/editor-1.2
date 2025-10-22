import { changeParameter, isFunction } from "../../utils/utility.js";

export class ChangeParameterCommand {
    constructor(object, parameter, value = "", customFunction = null) {
        this.object = object;
        this.parameter = parameter;
        this.originalValue = object[parameter];
        this.value = "";
        this.customFunction = customFunction;
        if (value) {
            this.update(value);
        }
    }

    update(value) {
        this.value = value;
        if (isFunction(this.customFunction)) {
            this.customFunction(this.object, this.parameter, this.value);
        } else {
            changeParameter(this.object, this.parameter, this.value);
        }
    }

    execute() {
        if (isFunction(this.customFunction)) {
            this.customFunction(this.object, this.parameter, this.value);
        } else {
            changeParameter(this.object, this.parameter, this.value);
        }
        return {consumed: this.originalValue !== this.value};
    }

    undo() {
        if (isFunction(this.customFunction)) {
            this.customFunction(this.object, this.parameter, this.originalValue);
        } else {
            changeParameter(this.object, this.parameter, this.originalValue);
        }
    }
}