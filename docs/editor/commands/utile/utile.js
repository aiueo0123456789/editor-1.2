import { changeParameter } from "../../utils/utility.js";

export class ChangeParameterCommand {
    constructor(object, parameter, value = "") {
        this.object = object;
        this.parameter = parameter;
        this.originalValue = object[parameter];
        this.value = "";
        if (value) {
            this.update(value);
        }
    }

    update(value) {
        this.value = value;
        changeParameter(this.object, this.parameter, value);
    }

    execute() {
        changeParameter(this.object, this.parameter, this.value);
    }

    undo() {
        changeParameter(this.object, this.parameter, this.originalValue);
    }
}