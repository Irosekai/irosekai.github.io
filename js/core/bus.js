/**
 * 极简事件总线 —— 模块之间唯一的通信方式。
 * 好处：任何模块都可以订阅别人，自己却不需要知道谁在听。
 * 事件约定：
 *   'locale:change' (code)     语言已切换
 *   'data:ready'    (payload)  GitHub 数据就绪
 *   'data:error'    (error)    数据获取失败
 *   'data:loading'  ()         开始请求
 */

export function createBus() {
  /** @type {Map<string, Set<Function>>} */
  const listeners = new Map();

  function on(event, fn) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(fn);
    return () => off(event, fn);
  }

  function off(event, fn) {
    listeners.get(event)?.delete(fn);
  }

  function once(event, fn) {
    const un = on(event, (payload) => {
      un();
      fn(payload);
    });
    return un;
  }

  function emit(event, payload) {
    const set = listeners.get(event);
    if (!set) return;
    // 复制一份，允许监听器内部增删监听
    for (const fn of [...set]) {
      try {
        fn(payload);
      } catch (err) {
        // 单个监听器崩溃不应影响其他人
        console.error(`[bus] listener for "${event}" threw:`, err);
      }
    }
  }

  return { on, off, once, emit };
}

export default createBus;
