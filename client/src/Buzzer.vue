<template>
  <div>
    <h1>Buzzer simulator</h1>
    <div>{{ command }}</div>
    <button type="button" @click="hit()">Hit</button>
  </div>
</template>

<script>
import WebsocketMixin from './websocket-mixin'

export default {
  name: 'App',
  mixins: [WebsocketMixin],
  components: {
  },
  data: () => ({
    command: '',
    websocketUrl: '/websockets/buzzer'
  }),
  methods: {
    onMessage(message) {
      this.command = message.data
    },
    hit() {
      this.send('hit')
    }
  }
}
</script>

<style>
</style>
