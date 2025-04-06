import { createID, managerForDOMs } from "../../UI/制御.js";
import { AnimationManager } from "./アニメーション/アニメーション.js";
import { CreateObjectCommand, ObjectManager } from "./オブジェクト/オブジェクト.js";

// undoとredoを実行
class CommandStack {
    constructor() {
        this.history = [];
        this.redoStack = [];
    }

    execute(command) {
        const result = command.execute();
        this.history.push(command);
        this.redoStack = []; // 新しい操作をしたらRedoはリセット
        managerForDOMs.update(this.history);
        return result;
    }

    undo() {
        if (this.history.length > 0) {
            const command = this.history.pop();
            command.undo();
            this.redoStack.push(command);
            managerForDOMs.update(this.history);
        }
    }

    redo() {
        if (this.redoStack.length > 0) {
            const command = this.redoStack.pop();
            command.execute();
            this.history.push(command);
            managerForDOMs.update(this.history);
        }
    }
}

// コマンド関係の管理
class Operator {
    constructor() {
        this.animation = new AnimationManager();
        this.object = new ObjectManager();
        this.stack = new CommandStack();
        this.commands = [];
        this.errorLog = [];
    }

    appendCommand(command) {
        command.id = createID();
        this.commands.push(command);
    }

    appendErrorLog(log) {
        this.errorLog.push({text: log});
        managerForDOMs.update(this.errorLog);
    }

    update() {
        while (this.commands.length != 0) {
            const command = this.commands.pop();
            const result = this.stack.execute(command);
            if (result) {
                if (result.error) {
                    this.errorLog.push(result.error);
                }
            }
        }
    }
}

export const operator = new Operator();