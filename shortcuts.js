const rp = require('request-promise-native');


async function initShortcuts(globalShortcut) {
    globalShortcut.register('Alt+CommandOrControl+1', () => {
        runShortCut(1);
      })
    
      globalShortcut.register('Alt+CommandOrControl+2', () => {
        runShortCut(2);
      })
    
      globalShortcut.register('Alt+CommandOrControl+3', () => {
        runShortCut(3);
      })
    
      globalShortcut.register('Alt+CommandOrControl+4', () => {
        runShortCut(4);
      })
    
      globalShortcut.register('Alt+CommandOrControl+5', () => {
        runShortCut(5);
      })
    
      globalShortcut.register('Alt+CommandOrControl+6', () => {
        runShortCut(6);
      })
    
      globalShortcut.register('Alt+CommandOrControl+7', () => {
        runShortCut(7);
      })
    
      globalShortcut.register('Alt+CommandOrControl+8', () => {
        runShortCut(8);
      })
    
      globalShortcut.register('Alt+CommandOrControl+9', () => {
        runShortCut(9);
      })

      loadShortcuts();
}

async function loadShortcuts() {

}

async function getbearer() {
    var options = {
        url: "http://" + global.config.address + ":" + global.config.port.toString() + "/api/auth/login",
        method: 'POST',
        json: { username: global.config.username, password: global.config.password },
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    };
    let response = await rp(options);
    bearer = response["access_token"];
}

async function getDeviceList() {
    var options = {
        url: "http://" + global.config.address + ":" + global.config.port.toString() + "/api/accessories",
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + bearer,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        json: true
    };
    let response = await rp(options);
    let devices = [];
    response.forEach((device) => {
        if (device.type === "Lightbulb" || device.type === "Outlet") {
            devices.push({ type: device.type, uuid: device.uuid, values: device.values, name: device.serviceName });
        }
    });
    return devices;
}

async function runShortCut(id) {
    console.log("RUNNING SHORTCUT " + id);
}

module.exports.getbearer = getbearer;
module.exports.getDeviceList = getDeviceList;
module.exports.runShortCut = runShortCut;
module.exports.initShortcuts = initShortcuts;