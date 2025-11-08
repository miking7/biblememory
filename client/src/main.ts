// Import styles (Tailwind + custom)
import './styles.css';

// Import Vue
import { createApp } from 'vue';

// Import our App component
import App from './App.vue';

// Create Vue app with our App component
const app = createApp(App);

// Custom directive for click outside
app.directive('click-outside', {
  mounted(el: any, binding: any) {
    el.clickOutsideEvent = (event: Event) => {
      if (!(el === event.target || el.contains(event.target as Node))) {
        binding.value(event);
      }
    };
    document.addEventListener('click', el.clickOutsideEvent);
  },
  unmounted(el: any) {
    document.removeEventListener('click', el.clickOutsideEvent);
  }
});

// Mount to #app div
app.mount('#app');

console.log('Bible Memory App initialized with Vue.js');
