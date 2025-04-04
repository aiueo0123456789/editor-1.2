// 管理クラス
export class ObjectManager {
    constructor() {
        this.objects = {}; // IDをキーにオブジェクトを管理
        this.nextId = 1;
    }

    createObject(type, data) {
        const id = this.nextId++;
        this.objects[id] = { id, type, data };
        return id;
    }

    deleteObject(id) {
        delete this.objects[id];
    }
}

// 追加のコマンド
export class CreateObjectCommand {
    constructor(manager, type, data) {
        this.manager = manager;
        this.type = type;
        this.data = data;
        this.objectId = null;
    }

    execute() {
        this.objectId = this.manager.createObject(this.type, this.data);
    }

    undo() {
        if (this.objectId !== null) {
            this.manager.deleteObject(this.objectId);
        }
    }
}

// 削除コマンド
export class DeleteObjectCommand {
    constructor(manager, id) {
        this.manager = manager;
        this.type = type;
        this.data = data;
        this.objectId = null;
    }

    execute() {
        this.objectId = this.manager.createObject(this.type, this.data);
    }

    undo() {
        if (this.objectId !== null) {
            this.manager.deleteObject(this.objectId);
        }
    }
}