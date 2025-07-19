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

        this.proportionalEditType = 0;
        this.proportionalEditTypes = [0,1,2,3];
        this.proportionalSize = 100;

        this.weightPaintMetaData = {
            boneIndex: 0,
            bezierType: 0,
            weightValue: 1,
            paintSize: 100,
        }

        this.weightBezierType = 0;
        this.weightEditBoneIndexBuffer = GPU.createUniformBuffer(4, [0], ["u32"]);
        this.targetWeightIndexGroup = GPU.createGroup(GPU.getGroupLayout("Vu"), [this.weightEditBoneIndexBuffer]);
        this.cTargetWeightIndexGroup = GPU.createGroup(GPU.getGroupLayout("Cu"), [this.weightEditBoneIndexBuffer]);

        const weightIndexUpdate = () => {
            GPU.writeBuffer(this.weightEditBoneIndexBuffer, new Uint32Array([this.weightPaintMetaData.boneIndex]));
        }
        const weightValueUpdate = () => {
        }

        managerForDOMs.set({o: this.weightPaintMetaData, i: "weightValue"}, null, weightValueUpdate);
        managerForDOMs.set({o: this.weightPaintMetaData, i: "boneIndex"}, null, weightIndexUpdate);
    }

    createModeSelectList() {
        const result = [];
        result.push("オブジェクト");
        result.push("test");

        return result;
    }
}