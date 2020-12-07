<template>
  <div>
    <b-navbar toggleable="lg" type="dark" variant="info">
      <b-navbar-brand href="#">Buzzer</b-navbar-brand>

      <b-navbar-toggle target="nav-collapse"></b-navbar-toggle>

      <b-collapse id="nav-collapse" is-nav>
        <b-navbar-nav>
          <b-nav-item href="display.html">Display</b-nav-item>
          <b-nav-item href="buzzer.html">Buzzer simulator</b-nav-item>
        </b-navbar-nav>
      </b-collapse>
    </b-navbar>
    <b-container fluid>
      <b-row class="mt-3">
        <b-col>
          <b-button-group>
            <b-button @click="sendCommand('previous')"><b-icon icon="caret-left-fill"></b-icon></b-button>
            <b-button v-b-modal.modal-list><b-icon icon="music-note-list"></b-icon></b-button>
            <b-button @click="sendCommand('next')"><b-icon icon="caret-right-fill"></b-icon></b-button>
          </b-button-group>
        </b-col>
        <b-col>
          <b-button-group>
            <b-button @click="sendCommand('volDown')"><b-icon icon="volume-down-fill"></b-icon></b-button>
            <b-button @click="sendCommand('volMute')"><b-icon icon="volume-mute-fill"></b-icon></b-button>
            <b-button @click="sendCommand('volUp')"><b-icon icon="volume-up-fill"></b-icon></b-button>
          </b-button-group>
        </b-col>
      </b-row>
      <b-row class="mt-3">
        <b-col>
          <b-card :title="roundTitle">
            <b-card-text>{{ itemInfo.title }}</b-card-text>
            <b-progress :value="currentTime" :max="duration">
            </b-progress>
            <b-button-group>
              <b-button @click="sendCommand('skipTo', { to: 0 })"><b-icon icon="chevron-bar-left"></b-icon></b-button>
              <b-button @click="sendCommand('skipBackward')"><b-icon icon="skip-backward-fill"></b-icon></b-button>
              <b-button @click="sendCommand('skipForward')"><b-icon icon="skip-forward-fill"></b-icon></b-button>
              <b-dropdown text="Go to" v-if="Object.keys(itemInfo.markers || {}).length">
                <b-dropdown-item v-for="(to, marker) of itemInfo.markers" :key="marker" @click="sendCommand('skipTo', { to })">
                  <b-icon icon="chevron-bar-right"></b-icon> {{ marker }}
                </b-dropdown-item>
              </b-dropdown>
            </b-button-group>
          </b-card>
        </b-col>
      </b-row>
      <b-row class="mt-3">
        <b-col>
          <p>State: {{ state }}</p>
        </b-col>
      </b-row>
      <b-row>
        <b-col v-for="(button, index) in stateButtons" :key="button">
          <b-button @click="changeState(button)" :variant="buttonVariant(button, index)">{{ button }}</b-button>
        </b-col>
      </b-row>
      <b-row class="mt-3">
        <b-col>
          <b-list-group>
            <b-list-group-item v-for="team of teams" :key="team.name" class="d-flex align-items-center">
              <b-avatar square :src="team.logo" variant="light" class=mr-3 :disabled="!team.connected"></b-avatar>
              <span class="mr-auto">{{ team.name }}</span>
              <b-button-group>
                <b-button @click="scoreDown(team)" :disabled="!team.connected">-</b-button>
                <b-button @click="buzzer(team)" :disabled="!team.connected">{{ team.score }}</b-button>
                <b-button @click="scoreUp(team)" :disabled="!team.connected">+</b-button>
              </b-button-group>
            </b-list-group-item>
          </b-list-group>
        </b-col>
      </b-row>
    </b-container>
    <b-modal id="modal-list" ref="modal-list" ok-disabled title="Song list" scrollable>
      <b-card no-body>
        <b-tabs card>
          <b-tab v-for="(roundObject, roundIndex) of game" :key="roundIndex" :title="roundObject.title" :active="roundIndex===round">
            <b-card-text>
              <b-list-group>
                <b-list-group-item v-for="(itemObject, itemIndex) of roundObject.items" :key="itemIndex" button @click="setItem(roundIndex, itemIndex)" :active="itemIndex==item">{{ itemObject.title }}</b-list-group-item>
              </b-list-group>
            </b-card-text>
          </b-tab>
        </b-tabs>
      </b-card>
    </b-modal>
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
    teams: {},
    round: 0,
    item: 0,
    game: null,
    state: null,
    stateButtons: [],
    currentTime: 0,
    duration: 1
  }),
  computed: {
    roundTitle() { return this.game && this.game[this.round].title },
    itemInfo() { return this.game && this.game[this.round].items[this.item] || {} },
  },
  methods: {
    changeState(state) {
      this.send({ action: 'state', state })
    },
    sendCommand(command, options = {}) {
      this.send({ action: 'command', command, ...options })
    },
    scoreDown(team) {
      this.send({ action: 'point', team: team.name, value: -1 })
    },
    scoreUp(team) {
      this.send({ action: 'point', team: team.name, value: 1 })
    },
    buzzer(team) {
      this.send({ action: 'buzzer', team: team.name })
    },
    setItem(round, item) {
      this.send({ action: 'setItem', round, item })
      this.$refs['modal-list'].hide()
    },
    buttonVariant(button, index) {
      if (button === 'right') return 'success'
      if (button === 'wrong') return 'danger'
      if (index === 0) return 'primary'
      return ''
    },
    do_score(data) {
      this.teams[data.team].score = data.score
    },
    do_buzzers(data) {
      for (const team of Object.values(this.teams)) {
        this.$set(this.teams[team.name], 'connected', data.buzzers.includes(team.name))
      }
    },
    do_command(data) {
      switch(data.command) {
        case 'timeUpdate':
          this.currentTime = data.currentTime
          this.duration = data.duration
          break
      }
    }
  }
}
</script>

<style>
</style>
