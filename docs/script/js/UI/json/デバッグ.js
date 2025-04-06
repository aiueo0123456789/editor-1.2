import { stateMachine } from "../../main.js";
import { hierarchy } from "../../ヒエラルキー.js";
import { operator } from "../../機能/オペレーター/オペレーター.js";

export class CommandStack {
    constructor() {
        this.inputObject = {"o": operator};

        const update = () => {
        }

        this.struct = {
            inputObject: {h: "hierarchy"},
            DOM: [
                {type: "section", name: "test", children: [
                    {type: "list", option: "min", name: "コマンドスタック", withObject: {object: "o/stack/history"}, liStruct: [
                        {type: "div", "style": "flex", children: [
                            {type: "dbInput", withObject: {object: "constructor", parameter: "name"}},
                            {type: "dbInput", withObject: {object: "", parameter: "id"}},
                        ]},
                    ]},
                    {type: "list", option: "min", name: "エラーログ", withObject: {object: "o/errorLog"}, liStruct: [
                        {type: "div", "style": "flex", children: [
                            {type: "dbInput", withObject: {object: "", parameter: "text"}},
                        ]},
                    ]},
                ]}
            ],
            utility: {
                "testTest": {}
            }
        };
    }
}
