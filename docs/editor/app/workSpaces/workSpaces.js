import { createGrid } from "../../utils/ui/grid.js";
import { createTag } from "../../utils/ui/util.js";
import { Application } from "../app.js";

export class SpacesStructure {
    constructor(workSpaces,spaceName, struct) {
        this.workSpaces = workSpaces;
        this.spaceName = spaceName;
        this.struct = struct;
        this.areas = [];

        this.spaceContainer = null;
    }

    init() {
        const app = this.workSpaces.app;
        const workSpacesDiv = app.ui.creatorForUI.getDOMFromID("workSpaces");
        const looper = (data, t) => {
            if (data.type == "grid") {
                const grid = createGrid(t, data.axis, data.ratio);
                looper(data.child1, grid.child1);
                looper(data.child2, grid.child2);
                return grid;
            } else {
                this.areas.push(app.ui.setAreaType(t,data.areaType));
            }
        }
        this.spaceContainer = looper(this.struct, app.ui.creatorForUI.getDOMFromID("main"));
        this.spaceContainer.container.classList.add("hidden");
        const header = createTag(workSpacesDiv, "div", {textContent: this.spaceName});
        header.addEventListener("click", () => {
            for (const space of this.workSpaces.spaces) {
                space.spaceContainer.container.classList.add("hidden");
            }
            this.spaceContainer.container.classList.remove("hidden");
            this.workSpaces.activeWorkSpaces = this;
        })
    }

    update() {
        this.areas.forEach(area => {
            area.update();
        })
    }
}
export class WorkSpaces {
    constructor(/** @type {Application} */ app) {
        this.app = app;
        this.spaces = [
            new SpacesStructure(this, "layout", {
                type: "grid",
                axis: "c",
                ratio: "70",
                child1: {
                    type: "grid",
                    axis: "r",
                    ratio: "70",
                    child1: {
                        type: "grid",
                        axis: "c",
                        ratio: "30",
                        child1: {
                            type: "area",
                            areaType: "Inspector"
                        },
                        child2: {
                            type: "area",
                            areaType: "Viewer"
                        }
                    },
                    child2: {
                        type: "area",
                        areaType: "Timeline2"
                    }
                },
                child2: {
                    type: "grid",
                    axis: "r",
                    ratio: "40",
                    child1: {
                        type: "area",
                        areaType: "Outliner"
                    },
                    child2: {
                        type: "area",
                        areaType: "Property"
                    }
                }
            }),
            new SpacesStructure(this, "script", {
                type: "grid",
                axis: "c",
                child1: {
                    type: "grid",
                    axis: "r",
                    child1: {
                        type: "area",
                        areaType: "Viewer"
                    },
                    child2: {
                        type: "area",
                        areaType: "Inspector"
                    }
                },
                child2: {
                    type: "area",
                    areaType: "NodeEditor"
                }
            }),
            new SpacesStructure(this, "animation", {
                type: "grid",
                axis: "c",
                child1: {
                    type: "grid",
                    axis: "r",
                    child1: {
                        type: "area",
                        areaType: "Viewer"
                    },
                    child2: {
                        type: "area",
                        areaType: "Timeline"
                    }
                },
                child2: {
                    type: "grid",
                    axis: "r",
                    child1: {
                        type: "area",
                        areaType: "Property"
                    },
                    child2: {
                        type: "area",
                        areaType: "Inspector"
                    }
                }
            }),
            new SpacesStructure(this, "blendShape", {
                type: "grid",
                axis: "c",
                child1: {
                    type: "grid",
                    axis: "r",
                    child1: {
                        type: "area",
                        areaType: "Viewer"
                    },
                    child2: {
                        type: "area",
                        areaType: "Timeline2"
                    }
                },
                child2: {
                    type: "grid",
                    axis: "r",
                    child1: {
                        type: "area",
                        areaType: "BlendShape"
                    },
                    child2: {
                        type: "area",
                        areaType: "Inspector"
                    }
                }
            }),
            new SpacesStructure(this, "previewer", {
                type: "grid",
                axis: "c",
                child1: {
                    type: "area",
                    areaType: "Previewer"
                },
                child2: {
                    type: "area",
                    areaType: "Property"
                }
            })
        ];
        this.activeWorkSpaces = null;
    }

    init() {
        // 初期化
        for (const space of this.spaces) {
            space.init();
        }
        this.activeWorkSpaces = this.spaces[0];
        this.activeWorkSpaces.spaceContainer.container.classList.remove("hidden");
    }
}