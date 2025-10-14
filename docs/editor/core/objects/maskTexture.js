import { app } from "../../../main.js";
import { createID, managerForDOMs } from "../../utils/ui/util.js";
import { changeParameter } from "../../utils/utility.js";
import { device, GPU } from "../../utils/webGPU.js";

export class MaskTexture {
    constructor(data) {
        this.id = data.id ? data.id : createID();
        this.type = "マスクテクスチャ";
        this.name = data.name;
        this.texture = null;
        this.view = null;
        if (data.name == "base") { // baseだけ特別
            this.texture = GPU.createTexture2D([1,1],"r8unorm");
            this.view = this.texture.createView();
            const commandEncoder = device.createCommandEncoder();
            const maskRenderPass = commandEncoder.beginRenderPass({
                colorAttachments: [
                    {
                        view: this.view,
                        clearValue: { r: 1, g: 0, b: 0, a: 0 },
                        loadOp: 'clear',
                        storeOp: 'store',
                    },
                ],
            });
            // 処理の終了と送信
            maskRenderPass.end();
            device.queue.submit([commandEncoder.finish()]);
        } else {
            const updateTextureSize = () => {
                console.log(app.scene.objects.renderingCamera)
                changeParameter(this, "texture", GPU.createTexture2D(app.scene.objects.renderingCamera.displayRange,"r8unorm"));
                changeParameter(this, "view", this.texture.createView());
            }
            managerForDOMs.set({o: app.scene.objects.renderingCamera, i: "displayRange"}, updateTextureSize);
            updateTextureSize();
        }
    }

    get clipObjects() {
        return app.scene.objects.graphicMeshs.filter(graphicMesh => graphicMesh.clippingMask == this);
    }
    get renderingObjects() {
        return app.scene.objects.graphicMeshs.filter(graphicMesh => graphicMesh.renderingTarget == this);
    }

    async getSaveData() {
        return {
            name: this.name,
            id: this.id,
            type: this.type,
        };
    }
}