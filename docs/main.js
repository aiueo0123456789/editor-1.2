import { Application, appUpdate } from './editor/app/app.js';

export const app = new Application(document.getElementById("appContainer"));

app.init();

appUpdate(app);1