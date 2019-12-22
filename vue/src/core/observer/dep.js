/* @flow */

import type Watcher from './watcher'
import { remove } from '../util/index'

let uid = 0

/**
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 */
export default class Dep {
  // 静态属性target 指向全局唯一的Watcher
  static target: ?Watcher
  id: number
  // 存储Watcher的数组
  subs: Array<Watcher>

  constructor() {
    this.id = uid++
    this.subs = []
  }

  addSub(sub: Watcher) {
    this.subs.push(sub)
  }

  removeSub(sub: Watcher) {
    remove(this.subs, sub)
  }

  depend() {
    if (Dep.target) {
      Dep.target.addDep(this)
    }
  }

  notify() {
    // stabilize the subscriber list first
    // 遍历watcher，执行update
    const subs = this.subs.slice()
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update()
    }
  }
}

// the current target watcher being evaluated.
// this is globally unique because there could be only one
// watcher being evaluated at any time.
Dep.target = null
const targetStack = []

export function pushTarget(_target: ?Watcher) {
  if (Dep.target) targetStack.push(Dep.target) // 压栈，为了恢复用
  // 给Dep.target赋值当前watcher
  Dep.target = _target
}

export function popTarget() {
  Dep.target = targetStack.pop()
}
