import { app } from "../../../main.js";
import { Keyframe } from "../../core/objects/keyframeBlock.js";
import { MathVec2 } from "../../utils/mathVec.js";

class KeyframeTransformCommand {
    constructor() {
        /** @type {Keyframe[]} */
        this.selectedAnchorPoint = app.appConfig.areasConfig["Timeline"].keyframes.filter(keyframe => keyframe.selectedPoint);
        this.originalAnchorPointPosition = this.selectedAnchorPoint.map(keyframe => {
            return {point: [...keyframe.point], leftHandle: [...keyframe.leftHandle], rightHandle: [...keyframe.rightHandle]};
        });
        this.value = [0,0];
    }

    transform(value) {
        this.value = value;
        if (this instanceof KeyframeTranslateCommand) {
            this.selectedAnchorPoint.forEach((anchorPoint, index) => {
                MathVec2.add(anchorPoint.point, this.originalAnchorPointPosition[index].point, this.value);
                MathVec2.add(anchorPoint.leftHandle, this.originalAnchorPointPosition[index].leftHandle, this.value);
                MathVec2.add(anchorPoint.rightHandle, this.originalAnchorPointPosition[index].rightHandle, this.value);
            })
        }
    }

    execute() {
        if (this instanceof KeyframeTranslateCommand) {
            this.selectedAnchorPoint.forEach((anchorPoint, index) => {
                MathVec2.add(anchorPoint.point, this.originalAnchorPointPosition[index].point, this.value);
                MathVec2.add(anchorPoint.leftHandle, this.originalAnchorPointPosition[index].leftHandle, this.value);
                MathVec2.add(anchorPoint.rightHandle, this.originalAnchorPointPosition[index].rightHandle, this.value);
            })
        }
        return {consumed: true};
    }

    undo() {
        if (this instanceof KeyframeTranslateCommand) {
            this.selectedAnchorPoint.forEach((anchorPoint, index) => {
                MathVec2.set(anchorPoint.point, this.originalAnchorPointPosition[index].point);
                MathVec2.set(anchorPoint.leftHandle, this.originalAnchorPointPosition[index].leftHandle);
                MathVec2.set(anchorPoint.rightHandle, this.originalAnchorPointPosition[index].rightHandle);
            })
        }
    }
}

export class KeyframeTranslateCommand extends KeyframeTransformCommand {
    constructor() {
        super();
    }
}

export class KeyframeResizeCommand extends KeyframeTransformCommand {
    constructor() {
        super();
    }
}