import {EventEmitter} from 'events'

import {stringify, parse} from 'serialify'

import type WebSocket from 'ws'

export type SendOption = {mask?: boolean; binary?: boolean; compress?: boolean; fin?: boolean}
export type SendCallback = (err?: Error) => void
export declare interface WSSend<T=any, R=T> {
  on(event: 'message', handler: (data: R) => void): this
}

export class WSSend<T=any, R=T> extends EventEmitter {

  constructor(public socket: WebSocket) {
    super()
    this.handleMessage = this.handleMessage.bind(this)
    this.handleClose = this.handleClose.bind(this)
    if (this.socket.readyState !== this.socket.CLOSED) {
      this.socket.on('message', this.handleMessage)
      this.socket.on('close', this.handleClose)
    }
  }

  private async handleMessage(data: Buffer | string) {
    try {
      const s = data.toString()
      const d = parse(s)
      if (d === void (0) || d === null) return
      if (d.__t === 'ws-send') {
        this.emit('message', d.__v)
      }
    } catch(e) {}
  }

  private async handleClose() {
    this.clean()
  }

  public clean() {
    this.socket.off('message', this.handleMessage)
    this.socket.off('close', this.handleClose)
    this.removeAllListeners()
  }

  public send(data: T): Promise<void>
  public send(data: T, options?: SendOption): Promise<void>
  public send(data: T, cb?: SendCallback): void
  public send(data: T, options?: SendOption, cb?: SendCallback): void
  public send(data: T, optionOrCallback?: SendOption | SendCallback, callback?: SendCallback): Promise<void> | void {
    const option = typeof optionOrCallback === 'function' ? {} : (optionOrCallback || {})
    const cb = typeof optionOrCallback === 'function' ? optionOrCallback : callback
    const p = new Promise<void>((resolve, reject) => {
      const s = stringify({__t: 'ws-send', __v: data})
      const b = Buffer.from(s)
      this.socket.send(b, option, err => {
        cb && cb(err)
        err ? reject(err) : resolve()
      })
    })
    if (cb) p.catch(() => {})
    return cb ? void (0) : p
  }

}

export const sendify = <T=any, R=T>(ws: WebSocket) => new WSSend<T, R>(ws)
