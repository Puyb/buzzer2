<template>
  <div>
    <div id="container" :class="state">
      <div id="screen">
        <img v-if="state==='answer'" :src="winner.logo" />
        <span v-else id="text">{{ text }}<br />{{ answer }}</span>
      </div>
    </div>
    <div id="scores">
      <div v-for="team in teams" :key="team.name">
        <div class="icon shake-constant" :ref="team.name" :disabled="!team.connected">
          <img :src="team.logo" />
        </div>
        <span>{{ team.score }}</span>
      </div>
    </div>
    <audio id="audio" preload="auto" :src="itemSrc" @timeupdate="timeUpdate()"/>
    <audio id="audioAnswer" preload="auto" src="static/scratch01.mp3" />
    <audio id="audioRight" preload="auto" src="static/tada.mp3" />
    <audio id="audioWrong" preload="auto" src="static/rewind.mp3" />
  </div>
</template>

<script>
import WebsocketMixin from './websocket-mixin'

export default {
  name: 'Display',
  mixins: [WebsocketMixin],
  components: {
  },
  data: () => ({
    URL: '',
    text: '',
    answer: '',
    teams: {},
    round: 0,
    item: 0,
    game: null,
    state: null,
    stateButtons: [],
  }),
  computed: {
    roundTitle() { return this.game && this.game[this.round].title },
    itemTitle() { return this.game && this.game[this.round].items[this.item].title },
    itemSrc() { return this.game && `${this.URL}/${this.game[this.round].items[this.item].src}` },
    winner() { return {} }
  },
  methods: {
    do_init(data) {
      Object.assign(this, data)
    },
    do_state(data) {
      this.text = ''
      this.answer = ''
      const audio = document.getElementById('audio')
      const audioAnswer = document.getElementById('audioAnswer')
      const audioRight = document.getElementById('audioRight')
      const audioWrong = document.getElementById('audioWrong')
      switch(data.state) {
        case 'round':
          this.text = this.roundTitle
          break
        case 'play':
        case 'listen':
          audio.play()
          break;
        case 'pause':
        case 'listenPause':
          audio.pause()
          break;
        case 'answer':
          audio.pause()
          audioAnswer.play()
          break
        case 'right':
          this.text = 'Right anwser'
          this.answer = this.itemTitle
          audioRight.play()
          break
        case 'wrong':
          this.text = 'Wrong anwser'
          audioWrong.play()
          break
      }
    },
    do_buzzers(data) {
      console.log(this.teams)
      for (const team of Object.values(this.teams)) {
        this.$set(this.teams[team.name], 'connected', data.buzzers.includes(team.name))
      }
    },
    do_hit(data) {
      console.log(this.$refs[data.hit][0])
      console.log(this.$refs[data.hit][0].classList)
      console.log(data.hit)
      this.$refs[data.hit][0].classList.add('shake-hard')
      setTimeout(() => {
        this.$refs[data.hit][0].classList.remove('shake-hard')
      }, 500)
    },
    do_score(data) {
      this.$set(this.teams[data.team], 'score', data.score)
    },
    do_command(data) {
      const audio = document.getElementById('audio')
      switch(data.command) {
        case 'volUp':
          audio.volume = Math.min(audio.volume / .9, 1)
          break
        case 'volDown':
          audio.volume = Math.max(audio.volume * .9 , 0)
          break
        case 'volMute':
          if (this.previousVolume === 0 && audio.volume === 0) {
            this.previousVolume = 1
          }
          if (this.previousVolume && !audio.volume) {
            audio.volume = this.previousVolume
            this.previousVolume = 0
          } else {
            this.previousVolume = audio.volume
            audio.volume = 0
          }
          break
        case 'skipBackward':
          audio.currentTime = Math.max(0, audio.currentTime - 10)
          audio.play()
          break
        case 'skipForward':
          audio.currentTime = audio.currentTime + 10
          audio.play()
          break
        case 'skipTo':
          audio.currentTime = data.to
          audio.play()
          break
      }
    },
    timeUpdate() {
      const now = Date.now()
      if (this.lastTimeUpdate > now - 1000) return
      this.lastTimeUpdate = now
      const audio = document.getElementById('audio')
      this.send({ action: 'command', command: 'timeUpdate', currentTime: audio.currentTime, duration: audio.duration })
    }
  }
}
</script>

<style>
  @import '../node_modules/csshake/dist/csshake.min.css';
  body {
    background-color: #EB0149;
    text-alignement: center;
    font-size: 100px;
    font-familly: arial;
    color: white;
  }
  body.answer {
    background-color: white;
  }
  #container {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  #scores {
    position: absolute;
    right: 0;
    width: 200px;
    height: 600px;
    top: 50%;
    margin-top: -300px;
    z-index: 10;
    font-size: 50px;
  }
  #scores>div {
    height: 100px;
    width: 100%;
  }
  .icon {
    width: 100px;
    height: 100px;
    display: inline-block;
    vertical-align: middle;
  }
  .icon>img {
    height: 100%;
  }
  .icon[disabled]>img {
    filter: grayscale(100%);
    opacity: 0.5;
  }
</style>
