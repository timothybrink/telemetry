ui.init()

// Open websocket to server
let ws = new WebSocket('ws://localhost:3300/wsui')

ws.addEventListener('open', function (event) {
  ws.send('open-conn')
  console.log('Connection to server initiated')
})

ws.addEventListener('message', function (event) {
  // We got something from the server:
  try {
    data = JSON.parse(event.data)
    // Not data, just a message telling us the server has a new data source
    if (data.event == 'data-opened') {
      dataMgr.initDataStream(data.id, data.headers)
    }
    // Not data either, a message telling us that a connection to the
    // server was closed
    else if (data.event == 'data-closed') {
      dataMgr.closeDataStream(data.id)
    }
    // Data was recieved from the source with the given id.
    else if (data.data) {
      dataMgr.newData(data.id, data.time, data.data)
    }
  } catch (e) {
    console.error(e.stack, event.data)
  }
})

ws.addEventListener('error', function (event) {
  console.error(event)
})

ws.addEventListener('close', function (event) {
  console.log('Connection closed')
})