import { Application } from "../../app/app.js";
import { ArmatureData } from "./object/armatureData.js";
import { BezierModifierData } from "./object/bezierModifierData.js";
import { GraphicMeshData } from "./object/graphicMeshData.js";
import { ParticleData } from "./object/particle.js";

export class RuntimeDatas {
    constructor(/** @type {Application} */ app) {
        this.app = app;
        this.graphicMeshData = new GraphicMeshData(app);
        this.armatureData = new ArmatureData(app);
        this.bezierModifierData = new BezierModifierData(app);
        this.particle = new ParticleData(app);
    }

    getID(object) {
        console.log("呼び出された")
        let index = 0;
        if (object.type == "ベジェモディファイア") {
            index = this.bezierModifierData.order.indexOf(object);
        }
        return index;
    }

    append(runtimeData, object) {
        runtimeData.append(object);
        runtimeData.setOffset(object);
    }

    delete(runtimeData, object) {
        runtimeData.delete(object);
        runtimeData.setAllObjectOffset();
    }
}