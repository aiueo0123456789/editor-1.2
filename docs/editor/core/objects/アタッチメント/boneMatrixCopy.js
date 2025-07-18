class Editor {
    constructor(aff) {
        this.aff = aff;
    }

    setSourceBone(bone) {
        this.aff.sourceBone = bone;
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

// affiliation -> aff
export class Attachment_BoneMatrixCopy {
    constructor(targetBone) {
        this.name = "行列コピー";
        this.attachment = "";
        /** @type {Bone} */
        this.targetBone = targetBone;
        /** @type {Bone} */
        this.sourceBone = null;
        this.editor = new Editor(this);
        this.encoderType = "command";
    }

    async update(encoder) {
        if (this.sourceBone) {
            encoder.copyBufferToBuffer(
                this.sourceBone.armature.boneMatrixBuffer,  // コピーしたいバッファ
                (this.sourceBone.index * 4 * 3) * 4,  // コピー開始位置
                this.targetBone.armature.boneMatrixBuffer,  // 書き込まれるバッファ
                (this.targetBone.index * 4 * 3) * 4,  // 書き込み開始位置
                3 * 4 * 4    // コピーするバイト数
            );
        }
    }
}