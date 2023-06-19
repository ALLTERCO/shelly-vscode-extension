// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { TreeViewProvider } from './TreeViewProvider';
import * as fs from 'fs';
import * as os from 'os';
import * as mdns from './mdns';
import * as http from './http';
import * as websocket from './websocket';
import * as path from 'path';
import * as DeviceManager from "./DeviceManager";
import { debug_msg_t } from './ShellyDevice';

//Create output channel
export let logger = vscode.window.createOutputChannel("Shelly");

logger.appendLine(`[${new Date().toISOString()}] Shelly VSCode Extension started.`);

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const myTreeViewDataProvider = new TreeViewProvider();
	mdns.subscribe((shellyID) => {
		DeviceManager.addShelly(shellyID);
	});


	// write types file
	const tempDir = os.tmpdir(); // Get the system's default directory for temporary files
	const folderPath = vscode.Uri.file(tempDir);
	const filePathUri = vscode.Uri.file(folderPath.fsPath + "/shelly-script.d.ts");

	const typesFilePath = path.join(__dirname, "..", "shelly-script.d.ts");
	const typesFileContent = fs.readFileSync(typesFilePath, { encoding: 'UTF-8' });

	fs.writeFile(filePathUri.fsPath, typesFileContent, { encoding: "UTF-8", flag: 'w' }, (err) => {
		if (err) {
			console.error(err);
			vscode.window.showErrorMessage('Failed to create types file');
			return;
		}
	});

	DeviceManager.on('debug_message', (shellyID: string, debugMessage: debug_msg_t) => {
		const activeShelly = DeviceManager.getActiveShelly();
		if (activeShelly && activeShelly.shellyID == shellyID) {
			if (activeShelly.consoleFormat[0] && debugMessage.level == -1) {
				logger.append(`lvl:[${debugMessage.level}] ${debugMessage.data}`);
			}
			if (activeShelly.consoleFormat[1] && debugMessage.level != -1) {
				logger.append(`lvl:[${debugMessage.level}] ${debugMessage.data}`);
			}
			activeShelly.debugMessages.push(debugMessage);

		}
	});

	DeviceManager.on('error_message', (shellyID, message) => {
		vscode.window.showErrorMessage(`Error in ${shellyID}: ${String(message)}`)
	})

	DeviceManager.on('console_format_changed', (shellyID, id, value) => {
		const activeShelly = DeviceManager.getActiveShelly();
		if (activeShelly == undefined) {
			return;
		}
		if (activeShelly.shellyID === shellyID) {
			if (id === 0) {
				vscode.commands.executeCommand('setContext', 'shelly-vscode-extension.firstCF', value);
			} else if (id === 1) {
				vscode.commands.executeCommand('setContext', 'shelly-vscode-extension.secondCF', value);
			}
		}
		console.log('console_format_changed 2', shellyID, id, value);
	})

	context.subscriptions.push(
		vscode.window.registerTreeDataProvider("shelly-vscode-extension", myTreeViewDataProvider),
		vscode.commands.registerCommand('shelly-vscode-extension.openScriptFile', createUnsavedFile),
		vscode.commands.registerCommand('shelly-vscode-extension.create', myTreeViewDataProvider.createScript),
		vscode.commands.registerCommand('shelly-vscode-extension.delete', myTreeViewDataProvider.deleteScript),
		vscode.commands.registerCommand('shelly-vscode-extension.rename', myTreeViewDataProvider.renameScript),
		vscode.commands.registerCommand('shelly-vscode-extension.start', myTreeViewDataProvider.startScript),
		vscode.commands.registerCommand('shelly-vscode-extension.stop', myTreeViewDataProvider.stopScript),
		vscode.commands.registerCommand('shelly-vscode-extension.enable', myTreeViewDataProvider.enableScript),
		vscode.commands.registerCommand('shelly-vscode-extension.eval', myTreeViewDataProvider.evalScript),
		vscode.commands.registerCommand('shelly-vscode-extension.last', myTreeViewDataProvider.lastScript),
		vscode.commands.registerCommand('shelly-vscode-extension.addShelly', myTreeViewDataProvider.addShelly),
		vscode.commands.registerCommand('shelly-vscode-extension.freeze', () => {
			vscode.commands.executeCommand('setContext', 'shelly-vscode-extension.frozen', true);
			mdns.destroy();
		}),
		vscode.commands.registerCommand('shelly-vscode-extension.unfreeze', reset),
		vscode.commands.registerCommand('shelly-vscode-extension.firstConsoleFormat', () => {
			const activeShelly = DeviceManager.getActiveShelly();
			if (activeShelly) {
				activeShelly.firstConsoleFormat();
				refreshConsole();
			}
		}),
		vscode.commands.registerCommand('shelly-vscode-extension.secondConsoleFormat', () => {
			const activeShelly = DeviceManager.getActiveShelly();
			if (activeShelly) {
				activeShelly.secondConsoleFormat();
				refreshConsole();
			}
		}),
		vscode.commands.registerCommand('shelly-vscode-extension.firstConsoleFormat1', () => {
			const activeShelly = DeviceManager.getActiveShelly();
			if (activeShelly) {
				activeShelly.firstConsoleFormat();
				refreshConsole();
			}
		}),
		vscode.commands.registerCommand('shelly-vscode-extension.secondConsoleFormat1', () => {
			const activeShelly = DeviceManager.getActiveShelly();
			if (activeShelly) {
				activeShelly.secondConsoleFormat();
				refreshConsole();
			}
		}),

		vscode.commands.registerCommand('shelly-vscode-extension.disable', myTreeViewDataProvider.disableScript),
		vscode.commands.registerCommand("workbench.action.files.save", saveFile),
		vscode.commands.registerCommand('shelly-vscode-extension.openWebsite', openInWebBrowser),
		vscode.window.onDidChangeActiveTextEditor(updateActiveShelly)
	);

	vscode.window.onDidChangeActiveTextEditor(() => {
		const name = vscode.window.activeTextEditor!.document.uri.fsPath.split(path.sep);
		console.log(name);
		const name1 = name[name.length - 3];
		console.log(name1);
		console.log(DeviceManager.getActiveShelly());
		if (name1?.toLowerCase().includes("shelly") || name1?.toLowerCase().startsWith("192.") || name1?.toLowerCase().startsWith("172.") || name1?.toLowerCase().startsWith("10.")) {
			vscode.commands.executeCommand('setContext', 'shelly-vscode-extension.active', true);
		} else {
			vscode.commands.executeCommand('setContext', 'shelly-vscode-extension.active', false);
		}
	});
}

