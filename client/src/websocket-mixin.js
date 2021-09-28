export default {
  created() {
    console.log('created')
    this.URL = location.origin
    if (window.webpackHotUpdate) { // dev mode
      this.URL = this.URL.replace(':8080', ':3000')
    }
    this.connect()
  },
  methods: {
    connect() {
      const websocket = new WebSocket(`${this.URL.replace(/^http/, 'ws')}${this.websocketUrl || '/websockets/control'} `)
      websocket.addEventListener('close', () => {
        console.log('closed')
        setTimeout(() => this.connect(), 1000)
      })
      websocket.addEventListener('error', console.error)
      websocket.addEventListener('message', message => this.onMessage(message))
      this.send = data => websocket.send(JSON.stringify(data))
      this.sendRaw = data => websocket.send(data)
    },
    onMessage(message) {
      console.log(message.data)
      const data = JSON.parse(message.data)
      Object.assign(this, data)
      if (this[`do_${data.action}`]) {
        this[`do_${data.action}`](data)
      }
    }
  }
}
