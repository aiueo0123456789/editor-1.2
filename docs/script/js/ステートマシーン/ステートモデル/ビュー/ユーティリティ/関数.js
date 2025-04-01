import { activeView } from "../../../../main.js";
import { managerForDOMs } from "../../../../UI/制御.js";
import { hierarchy } from "../../../../ヒエラルキー.js";

// ホバーオブジェクトを更新
export async function updateForHoverObjects(stateData) {
    let hoverObjects = stateData.hoverObjects;
    hoverObjects.length = 0;
    await Promise.all(
        hierarchy.allObject.map(async (object) => {
            if (!("visible" in object && !object.visible) && await activeView.select.selectSilhouette(object, activeView.mouseState.positionForGPU)) {
                hoverObjects.push(object);
            }
        })
    )
}

export function updateSelectObjects(stateData, objects, append = false) {
    if (objects == "clear") {
        stateData.selectObjects.length = 0;
    } else {
        if (append == -1) {
        } else if (append) {
            for (const object of objects) {
                if (!stateData.selectObjects.includes(object)) {
                    stateData.selectObjects.push(object);
                }
            }
        } else {
            stateData.selectObjects.length = 0;
            for (const object of objects) {
                stateData.selectObjects.push(object);
            }
        }
    }
    managerForDOMs.update(hierarchy)
}