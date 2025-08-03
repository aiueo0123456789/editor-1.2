import { createID } from "../../utils/ui/util.js";

export class Script {
    constructor(data) {
        this.name = data.name;
        this.type = "スクリプト";
        this.id = data.id ? data.id : createID()
        this.text = data.text;
    }
}