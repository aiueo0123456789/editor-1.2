import { app } from "./app.js";

export class Children {
    constructor() {
        this.objects = [];
    }

    getChildren() {
        return this.objects;
    }

    addChild(object) {
        this.objects.push(object);
        app.options.assignWeights(object);
    }

    deleteChild(object) {
        this.objects.splice(this.objects.indexOf(object), 1);
    }

    weightReset() {
        this.objects.forEach(x => {
            app.options.assignWeights(addObject);
        })
    }
}