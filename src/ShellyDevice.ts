import EventEmitter from "events";
import * as websocket from "./websocket";
import { WebSocket } from "ws";
import * as mdns from "./mdns";

export interface ScriptResponse {
    id: number,
    name: string,
    enable: boolean,
    running: boolean
}

export interface ScriptData {
    response: ScriptResponse,
    code: string
}

export interface debug_msg_t {
    ts: number,
    level: number,
    data: string
}

function is_debug_message_t(data: any): data is debug_msg_t {
    return typeof data === 'object'
        && typeof data.ts === 'number'
        && typeof data.level === 'number'
        && typeof data.data === 'string'
}

export default class ShellyDevice {
    #shellyID: string;
    #scripts: Map<number, ScriptData>;
    #ready = false;
    #websocket?: websocket.shelly_websocket_t;
    #debug: WebSocket;
    #debugMessages: debug_msg_t[];
    #eventEmitter: EventEmitter;
    #name?: string;
    #consoleFormat: [boolean, boolean];

    constructor(shellyID: string) {
        this.#shellyID = shellyID;
        this.#scripts = new Map();
        this.#eventEmitter = new EventEmitter();
        this.#debug = new WebSocket(`ws://${shellyID}/debug/log`);
        this.#debugMessages = [];
        this.#name = shellyID;
        this.init().catch(error => {
            console.error("error in init shellyID:[%s]", this.#shellyID, String(error))
        })
        this.#consoleFormat = [true, false];
    }

    async handleShellyNotifications(method: string, params: any) {
        for (const key in params) {
            if (key.startsWith("script")) {
                this.refreshScripts();
                // return;
            }
        }

        if (method === 'NotifyEvent' && typeof params.events === 'object' && Array.isArray(params.events)) {
            if (params.events.some((e: any) => e.component.startsWith('script') && e.event === 'config_changed')) {
                this.refreshScripts();
                // return;
            }
        } 
    }

    async refreshScripts() {
        if (this.#websocket == undefined) return;
        this.#scripts.clear();

        let scripts;
        try {
            scripts = await websocket.listScript(this.#websocket);
        } catch (error) {
            console.error("error in ShellyDevice.listScript", String(error));
            this.#eventEmitter.emit('error')
            this.destroy();
            return;
        }
        if(Array.isArray(scripts)){
            scripts.forEach(script => this.#eventEmitter.emit('script_changed', script));
            for (const script of scripts) {
                try {
                    const scriptCode = await websocket.getScriptCode(this.#websocket, script);
                    this.#scripts.set(script.id, {
                        response: script,
                        code: scriptCode
                    })
                } catch (error) {
                    console.error("error in ShellyDevice.getScript", String(error))
                    continue;
                }
            }
        }
        
        const emitter = this.#eventEmitter;
        if (emitter && typeof emitter.emit === 'function') {
            emitter.emit('change');
        }
    }

    async init() {
        try {
            this.#websocket = await websocket.connectToShelly(this.#shellyID);
        } catch (error) {
            console.error("error connecting", String(error))
            this.destroy();
            return;
        }
        try {
            await websocket.enableDebug(this.#websocket);
            // this.initDebug();
        } catch (error: any) {
            if(error.code == 401){
                // shelly is password protected, nothing we can do
                mdns.addToPermaBan(this.#shellyID);
                this.destroy();
                return;
            }

            this.#eventEmitter.emit('error_message', `Enabling the debug log for ${this.shellyID} failed.`)
        }


        try {
            await this.refreshScripts();
        } catch (error) {
            console.error("error refreshing scripts", error)
            return;
        }

        this.#name = await websocket.getDeviceName(this.#websocket);

        this.#eventEmitter.emit('ready');
        this.#websocket.onMessage((method, params) => this.handleShellyNotifications(method, params));
        this.#ready = true;

    }

    fireDebugMessageEvent(data: debug_msg_t){
        this.#eventEmitter.emit('debug_message', data);
    }

    openDebug() {
        this.#debug = new WebSocket(`ws://${this.#shellyID}/debug/log`);
        this.#debug.on('open', () => {
            console.log("debug log enabled on", this.#shellyID);
            this.#debug.on('message', (rawData) => {
                try {
                    const data = JSON.parse(rawData.toString());
                    if (!is_debug_message_t(data)) {
                        return;
                    }
                    this.#debugMessages.push(data);
                    this.fireDebugMessageEvent(data);
                } catch (error) {
                    console.error("error parsing ws debug log", error)
                }
            })
        });
        this.#debug.on('close', () => {
            console.warn("Closed debug log on", this.#shellyID);
        });
        this.#debug.on('error', () => {
            console.error("Error in debug log on", this.#shellyID);
        })
    }

    closeDebug(){
        if(this.#debug.readyState == this.#debug.OPEN){
            this.#debug.close();
        }
    }

    on(event: string | symbol, listener: (...args: any[]) => void) {
        this.#eventEmitter.on(event, listener)
    }

    destroy() {
        this.#eventEmitter.emit('close');
        this.#websocket?.destroy();
    }

    firstConsoleFormat() {
        this.consoleFormat[0] = !this.consoleFormat[0];
        this.#eventEmitter.emit('console_format_changed', 0, this.consoleFormat[0]);
    }

    secondConsoleFormat() {
        this.consoleFormat[1] = !this.consoleFormat[1];

        this.#eventEmitter.emit('console_format_changed', 1, this.consoleFormat[1]);
    }

    setScriptEnabled(id: number, value: boolean){
        const script = this.#scripts.get(id); 
        if(script) {
            script.response.enable = value;
        }
    }

    get websocket() {
        return this.#websocket;
    }

    get ready() {
        return this.#ready;
    }

    get shellyID() {
        return this.#shellyID;
    }

    get scripts() {
        return this.#scripts;
    }

    get debugMessages() {
        return this.#debugMessages;
    }

    get name() {
        return this.#name;
    }

    get consoleFormat() {
        return this.#consoleFormat;
    }

    static UPLOAD_CHUCK_SIZE = 1024;
}