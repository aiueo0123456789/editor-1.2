import { loadFile } from "../../../utility.js";
import { GPU } from "../../../webGPU.js";

const pipeline = GPU.createComputePipeline([GPU.getGroupLayout("Csrw_Csr_Csr_Cu")],await loadFile("./script/js/オブジェクト/アタッチメント/followBone/compute.wgsl"));

class Editor {
    constructor(aff) {
        this.aff = aff;
    }

    setSourceBone(bone) {
        this.aff.sourceBone = bone;
        GPU.writeBuffer(this.aff.indexBuffer, new Uint32Array([this.aff.targetBone.index, this.aff.sourceBone.index]));
        this.aff.group = GPU.createGroup(GPU.getGroupLayout("Csrw_Csr_Csr_Cu"), [this.aff.targetBone.armature.boneMatrixBuffer, this.aff.sourceBone.armature.boneMatrixBuffer, this.aff.sourceBone.armature.baseBoneMatrixBuffer, this.aff.indexBuffer]);
    }
}

class Bone {
    constructor(index) {
        this.id = createID();
        this.parent = null;
        this.index = index;
        this.children = [];
        this.armature = null;
    }
}

export class Attachment_FollowBone {
    constructor(targetBone) {
        this.name = "行列コピー";
        this.attachment = "";
        /** @type {Bone} */
        this.targetBone = targetBone;
        /** @type {Bone} */
        this.sourceBone = null;
        this.editor = new Editor(this);
        this.encoderType = "compute";
        // this.encoderType = "command";
        this.indexBuffer = GPU.createUniformBuffer(2 * 4, undefined, ["f32"]);
        this.group = null;
    }

    async update(encoder) {
        if (this.sourceBone) {

            encoder.setPipeline(pipeline);
            encoder.setBindGroup(0, this.group);
            encoder.dispatchWorkgroups(1, 1, 1); // ワークグループ数をディスパッチ
        }
    }
}