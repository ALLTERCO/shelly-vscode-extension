import * as vscode from 'vscode';
import * as DeviceManager from "./DeviceManager";
import * as http from './http';
import * as path from 'path';
import * as ws from './websocket';
import { createUnsavedFile } from './extension';
import ShellyDevice from './ShellyDevice';
import { TS_REFERENCE, addTSReference } from './helper';

let lastShelly: vscode.TreeItem | undefined;

function getDevicesAsTreeItems()  {
    let items: vscode.TreeItem[] = [];

    for(const device of DeviceManager.getDevices()){
        items.push({
            label: device.shellyID,
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            contextValue: "parent-item",
            description: device.name || "",
            command: {
                command: 'shelly-vscode-extension.last',
                title: 'Last Script',
                arguments: [{
                    label: device.shellyID,
                    collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
                    contextValue: "parent-item",
                    description: device.name || "",
                }],
            }
        });
    }

    return items;
}

function getShellyAsTreeItem(shelly: ShellyDevice) {
    const scripts = shelly.scripts.values();

    let items: vscode.TreeItem[] = [];
    for (const script of scripts) {
        let iconPath = 'toggle-' + (script.response.enable ? 'on' : 'off') + (script.response.running ? '-started':'') + '.svg';

        let code = script.code;
        code = addTSReference(code);

        items.push({
            label: script.response.name,
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            contextValue: "child-item",
            command: {
                command: 'shelly-vscode-extension.openScriptFile',
                title: 'Open Scripts',
                arguments: [script.response.name, shelly.shellyID, script.response.id, code],
            },
            id: `${shelly.shellyID}.${script.response.id}`,
            description: shelly.shellyID,
            iconPath: {
                light: vscode.Uri.file(path.join(__filename, '..', '..', 'media', 'light', iconPath)),
                dark: vscode.Uri.file(path.join(__filename, '..', '..', 'media', 'dark', iconPath))
            }
        })
    }

    return items;
}

