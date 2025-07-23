
// Physics engine based on the provided PhysicsConstraint class
class MathUtils {
    static PI = 3.1415927;
	static PI2 = MathUtils.PI * 2;
	static invPI2 = 1 / MathUtils.PI2;
	static radiansToDegrees = 180 / MathUtils.PI;
	static radDeg = MathUtils.radiansToDegrees;
	static degreesToRadians = MathUtils.PI / 180;
	static degRad = MathUtils.degreesToRadians;
}

class Physics {
    static none = 0;
    static reset = 1;
    static update = 2;
    static pose = 3;
}

class Bone {
    constructor(x, y, length = 50, skeleton, parent) {
        this.animationX = 0;
        this.animationY = 0;
        this.ix = x;
        this.iy = y;
        this.worldX = x;
        this.worldY = y;
        this.data = { length: length, rotate: 0, x: 0, y: 0 };
        this.a = 1; // transform matrix elements
        this.b = 0;
        this.c = 0;
        this.d = 1;
        this.scaleX = 1;
        this.scaleY = 1;
        this.skeleton = skeleton;
        this.parent = parent;
    }

    getWorldScaleX() {
        return Math.sqrt(this.a * this.a + this.c * this.c);
    }

    update() {
		// this.updateWorldTransformWith(this.ax, this.ay, this.arotation, this.ascaleX, this.ascaleY, this.ashearX, this.ashearY);
        if (this.parent) {
            this.updateWorldTransformWith(this.data.length, 0, 0, 1, 1, 0, 0);
        } else {
            this.updateWorldTransformWith(this.ix, this.iy, 0, 1, 1, 0, 0);
        }
	}

    updateAppliedTransform() {
        let parent = this.parent;
		if (!parent) {
			this.ax = this.worldX - this.skeleton.x;
			this.ay = this.worldY - this.skeleton.y;
			this.arotation = Math.atan2(this.c, this.a) * MathUtils.radDeg;
			this.ascaleX = Math.sqrt(this.a * this.a + this.c * this.c);
			this.ascaleY = Math.sqrt(this.b * this.b + this.d * this.d);
			this.ashearX = 0;
			this.ashearY = Math.atan2(this.a * this.b + this.c * this.d, this.a * this.d - this.b * this.c) * MathUtils.radDeg;
			return;
		}
		let pa = parent.a, pb = parent.b, pc = parent.c, pd = parent.d;
		let pid = 1 / (pa * pd - pb * pc);
		let ia = pd * pid, ib = pb * pid, ic = pc * pid, id = pa * pid;
		let dx = this.worldX - parent.worldX, dy = this.worldY - parent.worldY;
		this.ax = (dx * ia - dy * ib);
		this.ay = (dy * id - dx * ic);

		let ra, rb, rc, rd;
        ra = ia * this.a - ib * this.c;
        rb = ia * this.b - ib * this.d;
        rc = id * this.c - ic * this.a;
        rd = id * this.d - ic * this.b;

		this.ashearX = 0;
		this.ascaleX = Math.sqrt(ra * ra + rc * rc);
		if (this.ascaleX > 0.0001) {
			let det = ra * rd - rb * rc;
			this.ascaleY = det / this.ascaleX;
			this.ashearY = -Math.atan2(ra * rb + rc * rd, det) * MathUtils.radDeg;
			this.arotation = Math.atan2(rc, ra) * MathUtils.radDeg;
		} else {
			this.ascaleX = 0;
			this.ascaleY = Math.sqrt(rb * rb + rd * rd);
			this.ashearY = 0;
			this.arotation = 90 - Math.atan2(rd, rb) * MathUtils.radDeg;
		}
    }

