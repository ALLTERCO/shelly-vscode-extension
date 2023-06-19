import { EventEmitter } from "stream";
import { logger } from "./extension";
import ShellyDevice from "./ShellyDevice";
import * as mdns from "./mdns";

const eventEmitter = new EventEmitter();

const devices = new Map<string, ShellyDevice>();

interface active_t {
    shellyID: string,
    scriptID: number,
    scriptName: string
}

let active: active_t | undefined = undefined;

export function addShelly(shellyID: string) {
    const shelly = new ShellyDevice(shellyID);
    shelly.on('ready', () => {
        devices.set(shellyID, shelly);
        eventEmitter.emit('change', shellyID);
    });

    const forward = (event_name: string) => (...args: any[]) => {
        eventEmitter.emit(event_name, shellyID, ...args);
    }

    shelly.on('change', forward('change'))
    shelly.on('debug_message', forward('debug_message'))
    shelly.on('script_changed', forward('script_changed'))
    shelly.on('error_message', forward('error_message'))
    shelly.on('console_format_changed', forward('console_format_changed'))
}

export function on(event: string | symbol, listener: (...args: any[]) => void) {
    eventEmitter.on(event, listener)
}

export function getDevice(shellyID: string) {
    return devices.get(shellyID);
}

export function removeDevice(shellyID: string) {
    const permaBanList = mdns.getPermaBanList();
    if(!permaBanList.includes(shellyID)){
        devices.delete(shellyID);
    }
}

export function getDevices(){
    return Array.from(devices.values());
}

export function getDeviceNames() {
    return Array.from(devices.keys());
}

export function destroy() {
    devices.forEach((shelly) => shelly.destroy())
}

export function getActiveShelly() {
    return active ? getDevice(active.shellyID) : undefined;
}

export function getActive() {
    return active;
}

export function setActive(shellyID: string, scriptID: number, scriptName: string) {
    if(active){
        if(active.shellyID != shellyID){
            getDevice(active.shellyID)?.closeDebug();
            getDevice(shellyID)?.openDebug();
        }
    } else {
        getDevice(shellyID)?.openDebug();
    }
    active = { shellyID, scriptID, scriptName };
}

export function clearActiveShellyID() {
    active = undefined;
}