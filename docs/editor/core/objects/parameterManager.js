import { createID } from "../../utils/ui/util.js";

class Parameter {
    constructor(data) {
        this.label = data.label;
        this.value = data.value;
    }

    getSaveData() {
        return {
            label: this.label,
            value: this.value,
        };
    }
}

export class ParameterManager {
    static createParameter(label = "名称未設定", value = 0) {
        return new Parameter({label: label, value: value});
    }
    constructor(data) {
        this.type = "パラメーターマネージャー";
        this.name = data.name ? data.name : "名称未設定";
        this.id = data.id ? data.id : createID();
        this.parameters = data.parameters ? data.parameters.map(parameterData => new Parameter(parameterData)) : [];
        console.log(data)
        console.log(this)
    }

    getSaveData() {
        return {
            type: this.type,
            name: this.name,
            id: this.id,
            parameters: this.parameters.map(parameter => parameter.getSaveData()),
        };
    }
}