    updateWorldTransformWith(x, y, rotation, scaleX, scaleY, shearX, shearY) {
		this.ax = x;
		this.ay = y;
		this.arotation = rotation;
		this.ascaleX = scaleX;
		this.ascaleY = scaleY;
		this.ashearX = shearX;
		this.ashearY = shearY;

		let parent = this.parent;
		if (parent) {
            let pa = parent.a, pb = parent.b, pc = parent.c, pd = parent.d;
            this.worldX = pa * x + pb * y + parent.worldX;
            this.worldY = pc * x + pd * y + parent.worldY;
    
            const rx = (rotation + shearX) * MathUtils.degRad;
            const ry = (rotation + 90 + shearY) * MathUtils.degRad;
            const la = Math.cos(rx) * scaleX;
            const lb = Math.cos(ry) * scaleY;
            const lc = Math.sin(rx) * scaleX;
            const ld = Math.sin(ry) * scaleY;
            this.a = pa * la + pb * lc;
            this.b = pa * lb + pb * ld;
            this.c = pc * la + pd * lc;
            this.d = pc * lb + pd * ld;
		} else {
			let skeleton = this.skeleton;
			const sx = skeleton.scaleX, sy = skeleton.scaleY;
			const rx = (rotation + shearX) * MathUtils.degRad;
			const ry = (rotation + 90 + shearY) * MathUtils.degRad;
			this.a = Math.cos(rx) * scaleX * sx;
			this.b = Math.cos(ry) * scaleY * sx;
			this.c = Math.sin(rx) * scaleX * sy;
			this.d = Math.sin(ry) * scaleY * sy;
			this.worldX = x * sx + skeleton.x;
			this.worldY = y * sy + skeleton.y;
        }

    }
}

class Skeleton {
    static yDown = true;

    constructor() {
        this.x = 0;
        this.y = 0;
        this.time = 0;
        this.scaleX = 1;
        this.scaleY = 1;
        this.data = { referenceScale: 1 };
        this.bones = [];
    }
}

class PhysicsConstraintData {
    constructor(x,y) {
        this.bone = { index: 0 };
        this.x = x;
        this.y = y;
        this.rotate = 1;
        this.shearX = 0;
        this.scaleX = 0;
        this.inertia = 0.5;
        this.strength = 0;
        this.damping = 0.95;
        this.massInverse = 0.01;
        this.wind = 0;
        this.gravity = 50;
        this.mix = 1;
        this.limit = 100;
        this.step = 0.016;
    }
}

class PhysicsConstraint {
    constructor(data, skeleton) {
        this.data = data;
        this.skeleton = skeleton;
        this._bone = skeleton.bones[data.bone.index];

        this.inertia = data.inertia;
        this.strength = data.strength;
        this.damping = data.damping;
        this.massInverse = data.massInverse;
        this.wind = data.wind;
        this.gravity = data.gravity;
        this.mix = data.mix;

        this._reset = true;
        this.ux = 0;
        this.uy = 0;
        this.cx = 0;
        this.cy = 0;
        this.tx = 0;
        this.ty = 0;
        this.xOffset = 0;
        this.xVelocity = 0;
        this.yOffset = 0;
        this.yVelocity = 0;
        this.rotateOffset = 0;
        this.rotateVelocity = 0;
        this.scaleOffset = 0;
        this.scaleVelocity = 0;

        this.active = true;
        this.remaining = 0;
        this.lastTime = 0;
    }

    get bone() {
        return this._bone;
    }

    reset() {
        this.remaining = 0;
        this.lastTime = this.skeleton.time;
        this._reset = true;
        this.xOffset = 0;
        this.xVelocity = 0;
        this.yOffset = 0;
        this.yVelocity = 0;
        this.rotateOffset = 0;
        this.rotateVelocity = 0;
        this.scaleOffset = 0;
        this.scaleVelocity = 0;
    }

