import { app } from "../../app.js";
import { CreatorForUI } from "../補助/UIの自動生成.js";

export class Area_Inspector {
    constructor(/** @type {HTMLElement} */dom) {
        this.dom = dom;

        this.inputObject = {"h": app.hierarchy, "scene": app.scene};

        this.struct = {
            DOM: [
                {type: "option", name: "情報", children: [
                    {type: "gridBox", axis: "c", allocation: "1fr auto auto auto auto auto 1fr", children: [
                        {type: "padding", size: "10px"},
                        {type: "flexBox", interval: "5px", name: "", children: [
                            {type: "button", name: "aa", label: "aaaa", options: {textContent: "test"}},
                            {type: "button", name: "aa", label: "aaaa", options: {textContent: "test"}},
                            {type: "button", name: "aa", label: "aaaa", options: {textContent: "test"}},
                        ]},
                        {type: "separator", size: "10px"},
                        {type: "flexBox", interval: "5px", name: "", children: [
                            {type: "button", name: "aa", label: "aaaa", options: {textContent: "test"}},
                            {type: "button", name: "aa", label: "aaaa", options: {textContent: "test"}},
                            {type: "button", name: "aa", label: "aaaa", options: {textContent: "test"}},
                        ]},
                        {type: "separator", size: "10px"},
                        {type: "flexBox", interval: "5px", name: "", children: [
                            {type: "button", name: "aa", label: "aaaa", options: {textContent: "test"}},
                            {type: "button", name: "aa", label: "aaaa", options: {textContent: "test"}},
                            {type: "button", name: "aa", label: "aaaa", options: {textContent: "test"}},
                        ]},
                        {type: "padding", size: "10px"},
                    ]}
                ]},
                {type: "option", name: "情報", children: [
                    {type: "input", options: {type: "text"}}
                ]},
                {type: "section", name: "情報", children: [
                    {type: "input", label: "test1", name: "test1", min: 0, max: 10, withObject: {object: "h/graphicMeshs/0", parameter: "zIndex"}},
                    // {type: "select", name: "test3", withObject: {object: "h/0", parameter: "test"}}
                ]}
            ],
            utility: {
                "testTest": {}
            }
        };

        this.creator = new CreatorForUI();
        this.creator.create(dom, this);

        this.update();
    }

    update() {
        for (const object of app.hierarchy.root) {
            const div = document.createElement("div");
            div.textContent = object.name;
        }
    }
}