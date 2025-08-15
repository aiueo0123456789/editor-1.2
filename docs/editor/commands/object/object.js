import { app } from "../../app/app.js";

// 追加のコマンド
export class CreateObjectCommand {
    constructor(data) {
        this.object = null;
        this.object = app.scene.objects.createObject(data);
    }

    execute() {
        app.scene.objects.appendObject(this.object);
        app.scene.hierarchy.append(this.object, "")
    }

    undo() {
        app.scene.hierarchy.remove(this.object); // ヒエラルキーから削除
        app.scene.objects.remove(this.object);
    }
}

// 削除コマンド
export class DeleteObjectCommand {
    constructor(objects) {
        this.objects = [...objects];
    }

    execute() {
        for (const object of this.objects) {
            app.scene.hierarchy.remove(object); // ヒエラルキーから削除
            app.scene.objects.removeObject(object);
        }
    }

    undo() {
        for (const object of this.objects) {
            app.scene.objects.appendObject(object);
            app.scene.hierarchy.append(object, "")
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
            app.scene.hierarchy.insert(target, this.newParent);
        })
    }

    undo() {
        this.targets.forEach((target, index) => {
            app.scene.hierarchy.insert(target, this.originalParent[index]);
        })
    }
}