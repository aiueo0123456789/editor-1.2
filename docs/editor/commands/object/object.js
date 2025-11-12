import { app } from "../../../main.js";

// 追加のコマンド
export class CreateObjectCommand {
    constructor(data) {
        this.object = app.scene.objects.createObject(data);
    }

    execute() {
        app.scene.objects.appendObject(this.object);
        return {consumed: true};
    }

    undo() {
        app.scene.objects.remove(this.object);
    }
}

// 追加のコマンド
export class CopyObjectCommand {
    constructor(object) {
        this.srcObject = object;
        this.newObject = null;
    }

    async execute() {
        this.newObject = app.scene.objects.createObject(await this.srcObject.getSaveData());
        app.scene.objects.appendObject(this.newObject);
        return {consumed: true};
    }

    redo() {
        app.scene.objects.appendObject(this.newObject);
    }

    undo() {
        app.scene.objects.remove(this.newObject);
    }
}

// 削除コマンド
export class DeleteObjectCommand {
    constructor(objects) {
        this.objects = [...objects];
    }

    execute() {
        for (const object of this.objects) {
            app.scene.objects.removeObject(object);
        }
        return {consumed: true};
    }

    undo() {
        for (const object of this.objects) {
            app.scene.objects.appendObject(object);
        }
    }
}

// 親要素の変更
export class ChangeParentCommand {
    constructor(targets, newParent) {
        this.targets = [...targets];
        this.originalParent = targets.map(target => target.parent);
        this.newParent = newParent;
    }

    update(newParent) {
        this.newParent = newParent;
    }

    execute() {
        this.targets.forEach((target) => {
            target.changeParent(this.newParent);
        })
        return {consumed: true};
    }

    undo() {
        this.targets.forEach((target, index) => {
            target.changeParent(this.originalParent[index]);
        })
    }
}