export class TreeViewProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined> = new vscode.EventEmitter<vscode.TreeItem | undefined>();
    readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined> = this._onDidChangeTreeData.event;

    constructor() {
        DeviceManager.on('change', () => {
            this.refresh();
        });

    }

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    getChildren(element?: vscode.TreeItem | undefined): vscode.TreeItem[] {
        if (!element) {
            // return [];
            return getDevicesAsTreeItems();
        }

        if (element.collapsibleState === vscode.TreeItemCollapsibleState.Collapsed && element.label) {
            // If the element is a parent item, return its children from the scripts array
            const shellyID = String(element.label);
            const shelly = DeviceManager.getDevice(shellyID);
            if (shelly == undefined) {
                return []; // shelly not found
            }

            // return [];
            return getShellyAsTreeItem(shelly);
        }

        return [];
    }

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    async createScript(item: vscode.TreeItem,  data1?: string, name?: string) {
        if(!name){
            name = await vscode.window.showInputBox({
                prompt: "Enter your script's name...",
                value: "",
                ignoreFocusOut: true
            });
        }
        if (name === undefined) {
            // User cancelled the prompt
            vscode.window.showErrorMessage(`Failed to create: ${Error}`);
            return;
        }

        try {
            let shellyID: string;

            if (item) {
                shellyID = String(item.label);
            } else {
                shellyID = lastShelly?.label + '';
            }
            const shelly = DeviceManager.getDevice(shellyID);
            let data: any;
            if (shelly === undefined || shelly.websocket == undefined) {
                data = await http.createScript(name, shellyID);
            } else {
                data = await ws.createScript(shelly.websocket, name);
            }

            let content = TS_REFERENCE + "// created from vscode"
            if(data1!==undefined){
                content = data1;
            }
            if (data) {
                vscode.window.showInformationMessage(`Script created!`);
                // maybe ws?
                if(shelly?.websocket){
                    await ws.uploadScript(shelly.websocket, data.id, content);
                } else {
                    await http.uploadScript(shellyID, data.id, content);
                }
                createUnsavedFile(name, shellyID, data.id, content);
            }

            shelly?.refreshScripts();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to create script: ${String(error)}`);
        }
    }

    async deleteScript(item: vscode.TreeItem) {
        const shelly = DeviceManager.getDevice(String(item.description));
        if (shelly === undefined) {
            return;
        }

        let items = item.id!.split(".");
        let id = items.pop()

        try {
            if(shelly.websocket){
                await ws.deleteScript(shelly.websocket, Number(id));
            }
            shelly.refreshScripts();
            vscode.window.showInformationMessage(`The script was successfully deleted!`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to delete script: ${String(error)}`);
            console.error(error)
        }
    }

    async renameScript(item: vscode.TreeItem) {
        const name = await vscode.window.showInputBox({
            prompt: "Enter a value:",
            value: "",
            ignoreFocusOut: true
        });

        if (name == undefined) {
            // User cancelled the   prompt
            vscode.window.showErrorMessage(`Failed to rename script. No name provided.`);
            return;
        }

        try {
            const shelly = DeviceManager.getDevice(String(item.description));
            if (shelly === undefined) {
                return;
            }
            let items = item.id!.split(".");
            let id = items.pop()
            let response;
            if(shelly.websocket){
                response = await ws.renameScript(shelly.websocket, name, Number(id));
            }
            shelly.refreshScripts();

            if (response) {
                vscode.window.showInformationMessage(`The script name was successfully changed to ${name}!`);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to rename script: ${String(error)}`);
            console.log(item.id);
            console.error(error);
        }
    }

    async startScript(item: vscode.TreeItem) {

        try {
            const description = item.description;
            const activeShelly = DeviceManager.getActive();
            let shellyID: string;
            let scriptID: number;

            if (typeof description === 'string') {
                shellyID = description;
                let items = item.id!.split(".");
                let id = items.pop()
                scriptID = Number(id);
            } else if (activeShelly != undefined) {
                shellyID = activeShelly.shellyID;
                scriptID = activeShelly.scriptID;
            } else {
                // nothing more to do, no way to find shelly 
                throw new Error("Cannot find shelly device");
            }
            const shelly = DeviceManager.getDevice(shellyID);

            if (shelly === undefined || shelly.websocket == undefined) {
                await http.startScript(shellyID, scriptID);
            } else {
                await ws.startScript(shelly.websocket, scriptID);
            }
            vscode.window.showInformationMessage(`The script has started successfully!`);
            vscode.commands.executeCommand('setContext', 'shelly-vscode-extension.isStarted', true);
            shelly?.refreshScripts();

        } catch (error) {
            vscode.window.showErrorMessage(`Failed to start script: ${error}`);
            console.error(error);
        }
    }

    async stopScript(item: vscode.TreeItem) {

        try {
            const description = item.description;
            const activeShelly = DeviceManager.getActive();

            let shellyID: string;
            let scriptID: number;

            if (typeof description === 'string') {
                shellyID = description;
                let items = item.id!.split(".");
                let id = items.pop()
                scriptID = Number(id);
            } else if (activeShelly != undefined) {
                shellyID = activeShelly.shellyID;
                scriptID = activeShelly.scriptID;
            } else {
                // nothing more to do, no way to find shelly 
                throw new Error("Cannot find shelly device");
            }
            const shelly = DeviceManager.getDevice(shellyID);

            if (shelly == undefined || shelly.websocket == undefined) {
                await http.stopScript(shellyID, scriptID);
            } else {
                await ws.stopScript(shelly.websocket, scriptID);
            }
            vscode.window.showInformationMessage(`The script has been stopped!`);
            vscode.commands.executeCommand('setContext', 'shelly-vscode-extension.isStarted', false);
            shelly?.refreshScripts();

        } catch (error) {
            vscode.window.showErrorMessage(`Failed to stop script: ${error}`);
            console.error(error);
        }
    }
    async enableScript(item: vscode.TreeItem) {
        try {
            const description = item.description;
            const activeShelly = DeviceManager.getActive();

            let shellyID: string;
            let scriptID: number;

            if (typeof description === 'string') {
                shellyID = description;
                let items = item.id!.split(".");
                let id = items.pop()
                scriptID = Number(id);
            } else if (activeShelly != undefined) {
                shellyID = activeShelly.shellyID;
                scriptID = activeShelly.scriptID;
            } else {
                // nothing more to do, no way to find shelly 
                throw new Error("Cannot find shelly device")
            }

            const shelly = DeviceManager.getDevice(shellyID);
            let data: any;

            if (shelly === undefined || shelly.websocket == undefined) {
                data = await http.enableScript(shellyID, scriptID);
            } else {
                data = await ws.enableScript(shelly.websocket, scriptID);
            }
            vscode.window.showInformationMessage(`The script has been enabled!`);
            vscode.commands.executeCommand('setContext', 'shelly-vscode-extension.isEnabled', true);
            if(shelly){
                shelly.setScriptEnabled(scriptID, true);
            }
            shelly?.refreshScripts();

        } catch (error) {
            vscode.window.showErrorMessage(`Failed to enable script: ${error}`);
            console.error(error);
        }
    }

    async disableScript(item: vscode.TreeItem) {
        try {
            const description = item.description;
            const activeShelly = DeviceManager.getActive();

            let shellyID: string;
            let scriptID: number;

            if (typeof description === 'string') {
                shellyID = description;
                let items = item.id!.split(".");
                let id = items.pop()
                scriptID = Number(id);
            } else if (activeShelly != undefined) {
                shellyID = activeShelly.shellyID;
                scriptID = activeShelly.scriptID;
            } else {
                // nothing more to do, no way to find shelly 
                throw new Error("Cannot find shelly device")
            }

            const shelly = DeviceManager.getDevice(shellyID);

            if (shelly === undefined || shelly.websocket == undefined) {
                await http.disableScript(shellyID, scriptID);
            } else {
                await ws.disableScript(shelly.websocket, scriptID);
            }
            if(shelly){
                shelly.setScriptEnabled(scriptID, false);
            }
            shelly?.refreshScripts();

            vscode.window.showInformationMessage(`The script has been disabled!`);
            vscode.commands.executeCommand('setContext', 'shelly-vscode-extension.isEnabled', false);

        } catch (error) {
            vscode.window.showErrorMessage(`Failed to disable script: ${error}`);
            console.error(error);
        }
    }

    async evalScript(item: vscode.TreeItem) {
        const code = await vscode.window.showInputBox({
            prompt: "Enter a value:",
            value: "",
            ignoreFocusOut: true,
        });

        if (code === undefined) {
            // User cancelled the   prompt
            vscode.window.showErrorMessage(`Eval failed. No code provided.`);
            return;
        }

        try {
            const shellyID = String(item.description);

            const shelly = DeviceManager.getDevice(shellyID);
            let data: any;

            let items = item.id!.split(".");
            let id = items.pop()

            if (shelly === undefined || shelly.websocket == undefined) {
                data = await http.evalScript(shellyID, Number(id), code);
            } else {
                data = await ws.evalScript(shelly.websocket, Number(id), code);
            }
            shelly?.refreshScripts();
            let messageData = {
                data: data.result + '\n',
                level: -1,
                ts: Date.now()/1000

            };
            shelly?.debugMessages.push(messageData);
            shelly?.fireDebugMessageEvent(messageData);
            // vscode.window.showInformationMessage(JSON.stringify(data));

        } catch (error: any) {
            vscode.window.showErrorMessage(`Eval failed: ${String(error.message)}`);
            console.error(error);
        }
    }

    lastScript(item: vscode.TreeItem) {
        lastShelly = item;
    }

    async addShelly(){
        const shellyID = await vscode.window.showInputBox({
            prompt: "ShellyID...?",
            value: "",
            ignoreFocusOut: true,
        });
        if(shellyID!== undefined){
            DeviceManager.addShelly(shellyID);
        }else{
            vscode.window.showErrorMessage(`Empty.`);
        }
    }

}