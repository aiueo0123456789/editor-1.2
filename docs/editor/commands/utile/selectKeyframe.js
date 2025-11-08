import { app } from "../../../main.js";
import { TimelineSpaceData } from "../../ui/area/areas/Timeline/area_TimelineSpaceData.js";
import { MathVec2 } from "../../utils/mathVec.js";

export class SelectOnlyKeyframeCommand {
    constructor(point,multiple,area) {
        this.multiple = multiple;
        /** @type {TimelineSpaceData} */
        this.timeLineSpaceData = app.appConfig.areasConfig["Timeline"];
        this.targetKeyframe = this.timeLineSpaceData.keyframes;
        this.originalSelectData = this.targetKeyframe.map(keyframe => keyframe.selectedPoint);
        let minDist = Infinity;
        /** @type {Keyframe} */
        this.selectKeyframe = null;
        for (const keyframeBlock of this.timeLineSpaceData.outlineKefyframeData) {
            for (const keyframe of keyframeBlock.object.keys) {
                const dist = MathVec2.distanceR(area.getKeyframeDisplayPosition(keyframeBlock.pathID, keyframe), point);
                if (dist < minDist) {
                    minDist = dist;
                    this.selectKeyframe = keyframe;
                }
            }
        }
        console.log(this);
    }

    execute() {
        if (this.multiple) {
            this.targetKeyframe.forEach((keyframe, index) => keyframe.selectedPoint = false);
        }
        this.selectKeyframe.selectedPoint = true;
        return {consumed: this.targetKeyframe.map(keyframe => keyframe.selectedPoint).filter((b, index) => b !== this.originalSelectData[index]).length > 0};
    }

    undo() {
        this.targetKeyframe.forEach((keyframe, index) => {
            keyframe.selectedPoint = this.originalSelectData[index];
        })
    }
}