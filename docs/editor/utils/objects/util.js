import { app } from "../../../main.js";
import { MathVec2 } from "../mathVec.js";
import { createID, managerForDOMs } from "../ui/util.js";
import { isFunction } from "../utility.js";

export class UnfixedReference {
    constructor(id) {
        this.id = id;
        this.type = "未解決参照";
    }

    getObject() {
        return app.scene.objects.getObjectFromID(this.id);
    }
}

export class NameAndTypeAndID {
    constructor(name, type, id) {
        this.type = type;
        this.name = name ? name : "名称未設定";
        this.id = id ? id : createID();
    }
}

export class ObjectBase extends NameAndTypeAndID{
    constructor(name,type,id) {
        super(name, type, id);
        this.selected = false;
        this.mode = "オブジェクト";
        this.runtimeOffsetData = {
            start: {},
            end: {},
        };
        this.parent = null;
    }

    get children() {
        return app.scene.objects.allObject.filter(object => object.parent === this);
    }

    changeParent(parent) {
        managerForDOMs.update({o: "親変更"});
        this.parent = parent;
        if (!(parent instanceof UnfixedReference)) {
            if (this.autoWeight) {
                app.options.assignWeights(this);
            }
            if (isFunction(this.runtimeData.updateAllocationData)) {
                if (this.runtimeData) this.runtimeData.updateAllocationData(this);
            }
        }
    }
}

export class ObjectEditorBase {
    constructor() {
        this.mode = "Object";
        this.BBox = {min: [0,0], max: [0,0], width: 0, height: 0, center: [0,0]};
    }
}

export function sharedDestroy(object) {
    managerForDOMs.delete({o: object});
}

export class BoundingBox {
    constructor() {
        this.min = [0,0];
        this.max = [0,0];
        this.width = 0;
        this.height = 0;
        this.center = [0,0]
    }

    set(data) {
        if (data.min && data.max) {
            this.min = data.min;
            this.max = data.max;
            MathVec2.reverseScale(this.center, MathVec2.addR(this.min,this.max), 2);
            [this.width,this.height] = MathVec2.subR(this.max,this.min);
        }
    }

    setWidthAndHeight(width, height) {
        this.width = width;
        this.height = height;

        let radius = MathVec2.reverseScaleR([width,height], 2);
        this.min = MathVec2.subR(this.center, radius);
        this.max = MathVec2.addR(this.center, radius);
    }
}