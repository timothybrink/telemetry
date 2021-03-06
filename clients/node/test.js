const Telemetry = require('./Telemetry')

let t = new Telemetry(['test1', 'test2', 'test3', 'test4'])

t.on('open', () => {
  t.update('test2', 2)
  t.update('test1', 1)
  t.update('test3', 1)
  t.update('test4', 1)

  setInterval(() => {
    t.update('test2', Math.round(Math.random() * 1000))
    t.update('test1', Math.round(Math.random() * 1000))
    t.update('test3', Math.round(Math.random() * 1000))
    t.update('test4', Math.round(Math.random() * 1000))
  }, 100)
})

t.on('command', command => {
  console.log('Got command', command)
})

t.on('confirmed', () => console.log('Telemetry connection initiated.'))

t.on('error', error => console.log(error))

t.on('close', () => console.log('Telemetry connection closed.'))

t.on('queued', () => console.log('Websocket not yet open!'))

setTimeout(() => { t.close(); process.exit() }, 5000)