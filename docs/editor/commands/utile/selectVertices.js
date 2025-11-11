import { app } from "../../../main.js";
import { BArmature } from "../../core/edit/objects/BArmature.js";
import { BBezier } from "../../core/edit/objects/BBezier.js";
import { BBezierShapeKey } from "../../core/edit/objects/BBezierShapeKey.js";
import { BMesh } from "../../core/edit/objects/BMesh.js";
import { BMeshShapeKey } from "../../core/edit/objects/BMeshShapeKey.js";
import { MathVec2 } from "../../utils/mathVec.js";
import { managerForDOMs } from "../../utils/ui/util.js";

export class SelectOnlyVertexCommand {
    constructor(point,multiple) {
        this.multiple = multiple;
        this.editObjects = app.scene.editData.allEditObjects.filter(editData => editData instanceof BMesh || editData instanceof BMeshShapeKey || editData instanceof BBezier || editData instanceof BBezierShapeKey || editData instanceof BArmature); // オブジェクトモードに移行する場合は前のモードで使っていた編集用オブジェクトを保持
        let minDis = Infinity;
        let minIndex = [0];
        let minObjectID = [0];
        this.originalSelectData = {};
        this.editObjects.forEach(editObject => {
            const objectID = editObject.id;
            this.originalSelectData[objectID] = editObject.verticesSelectData;
            let verticesCoordinates;
            if (editObject instanceof BMeshShapeKey || editObject instanceof BBezierShapeKey) verticesCoordinates = editObject.activeShapeKey.data.map(vertex => vertex.co);
            else verticesCoordinates = editObject.vertices.map(vertex => vertex.co);
            for (const vertex of verticesCoordinates) {
                const dist = MathVec2.distanceR(vertex, point);
                if (dist <= minDis) {
                    if (dist < minDis) { // ==じゃないなら配列の長さをリセット
                        minIndex.length = 0;
                        minObjectID.length = 0;
                    }
                    minDis = dist;
                    minIndex.push(verticesCoordinates.indexOf(vertex));
                    minObjectID.push(objectID);
                }
            }
        })
        this.selectData = {};
        let index = Math.floor(Math.random() * minObjectID.length); // 同じ位置に複数あった場合どれを選択するか使うか
        this.selectData[minObjectID[index]] = [minIndex[index]];
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