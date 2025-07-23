import { pushArray } from "../../../../editor/utils/utility.js";
import { PhysicsAttachmentData } from "./physics/data.js";

export class Attachments {
    constructor(bone) {
        this.bone = bone;
        /** @type {PhysicsAttachmentData[]} */
        this.list = [];
        this.append("物理");
    }

    append(type) {
        let attachment;
        if (type == "物理") {
            attachment = new PhysicsAttachmentData(this.bone);
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