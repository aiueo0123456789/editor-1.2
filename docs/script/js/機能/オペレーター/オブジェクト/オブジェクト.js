import { hierarchy } from "../../../ヒエラルキー.js";

function destroy(object) {
    hierarchy.destroy(object);
}

// 管理クラス
export class ObjectManager {
    constructor() {
    }

    createObject(type, data) {
        return hierarchy.addEmptyObject(type);
    }

    deleteObject(object) {
        destroy(object);
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