import * as ws from '../websocket';

const shellyID = 'shellyplusplugs-80646fc7c008.local';
let websocket: ws.shelly_websocket_t;

beforeAll(async () => {
    websocket = await ws.connectToShelly(shellyID);
});
test('', async () => {
    await expect(ws.createScript(websocket, "mhm")).resolves.toBeTruthy();
});
test('', async () => {
    const a = "print(1)";
    await ws.uploadScript(websocket, 1, a);
    await expect(ws.getScriptCode(websocket, {
        id: 1,
        name: '',
        enable: false,
        running: false
    })).resolves.toStrictEqual(a);});  
test('', async () => {
    await expect(ws.listScript(websocket)).resolves.toBeTruthy();
});
test('', async () => {
    await expect(ws.renameScript(websocket, "ne6to", 1)).resolves.toBeTruthy();
});
test('', async () => {
    await expect(ws.enableScript(websocket, 1)).resolves.toStrictEqual({"restart_required": false}||{"restart_required": true});
});
test('', async () => {
    await expect(ws.disableScript(websocket, 1)).resolves.toStrictEqual({"restart_required": false}||{"restart_required": true});
});
test('', async () => {
    await expect(ws.startScript(websocket, 1)).resolves.toStrictEqual({"was_running": false});
});
test('', async () => {
    await expect(ws.evalScript(websocket, 1, '2+2')).resolves.toStrictEqual({"result":'4'});
});
test('', async () => {
    await expect(ws.stopScript(websocket, 1)).resolves.toStrictEqual({"was_running": true});
});
test('', async () => {
    await expect(ws.getDeviceName(websocket)).resolves.toBeFalsy();
});
test('', async () => {
    await expect(ws.enableDebug(websocket)).resolves.toBeTruthy();
});
test('', async () => {
    await expect(ws.deleteScript(websocket, 1)).resolves.toBe(null);
}); 
afterAll(function () {
    websocket.destroy();
});