    // Simplified update method for demo
    update () {
		const mix = this.mix;
		if (mix == 0) return;

		const x = this.data.x > 0, y = this.data.y > 0, rotateOrShearX = this.data.rotate > 0 || this.data.shearX > 0, scaleX = this.data.scaleX > 0;
		const bone = this.bone;
		const l = bone.data.length;

        const skeleton = this.skeleton;
        const delta = Math.max(this.skeleton.time - this.lastTime, 0);
        this.remaining += delta;
        this.lastTime = skeleton.time;

        const bx = bone.worldX, by = bone.worldY;
        if (this._reset) {
            this._reset = false;
            this.ux = bx;
            this.uy = by;
        } else {
            let a = this.remaining, i = this.inertia, t = this.data.step, f = this.skeleton.data.referenceScale, d = -1;
            let qx = this.data.limit * delta, qy = qx * Math.abs(skeleton.scaleY);
            qx *= Math.abs(skeleton.scaleX);
            if (x || y) {
                // 慣性
                if (x) {
                    const u = (this.ux - bx) * i;
                    this.xOffset += u > qx ? qx : u < -qx ? -qx : u;
                    this.ux = bx;
                }
                if (y) {
                    const u = (this.uy - by) * i;
                    this.yOffset += u > qy ? qy : u < -qy ? -qy : u;
                    this.uy = by;
                }
                // 重力や風
                if (a >= t) {
                    d = Math.pow(this.damping, 60 * t);
                    const m = this.massInverse * t, e = this.strength, w = this.wind * f * skeleton.scaleX, g = this.gravity * f * skeleton.scaleY;
                    do {
                        if (x) {
                            this.xVelocity += w * m; // 風
                            this.xVelocity -= this.xOffset * e * m; // 復元力
                            this.xOffset += this.xVelocity * t;
                            this.xVelocity *= d;
                        }
                        if (y) {
                            this.yVelocity += g * m; // 重力
                            this.yVelocity -= this.yOffset * e * m; // 復元力
                            this.yOffset += this.yVelocity * t;
                            this.yVelocity *= d;
                        }
                        a -= t;
                    } while (a >= t);
                }
                if (x) bone.worldX += this.xOffset * mix * this.data.x;
                if (y) bone.worldY += this.yOffset * mix * this.data.y;
            }
            if (rotateOrShearX || scaleX) {
                let ca = Math.atan2(bone.c, bone.a), c = 0, s = 0, mr = 0;
                let dx = this.cx - bone.worldX, dy = this.cy - bone.worldY;
                if (dx > qx)
                    dx = qx;
                else if (dx < -qx) //
                    dx = -qx;
                if (dy > qy)
                    dy = qy;
                else if (dy < -qy) //
                    dy = -qy;
                if (rotateOrShearX) {
                    mr = (this.data.rotate + this.data.shearX) * mix;
                    let r = Math.atan2(dy + this.ty, dx + this.tx) - ca - this.rotateOffset * mr;
                    this.rotateOffset += (r - Math.ceil(r * MathUtils.invPI2 - 0.5) * MathUtils.PI2) * i;
                    r = this.rotateOffset * mr + ca;
                    c = Math.cos(r);
                    s = Math.sin(r);
                    if (scaleX) {
                        r = l * bone.getWorldScaleX();
                        if (r > 0) this.scaleOffset += (dx * c + dy * s) * i / r;
                    }
                } else {
                    c = Math.cos(ca);
                    s = Math.sin(ca);
                    const r = l * bone.getWorldScaleX();
                    if (r > 0) this.scaleOffset += (dx * c + dy * s) * i / r;
                }
                a = this.remaining;
                if (a >= t) {
                    if (d == -1) d = Math.pow(this.damping, 60 * t);
                    const m = this.massInverse * t, e = this.strength, w = this.wind, g = -this.gravity, h = l / f;
                    while (true) {
                        a -= t;
                        if (scaleX) {
                            this.scaleVelocity += (w * c - g * s - this.scaleOffset * e) * m;
                            this.scaleOffset += this.scaleVelocity * t;
                            this.scaleVelocity *= d;
                        }
                        if (rotateOrShearX) {
                            this.rotateVelocity -= ((w * s + g * c) * h + this.rotateOffset * e) * m;
                            this.rotateOffset += this.rotateVelocity * t;
                            this.rotateVelocity *= d;
                            if (a < t) break;
                            const r = this.rotateOffset * mr + ca;
                            c = Math.cos(r);
                            s = Math.sin(r);
                        } else if (a < t) //
                            break;
                    }
                }
            }
            this.remaining = a;
        }
        this.cx = bone.worldX;
        this.cy = bone.worldY;

		if (rotateOrShearX) {
			let o = this.rotateOffset * mix, s = 0, c = 0, a = 0;
			if (this.data.shearX > 0) {
				let r = 0;
				if (this.data.rotate > 0) {
					r = o * this.data.rotate;
					s = Math.sin(r);
					c = Math.cos(r);
					a = bone.b;
					bone.b = c * a - s * bone.d;
					bone.d = s * a + c * bone.d;
				}
				r += o * this.data.shearX;
				s = Math.sin(r);
				c = Math.cos(r);
				a = bone.a;
				bone.a = c * a - s * bone.c;
				bone.c = s * a + c * bone.c;
			} else {
				o *= this.data.rotate;
				s = Math.sin(o);
				c = Math.cos(o);
				a = bone.a;
				bone.a = c * a - s * bone.c;
				bone.c = s * a + c * bone.c;
				a = bone.b;
				bone.b = c * a - s * bone.d;
				bone.d = s * a + c * bone.d;
			}
		}
		if (scaleX) {
			const s = 1 + this.scaleOffset * mix * this.data.scaleX;
			bone.a *= s;
			bone.c *= s;
		}
        this.tx = l * bone.a;
        this.ty = l * bone.c;
		bone.updateAppliedTransform();
	}

