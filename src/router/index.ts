import { createRouter, createWebHashHistory } from 'vue-router'
import ProjectManager from '@/views/ProjectManager.vue'
import Dashboard from '@/views/Dashboard.vue'

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: ProjectManager },
    { path: '/dashboard', component: Dashboard },
  ],
})
