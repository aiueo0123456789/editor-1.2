import { f_u, v_u_f_u } from "./GPUObject.js";
import { GPU } from "./webGPU.js";

export class ColorAnddWidth {
    constructor(color = [0,0,0,1], width = 15) {
        this.color = color;
        this.colorBuffer = GPU.createUniformBuffer(16, undefined, ["f32"]);
        GPU.writeBuffer(this.colorBuffer, new Float32Array(this.color));
        this.width = width;
        this.widthBuffer = GPU.createUniformBuffer(4, undefined, ["f32"]);
        GPU.writeBuffer(this.widthBuffer, new Float32Array([this.width]));
        this.group = GPU.createGroup(v_u_f_u, [this.widthBuffer,this.colorBuffer]);
    }

    setColor(r,g,b,a = 1) {
        this.color = [r,g,b,a];
        GPU.writeBuffer(this.colorBuffer, new Float32Array(this.color));
    }

    setWidth(width) {
        this.width = width;
        GPU.writeBuffer(this.widthBuffer, new Float32Array([this.width]));
    }

    setColorAndWidth(r,g,b,a, width) {
        this.color = [r,g,b,a];
        this.width = width;
        GPU.writeBuffer(this.colorBuffer, new Float32Array(this.color));
        GPU.writeBuffer(this.widthBuffer, new Float32Array([this.width]));
    }
}

export class Color {
    constructor(color = [0,0,0,1]) {
        this.color = color;
        this.colorBuffer = GPU.createUniformBuffer(16, undefined, ["f32"]);
        GPU.writeBuffer(this.colorBuffer, new Float32Array(this.color));
        this.group = GPU.createGroup(f_u, [this.colorBuffer]);
    }

    setColor(r,g,b,a = 1) {
        this.color = [r,g,b,a];
        GPU.writeBuffer(this.colorBuffer, new Float32Array(this.color));
    }

    getRGB() {
        return this.color.slice(0,3);
    }
}

class ConfigBlock {
    constructor() {
        this.hover = new Color();
        this.select = new Color([1,0,0,1]);
        this.active = new Color();
        this.inactive = new Color();
    }
}

class MeshesLineConfigBlock {
    constructor() {
        this.active = new Color();
        this.inactive = new Color();
    }
}

class VerticesConfigBlock {
    constructor() {
        this.active = new ColorAnddWidth();
        this.inactive = new ColorAnddWidth();
    }
}

class GizmoParameters {
    constructor() {
        this.vertices = new VerticesConfigBlock();
        this.boneVertices = new VerticesConfigBlock();
        this.modifier = new ConfigBlock();
        this.bezierModifier = new ConfigBlock();
        this.boneModifier = new ConfigBlock();
        this.rotateModifier = new ConfigBlock();
        this.graphicMesh = new ConfigBlock();
        this.masterPoint = new ColorAnddWidth();
        this.masterBBox = new Color();
    }
}

export class EditorPreference {
    constructor() {
        this.gizmoParameters = new GizmoParameters();
        this.gizmoParameters.masterPoint.setColor(1,0,0);
        this.gizmoParameters.masterPoint.setWidth(10);

        this.gizmoParameters.masterBBox.setColor(1,0,0);

        this.gizmoParameters.vertices.inactive.setColor(114/255,221/255,255/255);
        this.gizmoParameters.vertices.active.setColor(16/255,255/255,105/255);

        this.gizmoParameters.boneVertices.inactive.setColorAndWidth(0.6,0.6,0.6, 1, 50);
        this.gizmoParameters.boneVertices.active.setColorAndWidth(0.9,0.7,0.1, 1, 60);

        this.gizmoParameters.boneModifier.inactive.setColor(0.5,0.5,0.5,0.5);
        this.gizmoParameters.boneModifier.active.setColor(0.5,0.5,0.5);
        this.gizmoParameters.boneModifier.hover.setColor(0.5,0.5,0.5);

        this.gizmoParameters.modifier.inactive.setColor(0,0,0,0.2);
        this.gizmoParameters.modifier.active.setColor(0,0,0);
        this.gizmoParameters.modifier.hover.setColor(0,0,0,0.5);

        this.gizmoParameters.rotateModifier.inactive.setColor(1,0,0,0.5);
        this.gizmoParameters.rotateModifier.active.setColor(1,0,0);
        this.gizmoParameters.rotateModifier.hover.setColor(1,0,0);

        this.gizmoParameters.graphicMesh.inactive.setColor(0,0,0,0.5);
        this.gizmoParameters.graphicMesh.active.setColor(114/255,221/255,255/255);
        this.gizmoParameters.graphicMesh.hover.setColor(114/255,221/255,255/255, 0.5);
        this.gizmoParameters.graphicMesh["ベースシルエットエッジ"] = new Color([1,0.5,0,1]);
        this.gizmoParameters.graphicMesh["ベースエッジ"] = new Color([114/255,221/255,255/255,1]);
        this.gizmoParameters.graphicMesh["エッジ"] = new Color([1,1,1,1]);

        this.gizmoParameters.bezierModifier.inactive.setColor(0,0,0,0.5);
        this.gizmoParameters.bezierModifier.active.setColor(0,0,0);
        this.gizmoParameters.bezierModifier.hover.setColor(0,0.5,0.8, 1);

        this.smoothRadius = 100;
        this.smoothType = 0;

        this.smoothRadiusBuffer = GPU.createUniformBuffer(4, undefined, ["f32"]);
        this.smoothRadiusRenderingConfig = new ColorAnddWidth([0,0,0,0.1], this.smoothRadius);

        this.selectRadius = 20;
        this.circleSelectRenderingConfigGroup = new ColorAnddWidth([0,0,0,0.5], this.selectRadius);

        this.animtionEndFrame = 32;

        this.activeActionKeyframe = [];
    }
}