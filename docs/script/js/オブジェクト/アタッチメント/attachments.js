import { pushArray } from "../../utility.js";
import { PhysicsAttachment, PhysicsAttachmentBoneData } from "./物理.js";

export class Attachments {
    constructor(target) {
        this.target = target;
        this.list = [];
        this.append("物理");
    }

    append(type) {
        let attachment;
        if (type == "物理") {
            attachment = new PhysicsAttachment();
        }
        pushArray(this.list,attachment);
        return attachment;
    }

    update() {
        for (const attachment of this.list) {
            attachment.update(encoder[attachment.encoderType]);
        }
    }
}