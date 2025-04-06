import { hierarchy } from "../../../ヒエラルキー.js";

// 管理クラス
export class ObjectManager {
    constructor() {
    }

    createObject(type, data) {
        return hierarchy.addEmptyObject(type);
    }

    deleteObject(object) {
        hierarchy.deleteObjectInHierarchy(object);
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
    constructor(target, parent) {
        console.log("かおwdじ")
        this.target = target;
        this.parent = parent;
        this.beforeParent = null;
    }

    execute() {
        console.log("実行",this.parent,this.target)
        this.beforeParent = this.target.parent;
        hierarchy.sortHierarchy(this.parent,this.target);
    }

    undo() {
        console.log("巻き戻し",this.beforeParent,this.target)
        hierarchy.sortHierarchy(this.beforeParent,this.target);
    }
}