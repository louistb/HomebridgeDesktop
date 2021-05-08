const { app, BrowserWindow, BrowserView, ipcMain, Tray, Menu, globalShortcut, session } = require('electron')
const path = require('path')
const Store = require('electron-store');
const store = new Store();
const notifier = require('node-notifier');
const rp = require('request-promise-native');

const cheerio = require('cheerio');
const semver = require('semver');
let mainwin;
let tray;
let framemenuheight = 40;
let config;
let winconfig;

function updateWinConfig() {
  store.set("window-config",winconfig);
}

function createHomeBridgeBrowserView() {
  const view = new BrowserView();
  mainwin.setBrowserView(view)
  view.setBounds({ x: 0, y: framemenuheight, width: winconfig.size.width, height: (winconfig.size.height - framemenuheight) })
  view.setAutoResize({ width: true, height: true });
  view.webContents.loadURL("http://" + config.address + ":" + config.port.toString());
  view.webContents.executeJavaScript(`
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

  postData('http://slimpi.local:8581/api/auth/login ', { username: "${config.username}",password:"${config.password}"})
    .then(data => {
      localStorage.setItem("access_token",data.access_token);
      location.reload();
    });
  `)

}

function createWindow() {

  //GETTING WIN CONFIG 

  var tempwinconfig = store.get("window-config");

  if (tempwinconfig == undefined) {
    store.set("window-config", { pos: { x: 200, y: 200 }, size: { width: 1000, height: 800} });
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
    x:winconfig.pos.x,
    y:winconfig.pos.y,
    frame: false,
    transparent: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })
  mainwin.loadURL(`file://${__dirname}/frame.html`)


  mainwin.once('ready-to-show', () => {
    let tempconfig = store.get('homebrige-config');

    if (tempconfig == undefined) {
      mainwin.webContents.send('showconfig');
    } else {
      config = tempconfig;
      createHomeBridgeBrowserView();
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
    uri:'https://github.com/louistb/HomebridgeDesktop/releases/latest'
  }

  var body = await rp(options);
  var $ = cheerio.load(body);
  var title = $("title").text();
  var version = title.replace(/[^\d.-]/g, '');

  if(semver.gte(version,app.getVersion()) == true) {
    notifier.notify({
      title: 'Home Bridge Desktop',
      message: 'New Update Available',
      open:"https://github.com/louistb/HomebridgeDesktop/releases/latest",
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

  createWindow()

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

ipcMain.on("quit", () => {
  app.quit();
});

ipcMain.on("minimize", () => {
  mainwin.hide();
});

ipcMain.on("sucessconfig", (event, data) => {
  store.set("homebrige-config", data);
  store.set("window-config", { pos: { x: 200, y: 200 }, size: { width: 1000, height: 800} });
  config = data;
  createHomeBridgeBrowserView();
});