import fetch from "node-fetch";
import ShellyDevice, { ScriptResponse } from "./ShellyDevice";

export async function listScript(shellyID: string): Promise<ScriptResponse[]> {
	const response = await fetch(`http://${shellyID}/rpc/script.list`);
	let data;

	try {
		data = <any>await response.json();
	} catch (error) {
		console.error("error in http.listScript", String(error))
		return [];
	}

	if (data && typeof data === 'object' && typeof data.scripts === 'object' && Array.isArray(data.scripts)) {
		return data.scripts as ScriptResponse[];
	}
	return [];
}

export async function getScript(shellyID: string, id: ScriptResponse): Promise<string> {
	const response = await fetch(`http://${shellyID}/rpc/script.getcode?id=${id.id}`);
	const data = <any>await response.json();
	if (data && typeof data === 'object' && typeof data.data === 'string') {
		return data.data as string;
	}
	return Promise.reject();
}

export async function renameScript(shellyID: string, name: string, id: number) {
	const response = await fetch(`http://${shellyID}/rpc/script.setConfig`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			id,
			config: {
				name
			}
		})
	});

	return response.json();
}


export async function uploadScript(shellyID: string, id: number, script_content: string) {
	// break into chunks
	for (let i = 0; i <= script_content.length; i += ShellyDevice.UPLOAD_CHUCK_SIZE) {
		await _uploadScript(shellyID, id, script_content.substring(i, Math.min(script_content.length, i + ShellyDevice.UPLOAD_CHUCK_SIZE)), i == 0)
	}
}

async function _uploadScript(shellyID: string, id: number, script_content: string, isFirst = false): Promise<void> {
	const len = script_content.length;
	const response: any = await fetch(`http://${shellyID}/rpc/script.putcode`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			id,
			append: !isFirst,
			code: script_content
		})
	}).then(res => res.json());
	if (typeof response?.len === 'number' && response.len < len) {
		return _uploadScript(shellyID, id, script_content.substring(len - response.len))
	}
}

export async function createScript(name: string, shellyID: string) {
	const response = await fetch(`http://${shellyID}/rpc/script.create`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			name: name
		})
	});

	return response.json();
}

export async function deleteScript(shellyID: string, id: number) {
	return fetch(`http://${shellyID}/rpc/script.delete`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ id })
	});
}

export async function startScript(shellyID: string, id: number) {
	return fetch(`http://${shellyID}/rpc/script.start`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ id })
	});
}

export async function stopScript(shellyID: string, id: number) {
	return fetch(`http://${shellyID}/rpc/script.stop`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ id })
	});
}

export async function enableScript(shellyID: string, id: number) {
	const response = await fetch(`http://${shellyID}/rpc/script.setConfig`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			id,
			config: {
				enable: true
			}
		})
	});

	return response.json();
}
export async function disableScript(shellyID: string, id: number) {
	const response = await fetch(`http://${shellyID}/rpc/script.setConfig`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			id,
			config: {
				enable: false
			}
		})
	});

	return response.json();
}

export async function evalScript(shellyID: string, id: number, code: string) {
	return fetch(`http://${shellyID}/rpc/script.eval`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			id,
			code
		})
	});
}
