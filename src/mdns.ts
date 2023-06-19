import createMdns from "multicast-dns";
const devices: string[] = [];
let devices1: string[] = [];
let mdns = createMdns();

export function subscribe(cb: (shellyID: string) => void) {
    mdns.on('response', async (resp) => {
        const { answers } = resp;
        // eslint-disable-next-line eqeqeq
        if (answers == undefined || !Array.isArray(answers) || answers.length == 0) {return;}
        for (const ans of answers) {
            const ansName = ans.name.toLowerCase();
            if (ansName.includes("shelly") && ansName.includes("._shelly._tcp") && ans.type === 'TXT') {
                const name = ans.name.replace("._shelly._tcp", "");
                if (devices.includes(name) || devices1.includes(name)) {continue;} // already discovered
                devices.push(name);
                cb(name);

            }
        }
    });
}
export function removeDevice(shellyID: string) {
    devices.splice(devices.indexOf(shellyID));
}

export function addToPermaBan(shellyID: string) {
    devices1.push(shellyID);

}

export function getPermaBanList() {
    return devices1;
}

export function destroy() {
    mdns.destroy();
    devices1 = devices;
    return;
}

export function create() {
    mdns = createMdns();
    devices1 = [];
    return;
}

export function getDevices() {
    return devices;
}