// This method is called when your extension is deactivated
export function deactivate() {
	mdns.destroy();
	DeviceManager.destroy();
}

function updateActiveShelly(e: vscode.TextEditor | undefined) {
	if (e) {
		const tempDir = os.tmpdir(); // Get the system's default directory for temporary files
		let path = e.document.uri.path;
		if (!path.toLowerCase().includes("shelly") && !path.startsWith(`${tempDir}/`) && !path.includes('192.') && !path.includes('172.') && !path.includes('10.')) {
			console.error("not a shelly path, but not clearing active", path);
			// DeviceManager.clearActiveShellyID();
			return;
		}
		const parts = path.split('/');
		const shellyID = parts[parts.length - 3];
		const scriptID = parts[parts.length - 2];
		const scriptName = parts[parts.length - 1];

		if (shellyID == undefined || scriptID == undefined || scriptName == undefined) {
			console.error("invalid shelly path content, clearing active", path);
			DeviceManager.clearActiveShellyID();
			return;
		}
		DeviceManager.setActive(shellyID, Number(scriptID), scriptName);
		console.info("updating active shelly shelly=[%s]", JSON.stringify(DeviceManager.getActive()));
	} else {
		console.log("onDidChangeActiveTextEditor no document.uri, most probably editor is closed, clearing active");
		DeviceManager.clearActiveShellyID();
	}
}

