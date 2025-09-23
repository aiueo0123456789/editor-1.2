import { isNotTexture } from "../../utils/GPUObject.js";
import { ObjectBase } from "../../utils/objects/util.js";
import { GPU } from "../../utils/webGPU.js";

export class Texture extends ObjectBase {
    constructor(data) {
        super(data.name, "テクスチャ", data.id);
        this.texture = isNotTexture;
        if (data.texture instanceof GPUTexture) {
            this.texture = data.texture;
        } else if (data.texture) {
            this.texture = GPU.createTexture2D([data.texture.width, data.texture.height, 1],"rgba8unorm");
            GPU.copyBase64ToTexture(this.texture, data.texture.data);
        }
        this.view = this.texture.createView();
    }

    async getSaveData() {
        return {
            id: this.id,
            name: this.name,
            type: this.type,
            texture: await GPU.textureToBlob(this.texture),
        }
    }
}