/**
 * 数据加载器：全站只发一次请求，结果通过事件总线广播。
 * 这样新增区块（比如未来的「贡献者」「版本」）不需要再增加 API 调用。
 */

import { loadOrgData } from '../core/github.js';

export function createDataLoader({ bus }) {
  let inflight = null;
  let last = null;

  async function load({ force = false } = {}) {
    if (inflight) return inflight;

    bus.emit('data:loading');

    inflight = loadOrgData({ force })
      .then((result) => {
        last = result;
        bus.emit('data:ready', result);
        return result;
      })
      .catch((error) => {
        bus.emit('data:error', error);
        return null;
      })
      .finally(() => {
        inflight = null;
      });

    return inflight;
  }

  return {
    load,
    refresh: () => load({ force: true }),
    get: () => last,
  };
}

export default createDataLoader;
