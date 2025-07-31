import { createID, managerForDOMs } from "../../utils/ui/util.js";
import { indexOfSplice, arrayToPush } from "../../utils/utility.js";

export class ParameterManager {
    constructor(data) {
        this.type = "パラメーターマネージャー";
        this.name = data.name ? data.name : "名称未設定";
        this.id = data.id ? data.id : createID();
        this.parameters = [
            {type: "number", label: "test", value: 0, targetValue: null},
            {type: "text", label: "test2", value: "aaa", targetValue: null}
        ];
        this.targets = [];
        managerForDOMs.set({o: this.parameters, id: "&all"}, null, () => {
            for (const data of this.parameters) {
                for (const object of this.targets) {
                    if (data.targetValue in object) {
                        object[data.targetValue] = data.value;
                    }
                }
            }
        });
    }

    getNodeData() {
        const node = {type: "section", name: this.name, children: []};
        // for (const data of this.parameters) {
        this.parameters.forEach((data,index) => {
            node.children.push({type: "input", label: data.label, withObject: `/parameters/${index}/value`, options: {type: data.type}});
        })
        return [node];
    }

    append(object) {
        arrayToPush(this.targets, object);
    }

    remove(object) {
        indexOfSplice(this.targets, object);
    }

    getSaveData() {
        return {
            type: this.type,
            name: this.name,
            id: this.id,
            parameters: this.parameters,
            targets: this.targets.map(target => target.id),
        };
    }
}