import { app } from "../../../main.js";
import { BArmature } from "../../core/edit/BArmature.js";
import { BBezier } from "../../core/edit/BBezier.js";
import { BMesh } from "../../core/edit/BMesh.js";
import { mathVec2 } from "../../utils/mathVec.js";
import { managerForDOMs } from "../../utils/ui/util.js";

export class SelectOnlyVertexCommand {
    constructor(point,multiple) {
        this.multiple = multiple;
        this.editObjects = app.scene.editData.allEditObjects.filter(editData => editData instanceof BMesh || editData instanceof BBezier || editData instanceof BArmature); // オブジェクトモードに移行する場合は前のモードで使っていた編集用オブジェクトを保持
        let minDis = Infinity;
        let minIndex = 0;
        let minObjectID = 0;
        this.originalSelectData = {};
        this.editObjects.forEach(editObject => {
            const objectID = editObject.id;
            this.originalSelectData[objectID] = editObject.verticesSelectData;
            const vertices = editObject.verticesCoordinates;
            for (const vertex of vertices) {
                const dist = mathVec2.distanceR(vertex, point);
                if (dist < minDis) {
                    minDis = dist;
                    minIndex = vertices.indexOf(vertex);
                    minObjectID = objectID;
                }
            }
        })
        this.selectData = {};
        this.selectData[minObjectID] = [minIndex];
    }

    execute() {
        let hasDiff = false;
        this.editObjects.forEach(editObject => {
            const objectID = editObject.id;
            if (this.multiple) {
                editObject.selectedClear();
            }
            if (this.selectData[objectID]) {
                editObject.select(this.selectData[objectID]);
            }
        })
        this.editObjects.forEach(editObject => {
            const objectID = editObject.id;
            if (this.originalSelectData[objectID].filter((b, index) => editObject.verticesSelectData[index] !== b).length != 0) {
                hasDiff = true;
            }
        })
        managerForDOMs.update({o: "頂点選択"});
        return {consumed: hasDiff};
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
            managerForDOMs.update({o: "頂点選択"});
        })
    }
}