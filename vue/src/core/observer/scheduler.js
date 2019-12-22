/* @flow */

import type Watcher from './watcher'
import config from '../config'
import { callHook, activateChildComponent } from '../instance/lifecycle'

import { warn, nextTick, devtools } from '../util/index'

export const MAX_UPDATE_COUNT = 100

const queue: Array<Watcher> = []
const activatedChildren: Array<Component> = []
let has: { [key: number]: ?true } = {}
let circular: { [key: number]: number } = {}
let waiting = false
let flushing = false
let index = 0

/**
 * Reset the scheduler's state.
 */
// 恢复流程状态控制变量的初始值，清空watcher队列
function resetSchedulerState() {
  index = queue.length = activatedChildren.length = 0
  has = {}
  if (process.env.NODE_ENV !== 'production') {
    circular = {}
  }
  waiting = flushing = false
}

/**
 * Flush both queues and run the watchers.
 */
function flushSchedulerQueue() {
  flushing = true
  let watcher, id

  // Sort queue before flush.
  // This ensures that:
  // 1. Components are updated from parent to child. (because parent is always
  //    created before the child)
  // 2. A component's user watchers are run before its render watcher (because
  //    user watchers are created before the render watcher)
  // 3. If a component is destroyed during a parent component's watcher run,
  //    its watchers can be skipped.
  // 队列从小到大排序
  // 父组件创建先于子组件，watcher创建也是先父后子，所以要确保执行顺序也是先父后子
  // 用户自定义的watcher要优先于渲染watcher，因为用户自定义watcher是在渲染watcher之前创建
  // 如果一个组件在父组件的watcher期间被销毁，那么它对应的watcher都可以被跳过，所以要先执行父组件watcher
  queue.sort((a, b) => a.id - b.id)

  // do not cache length because more watchers might be pushed
  // as we run existing watchers
  for (index = 0; index < queue.length; index++) {
    watcher = queue[index]
    if (watcher.before) {
      // beforeUpdate钩子函数
      watcher.before()
    }
    id = watcher.id
    has[id] = null
    // 遍历执行watcher.run
    watcher.run()
    // in dev build, check and stop circular updates.
    if (process.env.NODE_ENV !== 'production' && has[id] != null) {
      circular[id] = (circular[id] || 0) + 1
      if (circular[id] > MAX_UPDATE_COUNT) {
        warn(
          'You may have an infinite update loop ' +
            (watcher.user
              ? `in watcher with expression "${watcher.expression}"`
              : `in a component render function.`),
          watcher.vm
        )
        break
      }
    }
  }

  // keep copies of post queues before resetting state
  const activatedQueue = activatedChildren.slice()
  const updatedQueue = queue.slice()
  // 恢复流程状态控制变量的初始值，清空watcher队列
  resetSchedulerState()

  // call component updated and activated hooks
  callActivatedHooks(activatedQueue)
  // 获取到 updatedQueue
  callUpdatedHooks(updatedQueue)

  // devtool hook
  /* istanbul ignore if */
  if (devtools && config.devtools) {
    devtools.emit('flush')
  }
}

function callUpdatedHooks(queue) {
  let i = queue.length
  while (i--) {
    const watcher = queue[i]
    const vm = watcher.vm
    // 满足当前watcher为vm._watcher并且组件已经mounted
    if (vm._watcher === watcher && vm._isMounted) {
      callHook(vm, 'updated')
    }
  }
}

/**
 * Queue a kept-alive component that was activated during patch.
 * The queue will be processed after the entire tree has been patched.
 */
export function queueActivatedComponent(vm: Component) {
  // setting _inactive to false here so that a render function can
  // rely on checking whether it's in an inactive tree (e.g. router-view)
  vm._inactive = false
  activatedChildren.push(vm)
}

function callActivatedHooks(queue) {
  for (let i = 0; i < queue.length; i++) {
    queue[i]._inactive = true
    activateChildComponent(queue[i], true /* true */)
  }
}

/**
 * Push a watcher into the watcher queue.
 * Jobs with duplicate IDs will be skipped unless it's
 * pushed when the queue is being flushed.
 */
export function queueWatcher(watcher: Watcher) {
  const id = watcher.id
  // 判断，确保同一个watcher只进行一次添加
  if (has[id] == null) {
    has[id] = true
    if (!flushing) {
      // watcher入队
      queue.push(watcher)
    } else {
      // if already flushing, splice the watcher based on its id
      // if already past its id, it will be run next immediately.
      // 再次执行会进入这里的逻辑
      let i = queue.length - 1
      // 从前往后找
      // 找到第一个待插入 watcher 的 id 比当前队列中 watcher 的 id 大的位置
      while (i > index && queue[i].id > watcher.id) {
        i--
      }
      // 插入队列
      queue.splice(i + 1, 0, watcher)
    }
    // queue the flush
    // 判断，确保nextTick只执行一次
    if (!waiting) {
      waiting = true
      // 异步执行watcher队列
      nextTick(flushSchedulerQueue)
    }
  }
}
