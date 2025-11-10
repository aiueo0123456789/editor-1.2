import { app } from "../../../main.js";
import { BArmatureAnimation } from "../../core/edit/objects/BArmatureAnimation.js";
import { managerForDOMs } from "../../utils/ui/util.js";
import { hitTestPointTriangle } from "../../utils/utility.js";

export class SelectOnlyBoneCommand {
    constructor(point,multiple) {
        this.multiple = multiple;
        this.editObjects = app.scene.editData.allEditObjects.filter(editData => editData instanceof BArmatureAnimation); // オブジェクトモードに移行する場合は前のモードで使っていた編集用オブジェクトを保持
        let minIndex = 0;
        let minObjectID = 0;
        this.originalSelectData = {};
        this.editObjects.forEach(editObject => {
            const objectID = editObject.id;
            this.originalSelectData[objectID] = editObject.bonesSelectData;
            const bonesPolygons = editObject.bonesPolygons;
            for (const polygons of bonesPolygons) {
                if (hitTestPointTriangle(polygons[0], polygons[1], polygons[2], point) || hitTestPointTriangle(polygons[3], polygons[1], polygons[2], point)) {
                    minIndex = bonesPolygons.indexOf(polygons);
                    minObjectID = objectID;
                }
            }
        })
        this.selectData = {};
        this.selectData[minObjectID] = [minIndex];
    }

    execute() {
        this.editObjects.forEach(editObject => {
            const objectID = editObject.id;
            if (this.multiple) {
                editObject.selectedClear();
            }
            if (this.selectData[objectID]) {
                editObject.select(this.selectData[objectID]);
            }
        })
        managerForDOMs.update({o: "ボーン選択"});
        return {consumed: true};
    }

    undo() {
        this.editObjects.forEach(editObject => {
            const objectID = editObject.id;
            editObject.selectedClear();
            const originalIndexs = [];
            this.originalSelectData[objectID].forEach((bool, index) => {
                if (bool) {
                    originalIndexs.push(index);
                }
            })
            editObject.select(originalIndexs);
            managerForDOMs.update({o: "ボーン選択"});
        })
    }
}