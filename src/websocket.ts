import { WebSocket } from 'ws';
import ShellyDevice, { ScriptResponse } from "./ShellyDevice";
import * as mdns from './mdns';
import * as DeviceManager from './DeviceManager';
// import * as vscode from 'vscode';

export interface shelly_websocket_t {
    shellyID: string,
    connection: WebSocket,
    send(method: string, params?: any): Promise<any>,
    onMessage(cb: (method: string, params?: any) => void): void,
    destroy(code?: number): void
}

export function connectToShelly(shellyID: string) {
    return new Promise<shelly_websocket_t>((resolve, reject) => {
        console.log(shellyID)
        const connection = new WebSocket(`ws://${shellyID}/rpc`);
        connection.on('error', reject);
        connection.on('close', () => {
            mdns.removeDevice(shellyID);
            DeviceManager.removeDevice(shellyID);
            // vscode.window.showErrorMessage("Connection with " + shellyID + " has been lost!");

            reject();
        });
        connection.on('open', () => {
            let id = 0;
            const waiting = new Map<number, { resolve: (response: { method: string, result: any }) => void, reject: (error: any) => void }>();
            let cb: (method: string, params?: any) => void;

            connection.on('message', (rawData) => {
                try {
                    const message = JSON.parse(rawData.toString());
                    if (typeof message.id === 'number' && waiting.has(message.id)) {
                        const { resolve, reject } = waiting.get(message.id)!;
                        if (message.result !== undefined) {
                            resolve(message.result);
                            return;
                        }
                        reject(message.error ?? message)
                        return;
                    }
                    if (typeof message.method === 'string') {
                        if (typeof cb === 'function') {
                            cb(message.method, message.params);
                        }
                    }
                } catch (error) {
                    console.error("error parsing message", error)
                    // do nothing
                }
            })

            resolve({
                shellyID,
                connection,
                async send(method, params = {}) {
                    return new Promise<{ method: string, result: any }>((resolve, reject) => {
                        connection.send(JSON.stringify({
                            jsonrpc: '2.0',
                            id,
                            src: 'vscode-extension',
                            method,
                            params
                        }))
                        waiting.set(id, { resolve, reject });
                        id = id + 1;
                    })
                },
                onMessage(pass_cb) {
                    cb = pass_cb;
                },
                destroy(code = 1000) {
                    connection.close(code)
                }
            });
        });
    });
}

export async function listScript(shelly: shelly_websocket_t): Promise<ScriptResponse[]> {
    let data;

    try {
        data = await shelly.send('script.list');
    } catch (error) {
        return [];
    }

    if (data && typeof data === 'object' && typeof data.scripts === 'object' && Array.isArray(data.scripts)) {
        return data.scripts as ScriptResponse[];
    }
    return [];
}

export async function getScriptCode(shelly: shelly_websocket_t, scriptResponse: ScriptResponse): Promise<string> {
    const response = await shelly.send('script.getcode', { id: scriptResponse.id });
    if (response && typeof response === 'object' && typeof response.data === 'string') {
        return response.data as string;
    }
    return Promise.reject();
}

export async function uploadScript(shelly: shelly_websocket_t, id: number, script_content: string) {
    for (let i = 0; i <= script_content.length; i += ShellyDevice.UPLOAD_CHUCK_SIZE) {
        await _uploadScript(shelly, id, script_content.substring(i, Math.min(script_content.length, i + ShellyDevice.UPLOAD_CHUCK_SIZE)), i != 0)
    }
}

async function _uploadScript(shelly: shelly_websocket_t, id: number, script_content: string, append: boolean): Promise<void> {
    const len = script_content.length;
    const response: any = await shelly.send('script.putcode', {
        id,
        append,
        code: script_content
    })
    if (typeof response?.len === 'number' && response.len < len) {
        return _uploadScript(shelly, id, script_content.substring(len - response.len), true)
    }
}

export async function renameScript(shelly: shelly_websocket_t, name: string, id: number) {
    return shelly.send('script.setConfig', { id, config: { name } });
}

export async function createScript(shelly: shelly_websocket_t, name: string) {
    return shelly.send('script.create', { name });
}

export async function deleteScript(shelly: shelly_websocket_t, id: number) {
    return shelly.send('script.delete', { id });
}

export async function startScript(shelly: shelly_websocket_t, id: number) {
    return shelly.send('script.start', { id });
}

export async function stopScript(shelly: shelly_websocket_t, id: number) {
    return shelly.send('script.stop', { id });
}

export async function enableScript(shelly: shelly_websocket_t, id: number) {
    return shelly.send('script.setConfig', { id, config: { enable: true } });
}

export async function disableScript(shelly: shelly_websocket_t, id: number) {
    return shelly.send('script.setConfig', { id, config: { enable: false } });
}

export async function evalScript(shelly: shelly_websocket_t, id: number, code: string) {
    return shelly.send('script.eval', { id, code });
}

export async function getDeviceName(shelly: shelly_websocket_t): Promise<string | undefined> {
    return shelly.send('shelly.getdeviceinfo').then(data => data?.name);
}

export async function enableDebug(shelly: shelly_websocket_t): Promise<string | undefined> {
    return shelly.send('sys.setconfig', {
        config: {
            debug: {
                websocket: {
                    enable: true
                }
            }
        }
    })
}
