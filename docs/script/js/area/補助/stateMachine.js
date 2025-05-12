export class StateMachine {
    constructor() {
        this.state = [];
        this.data = {};
        this.stateModel = null;
    }

    setStateModel(model) {
        this.stateModel = new model();
    }

    async update() {
        await testModel();
    }
}