'use strict'

const express = require('express')
const expressWs = require('express-ws')
const _ = require('lodash')
const config = require('./config.json')
const game = config.game
const teams = _.keyBy(config.teams, 'name')
for (const team of Object.values(teams)) {
  team.score = 0
  team.connected = false
}

const app = express()
const port = 3000

const STATES = {
  start: ['round'],
  round: ['play'],
  play: ['next', 'pause'], // answer
  pause: ['play', 'next'],
  answer: ['right', 'wrong'],
  right: ['next', 'listen'],
  wrong: ['play', 'next'],
  listen: ['listenPause', 'next'],
  listenPause: ['listen', 'next'],
  next: [],
  end: ['start']
}
const BUZZER_BLACK = { mode: 0, color: '000000' }
const BUZZER_RAINBOW = { mode: 12 }
const BUZZER_STATIC = { mode: 0 }
const BUZZER_GYRO = { mode: 15, speed: 100 }
const BUZZER_BLINK = { mode: 14, speed: 700 }

expressWs(app)
app.use('/media', express.static('media'))
app.use('/', express.static('static'))

app.get('/', (req, res) => res.send('Hello World!'))

app.ws('/websockets/control', async (ws, req) => {
  try {
    await connectControl(ws)
  } catch (err) {
    console.error('Error connectControl', err)
  }
})

let state = 'start'
let round = 0
let item = 0
let winner = null
const controllers = []

const updateControllers = async data => {
  await Promise.all(controllers.map(async controller => {
    try {
      await controller.send(JSON.stringify(data))
    } catch (err) {
      console.error('Error updateControllers', err, controller)
    }
  }))
}

const updateBuzzers = async options => {
  await Promise.all(_.map(teams, async team => {
    try {
      if (team.change) {
        await team.change(options)
      }
    } catch (err) {
      console.error('Error updateBuzzers', err)
    }
  }))
}

const connectControl = async ws => {
  console.log('Controller connection')
  controllers.push(ws)

  ws.on('close', () => {
    _.pull(controllers, ws)
  })

  await ws.send(JSON.stringify({
    action: 'init',
    game,
    teams: _.mapValues(teams, t => _.pick(t, ['name', 'logo', 'score', 'color'])),
    state,
    item,
    round,
    stateButtons: STATES[state]
  }))
  await updateControllerBuzzerList()

  ws.on('message', async message => {
    try {
      const data = JSON.parse(message)
      console.log('>>>', message)
      switch (data.action) {
        case 'state':
          await changeState(data.state)
          break
        case 'buzzer':
          await teams[data.team].change(BUZZER_STATIC)
          setTimeout(async () => {
            try {
              await teams[data.team].change(BUZZER_STATIC)
            } catch (err) {
              console.error('Error timeout buzzer', err, data)
            }
          }, 5000)
          break
        case 'point':
          teams[data.team].score += data.value
          await updateControllers({ action: 'score', team: data.team, score: teams[data.team].score })
          break
        case 'command':
          await updateControllers(data)
          break
        case 'setItem':
          round = data.round
          item = data.item
          await changeState('play')
          break
      }
    } catch (err) {
      console.error('Error controlMessage', err)
    }
  })
}

const changeState = async newState => {
  state = newState
  switch (state) {
    case 'start':
      round = 0
      item = 0
      break
    case 'round':
      await updateBuzzers(BUZZER_BLACK)
      await updateControllers({ action: 'round', round, item })
      break
    case 'play':
      winner = null
      await updateControllers({ action: 'play', round, item })
      await updateBuzzers(BUZZER_RAINBOW)
      break
    case 'pause':
      await updateBuzzers(BUZZER_BLACK)
      break
    case 'answer':
      await updateBuzzers(BUZZER_BLACK)
      await teams[winner].change(BUZZER_BLINK)
      break
    case 'right':
      teams[winner].score++
      await updateBuzzers(BUZZER_BLACK)
      await teams[winner].change(BUZZER_GYRO)
      await updateControllers({ action: 'score', team: winner, score: teams[winner].score })
      break
    case 'wrong':
      await updateBuzzers(BUZZER_BLACK)
      break
    case 'listen':
      break
    case 'listenPause':
      await updateBuzzers(BUZZER_BLACK)
      break
    case 'next':
      item++
      state = 'play'
      if (item >= game[round].items.length) {
        item = 0
        round++
        state = 'round'
        if (round >= game.length) {
          round = 0
          state = 'end'
        }
      }
      await changeState(state)
      break
    case 'end':
      break
  }
  await updateControllers({ action: 'state', state, stateButtons: STATES[state] })
}

const updateControllerBuzzerList = async () => {
  await updateControllers({
    action: 'buzzers',
    buzzers: _.filter(teams, t => t.connection).map(t => t.name)
  })
}

app.ws('/websockets/buzzer', async (ws, req) => {
  try {
    const ip = req.connection.remoteAddress
    const team = _.find(teams, t => t.ip === ip) || _.find(teams, t => !t.connection)
    console.log('buzzer connected', ip, team.name, team.color)
    team.connection = ws
    team.connected = ws
    team.send = async (...commands) => Promise.all(
      commands.map(command => ws.send(command))
    )
    team.change = async ({ color = team.color, mode = 0, speed, brightness }) => team.connection && Promise.all([
      console.log('change', team.name, color, mode),
      team.send(`c ${color}`),
      team.send(`m ${mode}`),
      speed && team.send(`s ${speed}`),
      brightness && team.send(`b ${brightness}`)
    ])

    team.change(BUZZER_STATIC)
    setTimeout(() => {
      team.change(BUZZER_BLACK).catch(err => {
        console.error('Error timeout buzzer connect', err, team)
      })
    }, 5000)

    await updateControllerBuzzerList()
    ws.on('error', async err => { console.error(err) })
    ws.on('close', async () => {
      try {
        console.log('buzzer disconnected', ip, team.name)
        team.connection = null
        await updateControllerBuzzerList()
      } catch (err) {
        console.error('Error buzzer message', err, team)
      }
    })

    ws.on('message', async (msg) => {
      try {
        console.log('buzzer hit', ip, team.name)
        await updateControllers({
          action: 'hit',
          hit: team.name
        })
        if (state === 'play' && !winner) {
          winner = team.name
          await changeState('answer')
        }
      } catch (err) {
        console.error('Error buzzer message', err, team)
      }
    })
  } catch (err) {
    console.error('Error buzzer connect', err)
  }
})

app.listen(port, () => console.log(`Buzzer server listening on port ${port}`))
