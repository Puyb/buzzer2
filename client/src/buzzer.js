import Vue from 'vue'
import Buzzer from './Buzzer.vue'

Vue.config.productionTip = false

new Vue({
  render: h => h(Buzzer),
}).$mount('#app')

