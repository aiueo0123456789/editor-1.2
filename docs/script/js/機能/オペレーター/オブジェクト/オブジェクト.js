import { app } from "../../../app.js";

// 管理クラス
export class ObjectManager {
    constructor() {
    }

    createObject(type, data) {
        return app.scene.createObject({type: type});
    }

    deleteObject(object) {
        app.scene.deleteObject(object);
    }

    changeParent(object, newParent) {
        app.hierarchy.sortHierarchy(newParent,object);
    }

    changeMode(object, newMode) {
        object.mode = newMode;
    }
}

// 追加のコマンド
export class CreateObjectCommand {
    constructor(manager, type, data) {
        this.manager = manager;
        this.type = type;
        this.data = data;
        this.object = null;
    }

    execute() {
        this.object = this.manager.createObject(this.type, this.data);
    }

    undo() {
        if (this.object !== null) {
            this.manager.deleteObject(this.object);
        }
    }
}

// 削除コマンド
export class DeleteObjectCommand {
    constructor(manager, type, data) {
        this.manager = manager;
        this.object = null;
    }

    execute() {
        this.object = this.manager.createObject(this.type, this.data);
    }

    undo() {
        if (this.object !== null) {
            this.manager.createObject(this.object);
        }
    }
}

export class SetParentObjectManager {
    constructor(manager, target, parent) {
        this.manager = manager;
        this.target = target;
        this.parent = parent;
        this.beforeParent = null;
    }

    execute() {
        console.log("実行",this.parent,this.target)
        this.beforeParent = this.target.parent;
        this.manager.changeParent(this.target, this.parent);
    }

    undo() {
        console.log("巻き戻し",this.beforeParent,this.target)
        this.manager.changeParent(this.target, this.beforeParent);

    }
}