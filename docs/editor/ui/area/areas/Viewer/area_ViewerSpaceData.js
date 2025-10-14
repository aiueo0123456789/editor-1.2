import { ModalOperator } from "../../../../operators/modalOperator.js";
import { managerForDOMs } from "../../../../utils/ui/util.js";
import { GPU } from "../../../../utils/webGPU.js";

export class ViewerSpaceData {
    constructor() {
        this.mode = "オブジェクト";
        this.modes = {
            "": ["オブジェクト"],
            "グラフィックメッシュ": ["オブジェクト","メッシュ編集","頂点メーション編集"],
            "アーマチュア": ["オブジェクト","ボーン編集", "ボーンアニメーション編集"],
            "ベジェモディファイア": ["オブジェクト","ベジェ編集", "頂点アニメーション編集"],
        };
        this.tools = ["select", "move", "resize", "rotate", "remove", "append"];
        this.useTool = "select";
        this.smooth = false;

        this.proportionalMetaData = {
            use: false,
            type: "リニア",
            size: 100,
        }

        this.weightPaintMetaData = {
            boneIndex: 0,
            bezierType: 0,
            weightValue: 1,
            paintSize: 100,
        }

        this.areas = [];

        // this.modalOperator = new ModalOperator(this.creatorForUI.getDOMFromID("canvasContainer"), {});

        this.weightBezierType = 0;
        this.weightEditBoneIndexBuffer = GPU.createUniformBuffer(4, [0], ["u32"]);
        this.targetWeightIndexGroup = GPU.createGroup(GPU.getGroupLayout("Vu"), [this.weightEditBoneIndexBuffer]);
        this.cTargetWeightIndexGroup = GPU.createGroup(GPU.getGroupLayout("Cu"), [this.weightEditBoneIndexBuffer]);

        const weightIndexUpdate = () => {
            GPU.writeBuffer(this.weightEditBoneIndexBuffer, new Uint32Array([this.weightPaintMetaData.boneIndex]));
        }
        const weightValueUpdate = () => {
        }

        managerForDOMs.set({o: this.weightPaintMetaData, i: "weightValue"}, weightValueUpdate);
        managerForDOMs.set({o: this.weightPaintMetaData, i: "boneIndex"}, weightIndexUpdate);
    }

    createModeSelectList() {
        const result = [];
        result.push("オブジェクト");
        result.push("test");

        return result;
    }
}