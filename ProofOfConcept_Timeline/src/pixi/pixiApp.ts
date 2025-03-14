import * as Pixi from 'pixi.js';

const pixiApp: Pixi.Application = new Pixi.Application();

// Init app
await pixiApp.init({
    background: '#ffffff',
    height: window.innerHeight,
    width: window.innerWidth * (2 / 3),

});

export const staticContainer: Pixi.Container = new Pixi.Container();
export const dynamicContainer: Pixi.Container = new Pixi.Container();
pixiApp.stage.addChild(staticContainer);
pixiApp.stage.addChild(dynamicContainer);
pixiApp.canvas.id = "timeline";
pixiApp.canvas.style.display = "block";
pixiApp.canvas.style.position = "absolute"
pixiApp.canvas.style.top = "100"
pixiApp.canvas.style.left = "0"
document.body.appendChild(pixiApp.canvas);

window.addEventListener('resize', (): void => {
    pixiApp.renderer.resize(window.innerWidth * (2 / 3), window.innerHeight);
});
export default pixiApp;
