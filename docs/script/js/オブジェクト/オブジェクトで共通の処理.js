import { GPU } from "../webGPU.js";
import { setModifierWeightToGraphicMeshPipeline, setBezierModifierWeightToGraphicMeshPipeline, calculateArmatureWeightToVerticesPipeline } from "../GPUObject.js";
import { calculateBBoxFromAllVertices } from "../BBox.js";
import { vec2 } from "../ベクトル計算.js";
import { createID, managerForDOMs } from "../UI/制御.js";

export class ObjectBase {
    constructor(name,type,id = createID()) {
        this.isChange = true;
        this.isInit = false;
        this.type = type;
        this.name = name;
        this.id = id;

        this.selected = false;

        this.mode = "オブジェクト";
    }
}

export class VerticesObjectBase {
    constructor() {
        this.B_Vert_co = null; // baseVerticesCoordinate
        this.R_Vert_co = null; // renderingVerticesCoordinate
        this.parent = ""; // 親要素

        this.vertNum = 0; // 頂点数
    }
}

export class ObjectEditorBase {
    constructor() {
        this.mode = "Object";
        this.BBox = {min: [0,0], max: [0,0], width: 0, height: 0, center: [0,0]};
    }
}

export function setParentModifierWeight(object) {
    if (object.parent != "" && object.weightAuto) {
        object.isChange = true;
        if (object.parent.type == "モディファイア") {
            object.parentWeightBuffer = GPU.createStorageBuffer(object.verticesNum * (4 + 4) * 4, undefined, ["f32"]);
            const setParentModifierWeightBlock = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr"), [{item: object.parentWeightBuffer, type: 'b'}, {item: object.s_baseVerticesPositionBuffer, type: 'b'}]);
            GPU.runComputeShader(setModifierWeightToGraphicMeshPipeline, [setParentModifierWeightBlock, object.parent.modifierDataGroup], Math.ceil(object.verticesNum / 64));
        } else if (object.parent.type == "ベジェモディファイア") {
            object.parentWeightBuffer = GPU.createStorageBuffer(object.verticesNum * (1 + 1) * 4, undefined, ["f32"]);
            const setParentModifierWeightBlock = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr"), [{item: object.parentWeightBuffer, type: 'b'}, {item: object.s_baseVerticesPositionBuffer, type: 'b'}]);
            GPU.runComputeShader(setBezierModifierWeightToGraphicMeshPipeline, [setParentModifierWeightBlock, object.parent.modifierDataGroup], Math.ceil(object.verticesNum / 64));
        } else if (object.parent.type == "アーマチュア") {
            object.parentWeightBuffer = GPU.createStorageBuffer(object.verticesNum * (4 + 4) * 4, undefined, ["f32"]);
            const setParentModifierWeightBlock = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr"), [{item: object.parentWeightBuffer, type: 'b'}, {item: object.s_baseVerticesPositionBuffer, type: 'b'}]);
            GPU.runComputeShader(calculateArmatureWeightToVerticesPipeline, [setParentModifierWeightBlock, object.parent.modifierDataGroup], Math.ceil(object.verticesNum / 64));
            // GPU.consoleBufferData(object.parentWeightBuffer, ["u32","u32","u32","u32","f32","f32","f32","f32"]);
        }
        object.renderWegihtGroup = GPU.createGroup(GPU.getGroupLayout("Vsr_Vsr"), [{item: object.RVrt_coBuffer, type: 'b'}, {item: object.parentWeightBuffer, type: 'b'}]);
        object.modifierTransformGroup = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr"), [{item: object.RVrt_coBuffer, type: 'b'}, {item: object.parentWeightBuffer, type: 'b'}]);
    }
}

export function setBaseBBox(object) {
    calculateBBoxFromAllVertices(object.calculateAllBaseBBoxGroup, object.verticesNum);
    GPU.copyBufferToArray(object.baseBBoxBuffer,object.baseBBox);
}

export function searchAnimation(object, animationName) {
    for (const animation of object.animationBlock.animationBlock) {
        if (animation.name == animationName) return animation;
    }
    return null;
}

export function appendAnimationToObject(object, name) {
    console.log("アニメーションの追加",object,name)
    object.animationBlock.appendAnimation(name);
}

export function deleteAnimationToObject(object, animation) {
    object.animationBlock.deleteAnimation(animation);
}

export function sharedDestroy(object) {
    managerForDOMs.deleteObject(object);
    object.animationBlock.destroy();
    object.editor.destroy();
    object.animationBlock = null;
    object.editor = null;
}

export class BoundingBox {
    constructor() {
        this.min = [0,0];
        this.max = [0,0];
        this.width = 0;
        this.height = 0;
        this.center = [0,0]
    }

    set(data) {
        if (data.min && data.max) {
            this.min = data.min;
            this.max = data.max;
            vec2.reverseScale(this.center, vec2.addR(this.min,this.max), 2);
            [this.width,this.height] = vec2.subR(this.max,this.min);
        }
    }

    setWidthAndHeight(width, height) {
        this.width = width;
        this.height = height;

        let radius = vec2.reverseScaleR([width,height], 2);
        this.min = vec2.subR(this.center, radius);
        this.max = vec2.addR(this.center, radius);
    }
}