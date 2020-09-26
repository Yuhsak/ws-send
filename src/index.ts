import {EventEmitter} from 'events'

import {stringify, parse} from 'serialify'

import type WebSocket from 'ws'

export declare interface WSSend<T=any, R=T> {
  on(event: 'message', handler: (data: R) => void): this
}

export class WSSend<T=any, R=T> extends EventEmitter {

  constructor(public socket: WebSocket) {
    super()
    this.handleMessage = this.handleMessage.bind(this)
    this.socket.on('message', this.handleMessage)
  }

  async send(data: T): Promise<void> {
    return new Promise((resolve, reject) => {
      const s = stringify({__type: 'ws-send', __data: data})
      const b = Buffer.from(s)
      this.socket.send(b, err => {
        err ? reject(err) : resolve()
      })
    })
  }

  async handleMessage(data: any) {
    try {
      const s = data.toString()
      const d = parse(s)
      if (d?.__type === 'ws-send' && d?.__data) {
        this.emit('message', d.__data)
      }
    } catch(e) {}
  }

}

export const sendify = <T=any, R=T>(ws: WebSocket) => new WSSend<T, R>(ws)
