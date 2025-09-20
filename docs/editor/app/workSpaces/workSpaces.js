import { createGrid } from "../../utils/ui/grid.js";
import { createTag } from "../../utils/ui/util.js";
import { Application } from "../app.js";

export class WorkSpaces {
    constructor(/** @type {Application} */ app) {
        this.app = app;
        this.spacesInitData = {
            "layout": {
                type: "grid",
                axis: "c",
                child1: {
                    type: "grid",
                    axis: "r",
                    child1: {
                        type: "grid",
                        axis: "c",
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
                    child1: {
                        type: "area",
                        areaType: "Outliner"
                    },
                    child2: {
                        type: "area",
                        areaType: "Property"
                    }
                }
            },
            "script": {
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
            },
            "animation": {
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
            },
            "Previewer": {
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
            }
        };
        this.spacesMap = {};
        this.spaces = [];
    }

    init() {
        const workSpacesDiv = this.app.ui.creatorForUI.getDOMFromID("workSpaces");
        // 初期化
        for (const spaceName in this.spacesInitData) {
            const spaceInitData = this.spacesInitData[spaceName];
            const looper = (data, t) => {
                if (data.type == "grid") {
                    const grid = createGrid(t, data.axis);
                    looper(data.child1, grid.child1);
                    looper(data.child2, grid.child2);
                    return grid;
                } else {
                    this.app.ui.setAreaType(t,data.areaType);
                }
            }
            const grid = looper(spaceInitData, this.app.ui.creatorForUI.getDOMFromID("main"));
            grid.container.classList.add("hidden");
            const header = createTag(workSpacesDiv, "div", {textContent: spaceName});
            header.addEventListener("click", () => {
                for (const space of this.spaces) {
                    space.container.classList.add("hidden");
                }
                grid.container.classList.remove("hidden");
            })
            this.spaces.push(grid);
        }
    }
}