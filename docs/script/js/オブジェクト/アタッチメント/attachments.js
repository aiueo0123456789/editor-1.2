import { Attachment_BoneMatrixCopy } from "./boneMatrixCopy.js";
import { Attachment_FollowBone } from "./followBone/followBone.js";

export class Attachments {
    constructor(target) {
        this.target = target;
        this.list = [];
        this.specialProcess = false;
    }

    append(use, option) {
        let attachment;
        if (use == "行列コピー") {
            attachment = new Attachment_BoneMatrixCopy(option.targetBone);
        } else if (use == "ボーン追従") {
            attachment = new Attachment_FollowBone(option.targetBone);
        }
        if (attachment.encoderType == "command") {
            this.specialProcess = true;
        }
        this.list.push(attachment);
        return attachment;
    }

    update(encoder) {
        for (const attachment of this.list) {
            attachment.update(encoder[attachment.encoderType]);
        }
    }
}