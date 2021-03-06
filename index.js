const { app, BrowserWindow, BrowserView, ipcMain, Tray, Menu, globalShortcut, session } = require('electron')
const path = require('path')
const Store = require('electron-store');
const store = new Store();
const notifier = require('node-notifier');
const rp = require('request-promise-native');
const cheerio = require('cheerio');
const semver = require('semver');
const shortcut = require("./shortcuts");

let mainwin;
let shortcutwin;
let tray;
let framemenuheight = 40;
global.config = {};
let winconfig;

function updateWinConfig() {
  store.set("window-config", winconfig);
}

function createHomeBridgeBrowserView() {
  const view = new BrowserView();
  mainwin.setBrowserView(view)
  view.setBounds({ x: 0, y: framemenuheight, width: winconfig.size.width, height: (winconfig.size.height - framemenuheight) })
  view.setAutoResize({ width: true, height: true });
  view.webContents.loadURL("http://" + global.config.address + ":" + global.config.port.toString());
  view.webContents.executeJavaScript(`
    let logattemptinterval;  

    async function postData(url = '', data = {}) {
      const response = await fetch(url, {
        method: 'POST', 
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      return response.json();
      }

    async function login() {
        if(document.getElementsByTagName("div").length > 7) {
            clearInterval(logattemptinterval);
        } else {
          postData('api/auth/login ', { username: "${global.config.username}",password:"${global.config.password}"})
            .then(data => {
              localStorage.setItem("access_token",data.access_token);
              location.reload();
            });
        }

    }
    login();
    logattemptinterval = setInterval(login,2000);

  `)

  //view.webContents.openDevTools({mode:"detach"});
}

function createShortCutWindow() {

  shortcutwin = new BrowserWindow({
    width: 500,
    height: 500,
    frame: false,
    transparent: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })
  shortcutwin.loadURL(`file://${__dirname}/shortcuts.html`)
  //mainwin.webContents.openDevTools({mode:"detach"});
  shortcutwin.once('ready-to-show', async () => {
  })

}

function createWindow() {

  //GETTING WIN CONFIG 

  var tempwinconfig = store.get("window-config");

  if (tempwinconfig == undefined) {
    store.set("window-config", { pos: { x: 200, y: 200 }, size: { width: 1000, height: 800 } });
  } else {
    winconfig = tempwinconfig;
  }

  tray = new Tray(path.join(__dirname, 'tray.png'));

  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: 'Show App', click: function () {
        mainwin.show();
      }
    },
    {
      label: 'Restore Config', click: function () {
        session.defaultSession.clearStorageData();
        store.delete("window-config");
        store.delete('homebrige-config');
        app.relaunch()
        app.exit()
      }
    },
    {
      label: 'Quit', click: function () {
        isQuiting = true;
        app.quit();
      }
    }
  ]));

  mainwin = new BrowserWindow({
    width: winconfig.size.width,
    height: winconfig.size.height,
    x: winconfig.pos.x,
    y: winconfig.pos.y,
    frame: false,
    transparent: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })
  mainwin.loadURL(`file://${__dirname}/frame.html`)
  //mainwin.webContents.openDevTools({ mode: "detach" });

  mainwin.once('ready-to-show', async () => {
    let tempconfig = store.get('homebrige-config');

    if (tempconfig == undefined) {
      mainwin.webContents.send('showconfig');
    } else {
      global.config = tempconfig;
      createHomeBridgeBrowserView();
      mainwin.webContents.send("update:status", "Connecting to API");
      await shortcut.getbearer();
      mainwin.webContents.send("update:status", "Fetching devices");
      await shortcut.getDeviceList();
      mainwin.webContents.send("update:status", "Ready");
    }
  })

  mainwin.on('moved', function () {
    var pos = mainwin.getPosition();
    winconfig.pos.x = pos[0];
    winconfig.pos.y = pos[1];

    updateWinConfig();
  });

  mainwin.on('resized', function () {
    var size = mainwin.getSize();
    winconfig.size.width = size[0];
    winconfig.size.height = size[1];
    updateWinConfig();
  });

}

app.whenReady().then(async () => {

  //CHECK FOR UPDATE

  var options = {
    uri: 'https://github.com/louistb/HomebridgeDesktop/releases/latest'
  }

  var body = await rp(options);
  var $ = cheerio.load(body);
  var title = $("title").text();
  var version = title.replace(/[^\d.-]/g, '');

  if (semver.satisfies(version, app.getVersion()) == false) {
    notifier.notify({
      title: 'Home Bridge Desktop',
      message: 'New Update Available',
      open: "https://github.com/louistb/HomebridgeDesktop/releases/latest",
      icon: path.join(__dirname, 'logo.png')
    });
  }

  globalShortcut.register('Alt+CommandOrControl+H', () => {
    if (mainwin.isVisible() == true) {
      mainwin.hide();
    } else {
      mainwin.show();
    }
  })

  await shortcut.initShortcuts(globalShortcut);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipcMain.on("close:main", () => {
  app.quit();
});

ipcMain.on("minimize:main", () => {
  mainwin.hide();
});

ipcMain.on("sucessconfig", (event, data) => {
  store.set("homebrige-config", data);
  store.set("window-config", { pos: { x: 200, y: 200 }, size: { width: 1000, height: 800 } });
  global.config = data;
  createHomeBridgeBrowserView();
});

ipcMain.on("open:shortcuts", (event, data) => {
  if (shortcutwin == undefined) {
    createShortCutWindow();
  } else {
    shortcutwin.setAlwaysOnTop(true);
    shortcutwin.setAlwaysOnTop(false);
  }
});

ipcMain.on("close:shortcuts", (event, data) => {
  if (shortcutwin != undefined) {
    shortcutwin.close();
    shortcutwin = undefined;
  }
});