import { app } from "../../../../main.js";
import { MathVec2 } from "../../../utils/mathVec.js";
import { createID, managerForDOMs } from "../../../utils/ui/util.js";
import { pushToArray, roundUp } from "../../../utils/utility.js";
import { GPU } from "../../../utils/webGPU.js";
import { BezierModifier } from "../../objects/bezierModifier.js";

class Vert {
    constructor(data) {
        this.co = [...data.co];
        this.index = data.index;
        this.selected = false;
    }
}

class ShapeKey {
    constructor(data) {
        this.id = data.id ? data.id : createID();
        this.name = data.name;
        /** @type {ShapeKeyVert[]} */
        this.data = data.data;
        this.selected = false;
    }
}

class ShapeKeyVert {
    constructor(data) {
        /** @type {int[]} */
        this.co = [...data.co];
    }
}

export class BBezierShapeKey {
    constructor() {
        /** @type {BezierModifier} */
        this.object = null;
        /** @type {Vert[]} */
        this.vertices = [];
        /** @type {ShapeKey[]} */
        this.shapeKeys = [];

        /** @type {ShapeKey} */
        this.activeShapeKey = null;

        /** @type {Vert} */
        this.activeVertex = null;
    }

    createShapeKey(name) {
        const data = [];
        for (const vertex of this.vertices) {
            data.push(new ShapeKeyVert({co: vertex.co}));
        }
        return new ShapeKey({name: name, data: data});
    }

    // object.id
    get id() {
        return this.object.id;
    }

    // 頂点の表示状況をbool[]でかえす
    get verticesSelectData() {
        return this.vertices.map(vertex => vertex.selected);
    }
    // 頂点(object)から頂点indexを返す
    getVertexIndexByVertex(vertex) {
        return this.vertices.indexOf(vertex);
    }

    // 選択情報のクリア
    selectedClear() {
        this.vertices.forEach(vertex => {
            vertex.selected = false;
            GPU.writeBuffer(this.vertexSelectedBuffer, GPU.createBitData([0], ["u32"]), this.getVertexIndexByVertex(vertex) * 4);
        });
        this.activeVertex = null;
    }

    // 頂点選択
    select(/** @type {Array} */ indexs) {
        indexs.forEach(index => {
            this.vertices[index].selected = true;
            this.activeVertex = this.vertices[index];
            GPU.writeBuffer(this.vertexSelectedBuffer, GPU.createBitData([1], ["u32"]), index * 4);
        });
    }

    get selectedVertices() {
        return this.vertices.filter(vert => vert.selected);
    }

    get verticesNum() {
        return this.vertices.length;
    }

    get pointsNum() {
        return this.vertices.length / 3;
    }

    updateGPUData() {
        if (this.activeShapeKey) this.verticesBuffer = GPU.createStorageBuffer(roundUp(this.vertices.length * 2 * 4, 2 * 4), this.vertices.map(vertex => this.activeShapeKey.data[vertex.index].co).flat(), ["f32", "f32"]);
        else this.verticesBuffer = GPU.createStorageBuffer(roundUp(this.vertices.length * 2 * 4, 2 * 4), this.vertices.map(vertex => vertex.co).flat(), ["f32", "f32"]);
        this.vertexSelectedBuffer = GPU.createStorageBuffer(roundUp(this.vertices.length * 4, 4), this.vertices.map(vertex => vertex.selected ? 1 : 0), ["u32"]);
        this.renderingGroup = GPU.createGroup(GPU.getGroupLayout("Vsr_Vsr"), [this.verticesBuffer, this.vertexSelectedBuffer]);
    }

    async fromBezier(/** @type {BezierModifier} */object) {
        const bezierModifierData = app.scene.runtimeData.bezierModifierData;
        this.object = object;
        const [coordinates,shape] = await Promise.all([
            bezierModifierData.baseVertices.getObjectData(object),
            bezierModifierData.shapeKeys.getObjectData(object)
        ]);
        for (let i = 0; i < coordinates.length; i ++) {
            this.vertices.push(new Vert({co: coordinates[i].slice(0,2), index: i * 3}));
            this.vertices.push(new Vert({co: coordinates[i].slice(2,4), index: i * 3 + 1}));
            this.vertices.push(new Vert({co: coordinates[i].slice(4,6), index: i * 3 + 2}));
        }
        this.object.shapeKeyMetaDatas.forEach((shapeKeyMetaDta, shapeKeyIndex) => {
            const data = [];
            for (let vertrxIndex = 0; vertrxIndex < coordinates.length; vertrxIndex ++) {
                data.push(new ShapeKeyVert({co: MathVec2.addR(shape[shapeKeyIndex * coordinates.length + vertrxIndex].slice(0,2), coordinates[vertrxIndex].slice(0,2))}));
                data.push(new ShapeKeyVert({co: MathVec2.addR(shape[shapeKeyIndex * coordinates.length + vertrxIndex].slice(2,4), coordinates[vertrxIndex].slice(2,4))}));
                data.push(new ShapeKeyVert({co: MathVec2.addR(shape[shapeKeyIndex * coordinates.length + vertrxIndex].slice(4,6), coordinates[vertrxIndex].slice(4,6))}));
            }
            pushToArray(this.shapeKeys, new ShapeKey({name: shapeKeyMetaDta.name, data: data, id: shapeKeyMetaDta.id}));
        })
        this.activeShapeKey = this.shapeKeys[0];
        this.updateGPUData();
    }

    toRutime() {
        this.object.allShapeKeyWeights.length = 0;
        this.object.allShapeKeys.length = 0;
        this.object.shapeKeyMetaDatas.length = 0;
        this.shapeKeys.forEach((shapeKey, shapeKeyIndex) => {
            this.object.allShapeKeyWeights.push(1);
            this.object.allShapeKeys.push(...shapeKey.data.map((vertex, vertexIndex) => MathVec2.subR(vertex.co, this.vertices[vertexIndex].co)).flat());
            this.object.shapeKeyMetaDatas.push(this.object.createShapeKeyMetaData(shapeKey.name, shapeKeyIndex, shapeKey.id));
        })
        const bezierModifierData = app.scene.runtimeData.bezierModifierData;
        bezierModifierData.update(this.object);
        managerForDOMs.update({o: this.object.shapeKeyMetaDatas});
    }
}