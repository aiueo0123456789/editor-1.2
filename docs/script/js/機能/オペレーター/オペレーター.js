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
        return result;
    }

    undo() {
        if (this.history.length > 0) {
            const command = this.history.pop();
            command.undo();
            this.redoStack.push(command);
        }
    }

    redo() {
        if (this.redoStack.length > 0) {
            const command = this.redoStack.pop();
            command.execute();
            this.history.push(command);
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
    }

    appendCommand(command) {
        this.commands.push(command);
    }

    update() {
        while (this.commands.length != 0) {
            const command = this.commands.pop();
            this.stack.execute(command);
        }
    }
}

export const operator = new Operator();