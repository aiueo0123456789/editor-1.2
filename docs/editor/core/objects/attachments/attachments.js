import { arrayToPush } from "../../../../editor/utils/utility.js";
import { PhysicsAttachmentData } from "./physics/data.js";

export class Attachments {
    constructor(data) {
        this.bone = data.bone;
        /** @type {PhysicsAttachmentData[]} */
        this.list = [];
        for (const attachment of data.list) {
            this.append(attachment);
        }
    }

    append(data) {
        let attachment;
        if (data.type == "物理アタッチメント") {
            attachment = new PhysicsAttachmentData(Object.assign({bone: this.bone}, data));
        }
        arrayToPush(this.list,attachment);
        return attachment;
    }

    getSaveData() {
        return {
            type: "アタッチメント",
            list: this.list.map(attachment => {
                return attachment.getSaveData();
            })
        }
    }
}