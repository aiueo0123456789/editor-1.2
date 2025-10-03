
import { NameAndTypeAndID } from "../../utils/objects/util.js";
import { GPU } from "../../utils/webGPU.js";

export class Texture extends NameAndTypeAndID {
    constructor(data) {
        super(data.name, "テクスチャ", data.id);
        /** @type {GPUTexture} */
        this.texture = GPU.isNotTexture;
        if (data.texture instanceof GPUTexture) {
            this.texture = data.texture;
        } else if (data.texture) {
            this.texture = GPU.createTexture2D([data.texture.width, data.texture.height, 1],"rgba8unorm");
            GPU.copyBase64ToTexture(this.texture, data.texture.data);
        }
        this.view = this.texture.createView();
        this.objectReferringThis = [];
    }

    appendReferenc(object) {
        if (this.objectReferringThis.includes(object)) return ;
        this.objectReferringThis.push(object);
    }

    deleteReferenc(object) {
        const index = this.objectReferringThis.indexOf(object);
        if (index == -1) return ;
        this.objectReferringThis.splice(index, 1);
    }

    get isReferenced() {
        return this.objectReferringThis.length != 0;
    }

    async getSaveData() {
        return {
            id: this.id,
            name: this.name,
            type: this.type,
            meta: {
                width: this.texture.width,
                height: this.texture.height,
                format: this.texture.format,
            },
            // texture: await GPU.textureToRaw(this.texture),
            texture: await GPU.textureToBlob(this.texture),
        }
    }
}