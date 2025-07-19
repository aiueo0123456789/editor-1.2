export class PhysicsAttachmentBoneData {
    constructor(index, length, mass, damping, restoring, equilibriumAngle) {
        this.index = index;
        this.length = length;
        this.mass = mass;
        this.damping = damping;
        this.restoring = restoring;
        this.equilibriumAngle = equilibriumAngle;
        this.theta = equilibriumAngle;
        this.thetaDot = 0;

        this.co = [0,0];

        this.struct = {
            inputObject: {"areasConifg": app.appConfig.areasConfig, "h": app.hierarchy, "scene": app.scene, "values": this.values},
            DOM: [
                {type: "section", name: "物理", children: [
                ]}
            ]
        };
    }
}

export class PhysicsAttachment {
    constructor(n, bones, g = -9.8) {
        this.type = "物理アタッチメント";
        this.n = n;
        this.bones = bones;
        this.g = g;
    }

    A(thetas) {
        let M = [];
        for (let i = 0; i < this.n; i++) {
            const bone = this.bones[i];
            let row = [];
            for (let j = 0; j < this.n; j++) {
                let massSum = 0;
                for (let k = Math.max(i, j); k < this.n; k++) {
                    massSum += this.bones[k].mass;
                }
                row.push(massSum * bone.length * this.bones[j].length * Math.cos(thetas[i] - thetas[j]));
            }
            M.push(row);
        }
        return M;
    }

    b(thetas, thetaDots) {
        let v = [];
        for (let i = 0; i < this.n; i++) {
            const bone = this.bones[i];
            let b_i = 0;
            // Coriolis and centrifugal terms
            for (let j = 0; j < this.n; j++) {
                let massSum = 0;
                for (let k = Math.max(i, j); k < this.n; k++) {
                    massSum += this.bones[k].mass;
                }
                b_i -= massSum * bone.length * this.bones[j].length * Math.sin(thetas[i] - thetas[j]) * thetaDots[j] ** 2;
            }
            // Gravitational term
            let massSum = 0;
            for (let k = i; k < this.n; k++) {
                massSum += this.bones[k].mass;
            }
            b_i -= this.g * massSum * bone.length * Math.sin(thetas[i]);
            // // 水平加速度効果（右向き加速時は左向きの慣性力）
            // b_i += this.acceleration[0] * massSum * this.lengths[i] * Math.cos(thetas[i]);
            // // 垂直加速度効果（上向き加速時は下向きの慣性力）
            // b_i += this.acceleration[1] * massSum * this.lengths[i] * Math.sin(thetas[i]);
            // Damping term
            b_i -= bone.damping * thetaDots[i];
            // Restoring force term
            b_i -= bone.restoring * (thetas[i] - bone.equilibriumAngle);
            v.push(b_i);
        }
        return v;
    }

    f(thetas, thetaDots) {
        let A = this.A(thetas);
        let b = this.b(thetas, thetaDots);
        try {
            return [thetaDots, math.lusolve(A, b).map(x => x[0])];
        } catch (e) {
            // If matrix is singular, return zero acceleration
            return [thetaDots, Array(this.n).fill(0)];
        }
    }

    RK4(dt) {
        const thetas = []
        const thetaDots = [];
        for (const bone of this.bones) {
            thetas.push(bone.theta);
            thetaDots.push(bone.thetaDot);
        }
        let k1 = this.f(thetas, thetaDots);
        let k2 = this.f(math.add(thetas, k1[0].map(x => 0.5*dt*x)), math.add(thetaDots, k1[1].map(x => 0.5*dt*x)));
        let k3 = this.f(math.add(thetas, k2[0].map(x => 0.5*dt*x)), math.add(thetaDots, k2[1].map(x => 0.5*dt*x)));
        let k4 = this.f(math.add(thetas, k3[0].map(x => 1.0*dt*x)), math.add(thetaDots, k3[1].map(x => 1.0*dt*x)));
        let thetaDeltas = math.add(k1[0], k2[0].map(x => 2 * x), k3[0].map(x => 2 * x), k4[0]).map(x => x * dt/6);
        let thetaDotDeltas = math.add(k1[1], k2[1].map(x => 2 * x), k3[1].map(x => 2 * x), k4[1]).map(x => x * dt/6);
        for (const bone of this.bones) {
            bone.theta += thetaDeltas[bone.index];
            bone.thetaDot += thetaDotDeltas[bone.index];
        }
    }

    tick(dt) {
        this.RK4(dt);
    }

    updateCoordinates() {
        let x = 0;
        let y = 0;
        for (const bone of this.bones) {
            x += bone.length * Math.sin(bone.theta);
            y += bone.length * Math.cos(bone.theta);
            bone.co = [x, y];
        }
    }
}