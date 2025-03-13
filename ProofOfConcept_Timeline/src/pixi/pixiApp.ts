import * as Pixi from 'pixi.js';

const pixiApp: Pixi.Application = new Pixi.Application();

// Init app
await pixiApp.init({
    background: '#ffffff',
    height: window.innerHeight *0.5,
    width: window.innerWidth *0.5,
});

export const staticContainer: Pixi.Container = new Pixi.Container();
export const dynamicContainer: Pixi.Container = new Pixi.Container();
pixiApp.stage.addChild(staticContainer);
pixiApp.stage.addChild(dynamicContainer);

document.body.appendChild(pixiApp.canvas);

window.addEventListener('resize', (): void => {
    pixiApp.renderer.resize(window.innerWidth *0.5, window.innerHeight * 0.5);
});
export default pixiApp;
