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
        if (object.autoWeight) {
            app.options.assignWeights(object);
        }
    }

    deleteChild(object) {
        this.objects.splice(this.objects.indexOf(object), 1);
    }

    weightReset() {
        this.objects.forEach(x => {
            if (object.autoWeight) {
                app.options.assignWeights(addObject);
            }
        })
    }
}