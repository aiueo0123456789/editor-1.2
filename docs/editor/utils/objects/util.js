import { app } from "../../../main.js";
import { vec2 } from "../mathVec.js";
import { createID, managerForDOMs } from "../ui/util.js";
import { isFunction } from "../utility.js";

export class UnfixedReference {
    constructor(id) {
        this.id = id;
        this.type = "未解決参照";
    }

    getObject() {
        return app.scene.objects.getObjectFromID(id);
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
        this.isChange = true;
        this.isInit = false;

        this.selected = false;

        this.mode = "オブジェクト";

        this.runtimeOffsetData = {};

        this.parent = null;
    }

    get children() {
        return app.scene.objects.allObject.filter(object => {object.parent == this});
    }

    changeParent(parent) {
        managerForDOMs.update("changeParent");
        this.parent = parent;
        if (!(parent instanceof UnfixedReference)) {
            app.options.assignWeights(this);
            if (isFunction(this.runtimeData.updateParent)) {
                if (this.runtimeData) this.runtimeData.updateParent(this);
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

export function searchAnimation(object, animationName) {
    for (const animation of object.animationBlock.animations) {
        if (animation.name == animationName) return animation;
    }
    return null;
}

export function appendAnimationToObject(object, name) {
    console.log("アニメーションの追加",object,name)
    const animaton = object.animationBlock.appendAnimation(name);
    if (animaton === null) {
        console.warn("これ以上の追加はできません");
    }
}

export function deleteAnimationToObject(object, animation) {
    object.animationBlock.deleteAnimation(animation);
}

export function sharedDestroy(object) {
    managerForDOMs.deleteObject(object);
    object.animationBlock.destroy();
    object.editor.destroy();
    object.animationBlock = null;
    object.editor = null;
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
            vec2.reverseScale(this.center, vec2.addR(this.min,this.max), 2);
            [this.width,this.height] = vec2.subR(this.max,this.min);
        }
    }

    setWidthAndHeight(width, height) {
        this.width = width;
        this.height = height;

        let radius = vec2.reverseScaleR([width,height], 2);
        this.min = vec2.subR(this.center, radius);
        this.max = vec2.addR(this.center, radius);
    }
}