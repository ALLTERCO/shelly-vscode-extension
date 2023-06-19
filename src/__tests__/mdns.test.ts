import * as mdns from '../mdns';
import * as DeviceManager from '../DeviceManager';

beforeAll(async () => {
    mdns.create();
    mdns.subscribe((shellyID: string) => {
		DeviceManager.addShelly(shellyID);});
    await new Promise((resolve) => setTimeout(resolve, 5000));    
}, 5100);

test('', () => {
    expect(mdns.getDevices()).toBeTruthy();
});

afterAll(() => {
    mdns.destroy();
});