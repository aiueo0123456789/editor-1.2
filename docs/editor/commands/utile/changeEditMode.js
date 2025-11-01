import { app } from "../../../main.js";
import { managerForDOMs } from "../../utils/ui/util.js";
import { changeParameter } from "../../utils/utility.js";

export class ChangeEditModeCommand {
    constructor(mode) {
        this.targetObjects = app.context.selectedObjects;
        this.originalMode = app.context.currentMode;
        this.newMode = mode;
        if (this.newMode == "オブジェクト") {
            this.editObjects = this.targetObjects.map(object => app.scene.editData.getEditObjectByObject(object)); // オブジェクトモードに移行する場合は前のモードで使っていた編集用オブジェクトを保持
        } else {
            this.editObjects = this.targetObjects.map(object => app.scene.editData.createEditObject(object, this.newMode));
        }
    }

    execute() {
        console.log("モードの切り替え",this.newMode)
        if (this.targetObjects.length == 0) return ;
        changeParameter(app.context, "currentMode", this.newMode);
        this.targetObjects.forEach((object, index) => {
            object.mode = this.newMode;
            if (this.newMode == "オブジェクト") { // メッシュ編集などからオブジェクト
                // 編集データを適用して編集用オブジェクトを削除
                app.scene.editData.getEditObjectByObject(object).toRutime();
                app.scene.editData.deleteEditObject(object);
            } else { // オブジェクトからメッシュ編集など
                // 編集ようオブジェクトを追加
                app.scene.editData.appendEditObject(object, this.editObjects[index]);
            }
        })
        managerForDOMs.update({o: "changeEditMode"});
        return {consumed: true};
    }

    undo() {
        if (this.targetObjects.length == 0) return ;
        changeParameter(app.context, "currentMode", this.originalMode);
        this.targetObjects.forEach((object, index) => {
            object.mode = this.originalMode;
            if (this.originalMode == "オブジェクト") { // メッシュ編集などからオブジェクト
                // 編集データを適用して編集用オブジェクトを削除
                app.scene.editData.getEditObjectByObject(object).toRutime();
                app.scene.editData.deleteEditObject(object);
            } else { // オブジェクトからメッシュ編集など
                // 編集ようオブジェクトを追加
                app.scene.editData.appendEditObject(object, this.editObjects[index]);
            }
        })
        managerForDOMs.update({o: "changeEditMode"});
        console.log(app);
    }
}