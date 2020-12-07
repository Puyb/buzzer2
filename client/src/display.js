import Vue from 'vue'
import Display from './Display.vue'

Vue.config.productionTip = false

new Vue({
  render: h => h(Display),
}).$mount('#app')

