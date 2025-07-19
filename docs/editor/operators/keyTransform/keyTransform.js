import { vec2 } from "../../utils/mathVec.js";
import { managerForDOMs } from "../../utils/ui/util.js";

class KeyTransformCommand {
    constructor(targets) {
        this.value = vec2.create();
        this.targets = [...targets];
        this.center = vec2.create();
        this.original = targets.map(vec => [...vec]);
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
        managerForDOMs.update("タイムライン-canvas");
    }

    undo() {
        for (let i = 0; i < this.targets.length; i ++) {
            vec2.set(this.targets[i], this.original[i]);
        }
        managerForDOMs.update("タイムライン-canvas");
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