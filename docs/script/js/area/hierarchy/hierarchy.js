import { app } from "../../app.js";
import { CreatorForUI } from "../補助/UIの自動生成.js";

export class Area_Hierarchy {
    constructor(/** @type {HTMLElement} */dom) {
        this.dom = dom;

        this.inputObject = {"h": app.hierarchy, "scene": app.scene};

        this.struct = {
            DOM: [
                {type: "section", name: "基本情報", children: [
                    {type: "input", label: "test1", name: "test1", min: 0, max: 10, withObject: {object: "scene/graphicMeshs/0", parameter: "zIndex"}},
                    {type: "input", label: "test", name: "test3", withObject: {object: "scene/graphicMeshs/0", parameter: "name"}},
                    {type: "select", name: "test3", withObject: {object: "scene/graphicMeshs/0", parameter: "name"}}
                ]},
                {type: "option", name: "情報", children: [
                    {type: "gridBox", allocation: "auto auto auto 1fr", children: [
                        {type: "flexBox", interval: "5px", name: "", children: [
                            {type: "button", name: "aa", label: "aaaa", options: {textContent: "test"}},
                            {type: "button", name: "aa", label: "aaaa", options: {textContent: "test"}},
                            {type: "button", name: "aa", label: "aaaa", options: {textContent: "test"}},
                            {type: "padding", size: "10px"},
                        ]},
                        {type: "flexBox", interval: "5px", name: "", children: [
                            {type: "button", name: "aa", label: "aaaa", options: {textContent: "test"}},
                            {type: "button", name: "aa", label: "aaaa", options: {textContent: "test"}},
                            {type: "button", name: "aa", label: "aaaa", options: {textContent: "test"}},
                            {type: "padding", size: "10px"},
                        ]},
                        {type: "flexBox", interval: "5px", name: "", children: [
                            {type: "button", name: "aa", label: "aaaa", options: {textContent: "test"}},
                            {type: "button", name: "aa", label: "aaaa", options: {textContent: "test"}},
                            {type: "button", name: "aa", label: "aaaa", options: {textContent: "test"}},
                            {type: "padding", size: "10px"},
                        ]},
                    ]}
                ]},
                {type: "option", name: "情報", children: [
                    {type: "input", options: {type: "text"}}
                ]},
                {type: "section", name: "情報", children: [
                    {type: "input", label: "test1", name: "test1", min: 0, max: 10, withObject: {object: "h/graphicMeshs/0", parameter: "zIndex"}},
                    {type: "select", name: "test3", withObject: {object: "h/0", parameter: "test"}}
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
        for (const object of app.hierarchy.surface) {
            const div = document.createElement("div");
            div.textContent = object.name;
        }
    }
}