    translate(x, y) {
        this.ux -= x;
        this.uy -= y;
        this.cx -= x;
        this.cy -= y;
    }
}

// Visualization and simulation
class PhysicsDemo {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.isPaused = false;
        
        this.skeleton = new Skeleton();
        
        // Create multiple bones for a chain effect
        this.bones = [];
        this.constraints = [];
        
        let parent = null;
        
        for (let i = 0; i < 5; i++) {
            let constraintData = new PhysicsConstraintData( i == 0 ? 1 : 0, i == 0 ? 1 : 0);
            const bone = new Bone(400, 100, 60, this.skeleton, parent);
            this.bones.push(bone);
            this.skeleton.bones.push(bone);
            parent = bone;
            
            const constraint = new PhysicsConstraint(constraintData, this.skeleton);
            constraint._bone = bone;
            bone.updateAppliedTransform();
            this.constraints.push(constraint);
        }

        this.setupEventListeners();
        this.setupControls();
        this.lastTime = 0;
        this.animate();
    }

    setupEventListeners() {
        let isMouseDown = false;
        let mouseX = 0, mouseY = 0;

        this.canvas.addEventListener('mousedown', (e) => {
            isMouseDown = true;
            const rect = this.canvas.getBoundingClientRect();
            mouseX = e.clientX - rect.left;
            mouseY = e.clientY - rect.top;
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (!isMouseDown) return;
            
            const rect = this.canvas.getBoundingClientRect();
            const newX = e.clientX - rect.left;
            const newY = e.clientY - rect.top;
            
            // Apply force to nearest bone
            let closestConstraint = this.constraints[0];

            if (closestConstraint) {
                const forceX = (newX - mouseX) * 0.5;
                const forceY = (newY - mouseY) * 0.5;
                closestConstraint.xOffset += forceX;
                closestConstraint.yOffset += forceY;
            }

            mouseX = newX;
            mouseY = newY;
        });

        this.canvas.addEventListener('mouseup', () => {
            isMouseDown = false;
        });
    }

    setupControls() {
        const sliders = ['inertia', 'strength', 'damping', 'wind', 'gravity', 'mix', 'massInverse', 'stepTime'];
        
        sliders.forEach(param => {
            const slider = document.getElementById(param);
            const valueDisplay = document.getElementById(param + 'Value');
            
            slider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                valueDisplay.textContent = value;
                
                this.constraints.forEach(constraint => {
                    if (param === 'stepTime') {
                        constraint.data.step = value;
                    } else {
                        constraint[param] = value;
                        constraint.data[param] = value;
                    }
                });
            });
        });
    }

    animate(currentTime = 0) {
        if (!this.isPaused) {
            const deltaTime = (currentTime - this.lastTime) / 1000;
            this.skeleton.time = currentTime / 1000;
            // Update physics
            this.constraints.forEach((constraint,index) => {
                this.bones[index].update();
                constraint.update();
            });
            this.render();
        }

        this.lastTime = currentTime;
        requestAnimationFrame(this.animate.bind(this));
    }
}