import { vec2 } from "../../../ベクトル計算.js";

class KeyTransformCommand {
    constructor(targets) {
        this.value = vec2.create();
        this.targets = [...targets];
        this.center = vec2.create();
        this.original = targets.map(vec => vec2.copy(vec));
    }

    setCenterPoint(centerPoint) {
        this.center = [...centerPoint];
    }

    transform(type) {
        if (type == "tlanslate") {
            for (let i = 0; i < this.targets.length; i ++) {
                vec2.add(this.targets[i], this.original[i], this.value);
            }
        } else if (type == "resize") {
            for (const vertex of this.targets) {
                vec2.add(vertex,vertex,this.value);
            }
        }
    }

    // 変形を取り消し
    cancel() {
        for (let i = 0; i < this.targets.length; i ++) {
            this.targets[i] = this.original[i];
        }
    }

    undo() {
        for (let i = 0; i < this.targets.length; i ++) {
            this.targets[i] = this.original[i];
        }
    }
}

export class KeyTranslateCommand extends KeyTransformCommand {
    constructor(targets) {
        super(targets);
        this.value = [];
        this.proportionalEditType = 0;
        this.proportionalSize = 0;
    }

    update(value, orientType, proportionalEditType, proportionalSize) {
        this.value = [...value];
        this.proportionalEditType = proportionalEditType;
        this.proportionalSize = proportionalSize;
        if (orientType == "ローカル") { // 親の行列を探す
        } else {
        }
        this.transform("tlanslate");
    }

    execute() {
        this.transform("tlanslate");
    }
}

export class KeyResizeCommand extends KeyTransformCommand {
    constructor(target, selectIndexs) {
        super(target, selectIndexs);
    }

    update(value, orientType, proportionalEditType, proportionalSize) {
        this.value = [...value];
        this.proportionalEditType = proportionalEditType;
        this.proportionalSize = proportionalSize;
        if (orientType == "ローカル") { // 親の行列を探す
        } else {
        }
        this.transform("resize");
    }

    execute() {
        this.transform("resize");
    }
}