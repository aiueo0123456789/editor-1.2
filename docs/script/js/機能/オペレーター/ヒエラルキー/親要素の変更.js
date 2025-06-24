import { app } from "../../../app.js";

export class ChangeParentCommand {
    constructor(targets) {
        this.targets = targets;
        this.originalParent = targets.map(target => target.parent);
        this.newParent = null;
    }

    update(parent) {
        this.newParent = parent;
    }

    execute() {
        this.targets.forEach((target) => {
            app.hierarchy.sortHierarchy(this.newParent, target);
        })
    }

    undo() {
        this.targets.forEach((target, index) => {
            app.hierarchy.sortHierarchy(this.originalParent[index], target);
        })
    }
}
