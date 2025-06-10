import { setParentModifierWeight } from "./オブジェクト/オブジェクトで共通の処理.js";

export class Children {
    constructor() {
        this.objects = [];
    }

    getChildren() {
        return this.objects;
    }

    addChild(object) {
        this.objects.push(object);
    }

    deleteChild(object) {
        this.objects.splice(this.objects.indexOf(object), 1);
    }

    weightReset() {
        this.objects.forEach(x => {
            setParentModifierWeight(x);
        })
    }
}