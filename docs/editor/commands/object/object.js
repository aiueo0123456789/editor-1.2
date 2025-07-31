import { app } from "../../app/app.js";

// 追加のコマンド
export class CreateObjectCommand {
    constructor(data) {
        this.object = null;
        this.object = app.scene.objects.createObject(data);
    }

    execute() {
        app.scene.objects.appendObject(this.object);
        app.hierarchy.addHierarchy("", this.object)
    }

    undo() {
        app.hierarchy.removeHierarchy(this.object); // ヒエラルキーから削除
        app.scene.objects.removeObject(this.object);
    }
}

// 削除コマンド
export class DeleteObjectCommand {
    constructor(objects) {
        this.objects = [...objects];
    }

    execute() {
        for (const object of this.objects) {
            app.hierarchy.removeHierarchy(object); // ヒエラルキーから削除
            app.scene.objects.removeObject(object);
        }
    }

    undo() {
        for (const object of this.objects) {
            app.scene.objects.appendObject(object);
            app.hierarchy.addHierarchy("", object)
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
            app.hierarchy.sortHierarchy(this.newParent, target);
        })
    }

    undo() {
        this.targets.forEach((target, index) => {
            app.hierarchy.sortHierarchy(this.originalParent[index], target);
        })
    }
}