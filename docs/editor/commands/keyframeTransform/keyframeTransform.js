import { mathVec2 } from "../../utils/mathVec.js";
import { managerForDOMs } from "../../utils/ui/util.js";

class KeyframeTransformCommand {
    constructor(targets) {
        this.value = mathVec2.create();
        this.targets = [...targets];
        this.center = mathVec2.create();
        this.original = targets.map(point => [...point.worldPosition]);
    }

    setCenterPoint(centerPoint) {
        this.center = [...centerPoint];
    }

    transform(type) {
        if (type == "tlanslate") {
            for (let i = 0; i < this.targets.length; i ++) {
                mathVec2.add(this.targets[i].worldPosition, this.original[i], this.value);
            }
        } else if (type == "resize") {
            for (const vertex of this.targets) {
                mathVec2.add(vertex,vertex,this.value);
            }
        }
        managerForDOMs.update({o: "タイムライン-canvas"});
    }

    undo() {
        for (let i = 0; i < this.targets.length; i ++) {
            mathVec2.set(this.targets[i].worldPosition, this.original[i]);
        }
        managerForDOMs.update({o: "タイムライン-canvas"});
    }
}

export class KeyframeTranslateCommand extends KeyframeTransformCommand {
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

export class KeyframeResizeCommand extends KeyframeTransformCommand {
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