import { app } from "../../../main.js";

// 追加のコマンド
export class CreateObjectCommand {
    constructor(data) {
        this.object = app.scene.objects.createObject(data);
    }

    execute() {
        app.scene.objects.appendObject(this.object);
    }

    undo() {
        app.scene.objects.remove(this.object);
    }
}

// 削除コマンド
export class RemoveObjectCommand {
    constructor(objects) {
        this.objects = [...objects];
    }

    execute() {
        for (const object of this.objects) {
            app.scene.objects.removeObject(object);
        }
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

    execute() {
        this.targets.forEach((target) => {
            target.changeParent(this.newParent);
        })
    }

    undo() {
        this.targets.forEach((target, index) => {
            target.changeParent(this.originalParent[index]);
        })
    }
}