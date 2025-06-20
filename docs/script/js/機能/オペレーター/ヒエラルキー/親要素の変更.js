import { app } from "../../../app.js";

export class ChangeParentCommand {
    constructor(target) {
        this.target = target;
        this.originalParent = target.parent;
        this.newParent = null;
    }

    update(parent) {
        this.newParent = parent;
        app.hierarchy.sortHierarchy(this.newParent, this.target);
    }

    execute() {
        app.hierarchy.sortHierarchy(this.newParent, this.target);
    }

    undo() {
        app.hierarchy.sortHierarchy(this.originalParent, this.target);
    }
}
