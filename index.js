const { app, BrowserWindow, BrowserView, ipcMain, Tray, Menu, globalShortcut } = require('electron')
const path = require('path')
const Store = require('electron-store');
const store = new Store();

let mainwin;
let tray;
let framemenuheight = 40;
let config;

function createHomeBridgeBrowserView() {
  const view = new BrowserView();
  //mainwin.webContents.openDevTools({ mode: 'detach' });
  mainwin.setBrowserView(view)
  view.setBounds({ x: 0, y: framemenuheight, width: 1200, height: (800 - framemenuheight) })
  view.setAutoResize({ width: true, height: true });
  view.webContents.loadURL("http://" + config.address + ":" + config.port.toString());
}

function createWindow() {
  
  tray = new Tray(path.join(__dirname, 'tray.png'));
  
  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: 'Show App', click: function () {
        mainwin.show();
      }
    },
    {
      label: 'Restore Config', click: function () {
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
    width: 1200,
    height: 800,
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

    if(tempconfig == undefined) {
      mainwin.webContents.send('showconfig');
    } else {
      config = tempconfig;
      createHomeBridgeBrowserView();
    }
  })

}

app.whenReady().then(() => {

  globalShortcut.register('Alt+CommandOrControl+H', () => {
    if(mainwin.isVisible() == true) {
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

ipcMain.on("sucessconfig", (event,data) => {
  store.set("homebrige-config",data);
  config = data;
  createHomeBridgeBrowserView();
});