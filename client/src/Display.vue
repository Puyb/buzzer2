<template>
  <div :class="state">
    <div id="container">
      <div id="screen">
        <video id="video" preload="auto" v-if="getItemSrc('video')" @timeupdate="timeUpdate()">
          <source :src="getItemSrc('video')" />
        </video>
        <img id="image" v-if="getItemSrc('img')" :src="getItemSrc('img')" />
        <div id="screen-answer" v-if="state === 'answer'">
          <img :src="winnerTeam.logo" />
          <div id="triangles" :style="{ background: winnerTeam.hashColor }">
            <img src="static/background-answer.svg">
          </div>
        </div>
        <div id="screen-pause" v-else-if="state === 'playPause' || state === 'listenPause'"></div>
        <span v-else id="text">{{ text }}<br />{{ answer }}</span>
      </div>
    </div>
    <div id="scores">
      <div v-for="team in teams" :key="team.name">
        <div class="icon shake-constant" :ref="team.name" :disabled="!team.connected">
          <img :src="team.logo" />
          <div class="time" v-if="state==='answer'">{{ teamTime(team) }}</div>
        </div>
        <span>{{ team.score }}</span>
      </div>
    </div>
    <audio id="audio" preload="auto" v-if="getItemSrc('audio')" :src="getItemSrc('audio')" @timeupdate="timeUpdate()"/>
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
    winner: null,
  }),
  computed: {
    roundTitle() { return this.game && this.game[this.round].title },
    winnerTeam() {
      if (!this.winner) return {}
      return {
        ...this.teams[this.winner],
        hashColor: `#${this.teams[this.winner].color}`,
      }
    },
  },
  methods: {
    getItemData() {
      if (!this.game) return {}
      const kind = ['right', 'listen', 'listenPause'].includes(this.state) ? 'answer' : 'question'
      return this.game[this.round].items[this.item][kind]
    },
    getItemSrc(type) {
      const item = this.getItemData();
      if (!item[`${type}Src`]) return
      return `${this.URL}/${item[`${type}Src`]}`;
    },
    getPlayer() {
      const itemData = this.getItemData()
      if (itemData.audioSrc) {
        return document.getElementById('audio')
      }
      if (itemData.videoSrc) {
        return document.getElementById('video')
      }
    },
    do_init(data) {
      Object.assign(this, data)
    },
    do_state(data) {
      this.text = ''
      this.answer = ''
      const player = this.getPlayer()
      const audioAnswer = document.getElementById('audioAnswer')
      const audioRight = document.getElementById('audioRight')
      const audioWrong = document.getElementById('audioWrong')
      switch(data.state) {
        case 'round':
          this.text = this.roundTitle
          break
        case 'play':
        case 'listen':
          if (player) player.play()
          this.answer = this.getDataItem().title
          break;
        case 'pause':
        case 'listenPause':
          if (player) player.pause()
          this.answer = this.getDataItem().title
          break;
        case 'answer':
          if (player) player.pause()
          audioAnswer.play()
          break
        case 'right':
          this.text = 'Right anwser'
          this.answer = this.getDataItem().title
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
      this.$set(this.teams[data.hit], 'time', data.time)
      this.$refs[data.hit][0].classList.add('shake-hard')
      setTimeout(() => {
        this.$refs[data.hit][0].classList.remove('shake-hard')
      }, 500)
    },
    do_score(data) {
      this.$set(this.teams[data.team], 'score', data.score)
    },
    do_command(data) {
      const player = this.getPlayer()
      if (!player) return
      switch(data.command) {
        case 'volUp':
          player.volume = Math.min(player.volume / .9, 1)
          break
        case 'volDown':
          player.volume = Math.max(player.volume * .9 , 0)
          break
        case 'volMute':
          if (this.previousVolume === 0 && player.volume === 0) {
            this.previousVolume = 1
          }
          if (this.previousVolume && !player.volume) {
            player.volume = this.previousVolume
            this.previousVolume = 0
          } else {
            this.previousVolume = player.volume
            player.volume = 0
          }
          break
        case 'skipBackward':
          player.currentTime = Math.max(0, player.currentTime - 10)
          player.play()
          break
        case 'skipForward':
          player.currentTime = player.currentTime + 10
          player.play()
          break
        case 'skipTo':
          player.currentTime = data.to
          player.play()
          break
      }
    },
    timeUpdate() {
      const now = Date.now()
      if (this.lastTimeUpdate > now - 1000) return
      this.lastTimeUpdate = now
      const player = this.getPlayer()
      this.send({ action: 'command', command: 'timeUpdate', currentTime: player.currentTime, duration: player.duration })
    },
    teamTime(team) {
      console.log(team)
      const first = Object.values(this.teams).reduce((best, {time}) => time < best ? time : best, Infinity);
      const time = team.time
      if (!time) return ''
      if (time === first) return `${Math.round(first / 1000 * 10) / 10}s`
      return `+${Math.round((time - first) / 1000 * 10) / 10}s`
    },
  }
}
</script>

<style>
  @import '../node_modules/csshake/dist/csshake.min.css';
  body {
    background-color: black;
    text-align: center;
    font-size: 100px;
    font-family: arial;
    color: white;
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
  #image, #video {
    position: absolute;
    z-index: 0;
    left:0; top: 0;
    width: 100%;
    height: 100%;
    display: none;
  }
  #image {  object-fit: contain; }
  .play #image, .play #video,
  .right #image, .right #video,
  .listen #image, .listen #video,
  .listenPause #image, .listenPause #video { display: block; }
  #text {
    position: absolute;
    z-index: 10;
    left: 0;
    right: 0;
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
  .answer #scores {
      background: rgba(0, 0, 0, 50%);
      border-radius: 20px 0 0 20px;
  }
  #scores>div {
    height: 100px;
    width: 100%;
  }
  .icon {
    position: relative;
    width: 100px;
    height: 100px;
    display: inline-block;
    vertical-align: middle;
  }
  .icon>img {
    height: 100%;
  }
  .icon>.time {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    text-align: center;
    font-size: 24px;
  }
  .icon[disabled]>img {
    filter: grayscale(100%);
    opacity: 0.5;
  }
  #screen-answer {
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
    overflow: hidden;
  }
  #screen-answer>img {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 400px;
    height: 400px;
    margin-left: -200px;
    margin-top: -200px;
    z-index: 20;
  }
  @keyframes trianglesrotation {
    from { transform: rotate(0deg); }
    to { transform: rotate(180deg); }
  }
  #triangles {
    position: absolute;
    z-index: 10;
    width: 4000px; height: 4000px;
    left: 50%; top: 50%;
    margin-top: -2000px;
    margin-left: -2000px;
    animation-name: trianglesrotation;
    animation-duration: 4s;
    animation-iteration-count: infinite;
    animation-timing-function: linear;
  }
  #triangles>img {
    width: 100%;
    height: 100%;
  }
</style>