function saveFile(item: vscode.TreeItem) {
	const editor = vscode.window.activeTextEditor;
	if (editor) {
		const editorPath = editor.document.uri.fsPath;
		const parts = editorPath ? editorPath.split(path.sep) : [];

		if (parts.length < 3) return;

		const shellyID = parts[parts.length - 3];
		const scriptID = parseInt(parts[parts.length - 2]);
		let scriptContent = editor.document.getText();

		const shelly = DeviceManager.getDevice(shellyID);

		if (shelly == undefined) {
			return;
		}

		let uploadPromise: Promise<unknown>;
		if (shelly.websocket) {
			uploadPromise = websocket.uploadScript(shelly.websocket, scriptID, scriptContent);
		} else {
			// fallback to http
			uploadPromise = http.uploadScript(shellyID, scriptID, scriptContent);
		}

		const timeout = 5000;
		const timeoutPromise = new Promise((resolve, reject) => {
			setTimeout(() => {
				reject(new Error('Timeout!'));
			}, timeout);
		});

		Promise.race([uploadPromise, timeoutPromise]).then(() => {
			vscode.window.showInformationMessage('Script uploaded!');
			shelly.refreshScripts().catch(() => { });
			editor.document.save();
		}).catch(async () => {
			vscode.window.showErrorMessage('Upload failed!');
			try {
				const name1 = editor.document.fileName.split(path.sep);
				const name2 = name1[name1.length - 1];
				new TreeViewProvider().createScript(item, editor.document.getText(), name2);
				vscode.window.showInformationMessage('Script uploaded!');
			} catch (e) {
				vscode.window.showErrorMessage('Upload failed!');
			}
		}


		);
	}
}

function openInWebBrowser(item: vscode.TreeItem) {
	vscode.env.openExternal(vscode.Uri.parse(`http://${String(item.label)}`));
}

export async function createUnsavedFile(name: string, shellyID: string, scriptID: string, content: string): Promise<void> {
	const tempDir = os.tmpdir(); // Get the system's default directory for temporary files
	const folderPath = vscode.Uri.file(tempDir + '/' + shellyID + "/" + scriptID);
	const filePathUri = vscode.Uri.file(folderPath.fsPath + '/' + name);

	if (!fs.existsSync(folderPath.fsPath)) {
		fs.mkdirSync(folderPath.fsPath, { recursive: true });
	}

	fs.writeFile(filePathUri.fsPath, content, { encoding: "UTF-8" }, (err) => {
		if (err) {
			console.error(err);
			vscode.window.showErrorMessage('Failed to create temporary file');
			return;
		}
		vscode.workspace.openTextDocument(filePathUri).then((doc) => {
			vscode.window.showTextDocument(doc);
			vscode.languages.setTextDocumentLanguage(doc, "javascript");
			vscode.commands.executeCommand('setContext', 'shelly-vscode-extension.active', true);
		});
	});
	let shelly = DeviceManager.getDevice(shellyID);

	if (shelly == undefined) {
		return;
	}

	const script = shelly.scripts.get(Number(scriptID));
	if (script) {
		vscode.commands.executeCommand('setContext', 'shelly-vscode-extension.isEnabled', script.response.enable);
		vscode.commands.executeCommand('setContext', 'shelly-vscode-extension.isStarted', script.response.running);
	}

	vscode.commands.executeCommand('setContext', 'shelly-vscode-extension.firstCF', shelly.consoleFormat[0]);
	vscode.commands.executeCommand('setContext', 'shelly-vscode-extension.secondCF', shelly.consoleFormat[1]);
	refreshConsole();
}


export function refreshConsole() {
	logger.clear();
	const activeShelly = DeviceManager.getActiveShelly();
	if (activeShelly) {
		for (const message of activeShelly.debugMessages) {
			if (message.level === -1 && activeShelly.consoleFormat[0]) {
				logger.append(`lvl:[${message.level}] ${message.data}`);
			}
			if (message.level !== -1 && activeShelly.consoleFormat[1]) {
				logger.append(`lvl:[${message.level}] ${message.data}`);
			}

		}
	}
}

function reset() {
    mdns.destroy();
    mdns.create();
    mdns.subscribe((shellyID: string) => {
		DeviceManager.addShelly(shellyID);});
	vscode.commands.executeCommand('setContext', 'shelly-vscode-extension.frozen', false);

    return;
}
