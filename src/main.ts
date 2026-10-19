import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import 'element-plus/dist/index.css';
import './styles/base.css';
import './styles/record-list.css';
import App from './App.vue';
import placeDirective from './directives/place';
import router from './router';
import { enterMiniProgramApp } from './utils/gv-sdk';

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.use(ElementPlus, { locale: zhCn });
app.directive('place', placeDirective);
app.mount('#app');
router.isReady().finally(() => {
  enterMiniProgramApp();
});
