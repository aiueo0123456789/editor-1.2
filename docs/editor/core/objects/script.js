import { createID, managerForDOMs } from "../../utils/ui/util.js";
import { changeParameter } from "../../utils/utility.js";
import { GPU } from "../../utils/webGPU.js";

export class Script {
    constructor(data) {
        this.name = data.name;
        this.type = "スクリプト";
        this.id = data.id ? data.id : createID()
        this.text = data.text;
        this.pipeline = null;
        this.result = "";
        const pipelineForUpdate = async () => {
            try {
                changeParameter(this, "result", "complete!");
                const newPipeline = await GPU.createComputePipelineAsync([GPU.getGroupLayout("Csrw_Csrw"),GPU.getGroupLayout("Cu")], this.text);
                this.pipeline = newPipeline;
            } catch (err) {
                changeParameter(this, "result", err);
                console.warn("パイプラインの作成に失敗しました")
            }
        };
        pipelineForUpdate();
        managerForDOMs.set({o: this, i: "text"}, pipelineForUpdate);
    }

    getSaveData() {
        return {
            type: this.type,
            name: this.name,
            id: this.id,
            text: this.text,
        }
    }
}