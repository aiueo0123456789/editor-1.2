import { createID, managerForDOMs } from "./制御.js";

export function createLabeledInputNumber(target, labelText, name, ID) {
    const label = document.createElement("label");
    label.textContent = labelText;
    if (!ID) ID = createID();

    const div = document.createElement("div");
    if (name) {
        div.setAttribute("name", name); // name を設定
    }
    div.className = "label-input";
    let input = document.createElement("input");
    input.type = "number";
    input.id = ID;
    label.setAttribute("for", ID); // for属性を設定
    div.append(label,input);
    target.append(div);
    return input;
}