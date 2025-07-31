import { changeParameter } from "../../utils/utility.js";

export class TextEditor_textSplice {
    constructor(target, startOffset, endOffset) {
        this.target = target;
        this.insertText = "";
        this.startOffset = startOffset;
        this.endOffset = endOffset;
        this.originalText = this.target.object[this.target.parameter];
    }

    update(insertText) {
        this.insertText = insertText;
        changeParameter(this.target.object, this.target.parameter, this.originalText.slice(0,this.startOffset) + this.originalText.slice(this.endOffset));
        const text = this.target.object[this.target.parameter];
        changeParameter(this.target.object, this.target.parameter, text.slice(0,this.startOffset) + this.insertText + text.slice(this.startOffset));
    }

    execute() {
        changeParameter(this.target.object, this.target.parameter, this.originalText.slice(0,this.startOffset) + this.originalText.slice(this.endOffset));
        const text = this.target.object[this.target.parameter];
        changeParameter(this.target.object, this.target.parameter, text.slice(0,this.startOffset) + this.insertText + text.slice(this.startOffset));
    }

    undo() {
        changeParameter(this.target.object, this.target.parameter, this.originalText);
    }
}

export class TextEditor_textRemove {
    constructor(target, offsetStart, offsetEnd) {
        this.target = target;
        this.text = target.object[target.parameter].slice(offsetStart, offsetEnd);
        this.offsetStart = offsetStart;
        this.offsetEnd = offsetEnd;
    }

    execute() {
        const text = this.target.object[this.target.parameter];
        changeParameter(this.target.object, this.target.parameter, text.slice(0,this.offsetStart) + text.slice(this.offsetEnd));
    }

    undo() {
        const text = this.target.object[this.target.parameter];
        changeParameter(this.target.object, this.target.parameter, text.slice(0,this.offsetStart) + this.text + text.slice(this.offsetStart));
    }
}