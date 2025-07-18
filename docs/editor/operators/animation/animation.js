// 管理のコマンド
export class AnimationManager {
    constructor(manager, type, data) {
        this.manager = manager;
        this.type = type;
        this.data = data;
        this.objectId = null;
    }

    execute() {
        this.objectId = this.manager.createObjectAndSetUp(this.type, this.data);
    }

    undo() {
        if (this.objectId !== null) {
            this.manager.deleteObject(this.objectId);
        }
    }
}

export class AnimationDeleteCommand {
    constructor() {
        // this.
    }
}