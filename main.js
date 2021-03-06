const { app, BrowserWindow, ipcMain, webContents } = require('electron')
const url = require('url')
const path = require('path')
const fs = require('fs')
const cp = require('child_process')
const SuspendedChannel = require('./SuspendedChannel')

let win

function createWindow() {
  // Create the browser window
  // Create the browser window.
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    backgroundColor: '#1E1E1E',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
      contextIsolation: false,
    },
    show: false,
  })

  // and load the index.html of the app.
  win.loadURL(url.format({
    protocol: 'file',
    pathname: path.join(__dirname, 'ui', 'index.html'),
  }))

  win.once('ready-to-show', function () {
    win.show()
  })

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null
  })
}

require('@electron/remote/main').initialize()

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(createWindow)

// Quit and clean up when all windows are closed
app.on('window-all-closed', shutDown)

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// Set up telemetry config files
// For the ui
let uiConfigPath = path.join(app.getPath('userData'), 'uiConfig')
fs.mkdir(uiConfigPath, () => {
  console.log('Created config directory: ' + uiConfigPath)
})
// For plugins
let pluginConfigPath = path.join(app.getPath('userData'), 'pluginConfig')
fs.mkdir(pluginConfigPath, () => {
  console.log('Created config directory: ' + pluginConfigPath)
})

// Spawn telemetry server thread
let serverProcess = cp.fork(path.join(__dirname, 'server.js'))

// Pass on messages from server
serverProcess.on('message', msg => {
  let { event, dataId, data, time } = msg
  win.webContents.send(event, dataId, data, time)
})

// Telemetry plugin manager. We pass it the plugin config path as an argument.
let pluginProcess = cp.fork(path.join(__dirname, 'pluginManager.js'), [pluginConfigPath], { stdio: 'pipe' })

let messageQueue = new SuspendedChannel(function (item) {
  win.webContents.send(item.event, item.dataId, item.data, item.time)
})
let didListen = false

// pass on messages from plugins
pluginProcess.on('message', msg => {
  messageQueue.send(msg);

  if (win.webContents.isLoading() && !didListen) {
    win.webContents.on('did-finish-load', () => {
      messageQueue.enable()
    })
    didListen = true
  } else if (!win.webContents.isLoading() && !messageQueue.active) {
    messageQueue.enable();
  }
})

// errors
pluginProcess.on('error', (code) => {
  console.error('error with plugin process: ' + code)
})
pluginProcess.stdout.on('data', data => {
  console.log(data.toString('utf8').trim())
})
pluginProcess.stderr.on('data', chunk => {
  console.error(chunk.toString('utf8').trim())
})

// Manage commands
ipcMain.on('command', (event, command, dataId) => {
  let obj = { event: 'command', command, dataId }
  serverProcess.send(obj)
  pluginProcess.send(obj)
})

// Shutdown management; these don't seem to work. They should, but they don't. Clean up still seems fine when exiting
// with Ctrl-C though.
process.on('SIGINT', shutDown)
process.on('SIGTERM', shutDown)

function shutDown() {
  app.quit()
  console.log('Shutting down child processess...')
  if (serverProcess) {
    serverProcess.kill() ? console.log('Sucessfully terminated server') : console.log('Failed to terminate server')
  }
  if (pluginProcess) {
    pluginProcess.kill() ? console.log('Sucessfully terminated plugins') : console.log('Failed to terminate plugins')
  }
  console.log('Exiting.')
}
