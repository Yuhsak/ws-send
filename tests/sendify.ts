import http from 'http'

import WebSocket from 'ws'

import {sendify, WSSend} from '../src'

const httpServer = http.createServer()

const wsServer = new WebSocket.Server({server: httpServer})

const sockets: WebSocket[] = []

wsServer.on('connection', socket => {
  sockets.push(socket)
  socket.on('message', data => {
    socket.send(data)
  })
})

beforeAll(async () => {
  return new Promise(resolve => httpServer.listen(8000, resolve))
})

afterAll(() => {
  sockets.forEach(socket => socket.close())
  httpServer.close()
})

const connect = <T=any, R=T>(handler: (wssend: WSSend<T, R>) => void) => {
  const ws = new WebSocket('ws://localhost:8000')
  ws.on('open', () => {
    handler(sendify<T, R>(ws))
  })
}

describe('send', () => {

  test('string', (done) => {

    connect<string>(wssend => {
      wssend.on('message', data => {
        expect(data).toBe('send')
        done()
      })
      wssend.send('send')
    })

  })

  test('number', (done) => {

    connect<number>(wssend => {
      wssend.on('message', data => {
        expect(data).toBe(99)
        done()
      })
      wssend.send(99)
    })

  })

  test('boolean', (done) => {

    connect<boolean>(wssend => {
      wssend.on('message', data => {
        expect(data).toBe(true)
        done()
      })
      wssend.send(true)
    })

  })

  test('array', done => {

    connect<number[]>(wssend => {
      wssend.on('message', data => {
        expect(data).toStrictEqual([0,1,2])
        done()
      })
      wssend.send([0,1,2])
    })

  })

  test('object', done => {

    connect<{a: number, b: number, c: string}>(wssend => {
      wssend.on('message', data => {
        expect(data).toStrictEqual({a: 0, b: 1, c: 'c'})
        done()
      })
      wssend.send({a: 0, b: 1, c: 'c'})
    })

  })

  test('set', done => {

    connect<Set<number>>(wssend => {
      wssend.on('message', data => {
        expect([...data.values()]).toStrictEqual([0,1,2])
        done()
      })
      wssend.send(new Set([0,1,2]))
    })

  })

  test('map', done => {

    connect<Map<string, number>>(wssend => {
      wssend.on('message', data => {
        expect([...data.entries()]).toStrictEqual([['a', 0], ['b', 1]])
        done()
      })
      wssend.send(new Map([['a', 0], ['b', 1]]))
    })

  })

  test('buffer', done => {

    connect<Buffer>(wssend => {
      wssend.on('message', data => {
        expect(data.toString()).toBe('OK')
        done()
      })
      wssend.send(Buffer.from('OK'))
    })

  })

  test('int32Array', done => {

    connect<Int32Array>(wssend => {
      wssend.on('message', data => {
        expect([...data]).toStrictEqual([0,1,2,3])
        done()
      })
      wssend.send(new Int32Array([0,1,2,3]))
    })

  })

  test('bigint', done => {

    connect<BigInt>(wssend => {
      wssend.on('message', data => {
        expect(data).toBe(BigInt('1'))
        done()
      })
      wssend.send(BigInt('1'))
    })

  })

  test('nested', done => {

    const obj = {
      a: 0,
      b: [1, {
        c: new Set<number | Map<string, Set<string>>>([2, new Map([
          ['d', new Set(['e'])]
        ])])
      }]
    } as const

    connect<typeof obj>(wssend => {
      wssend.on('message', data => {
        const a = data.a
        const b = data.b
        const c = [...b[1].c.values()] as [number, Map<string, Set<string>>]
        const d = c[1].get('d') as Set<string>
        expect(a).toBe(0)
        expect(b[0]).toBe(1)
        expect(c[0]).toBe(2)
        expect([...d.values()][0]).toBe('e')
        done()
      })
      wssend.send(obj)
    })

  })

})

describe('send:callback', () => {

  test('no callback, no option', done => {

    connect(wssend => {
      const r = wssend.send('test')
      expect(r).toBeInstanceOf(Promise)
      r.then(done)
    })

  })

  test('no callback, with option', done => {

    connect(wssend => {
      const r = wssend.send('test', {compress: false})
      expect(r).toBeInstanceOf(Promise)
      r.then(done)
    })

  })

  test('with callback, no option', done => {

    connect(wssend => {
      const r = wssend.send('test', () => {
        done()
      })
      expect(r).toBe(void(0))
    })

  })

  test('with callback, with option', done => {

    connect(wssend => {
      const r = wssend.send('test', {compress: false}, () => {
        done()
      })
      expect(r).toBe(void (0))
    })

  })

  test('error', done => {

    connect(wssend => {
      wssend.socket.once('close', () => {
        wssend.send('error', err => {
          expect(err).toBeInstanceOf(Error)
          done()
        })
      })
      wssend.socket.close()
    })

  })

})

describe('cleanup', () => {

  test('close', done => {
    const ws = new WebSocket('ws://localhost:8000')
    expect(ws.listenerCount('message')).toBe(0)
    expect(ws.listenerCount('close')).toBe(0)

    const wss = sendify(ws)
    expect(wss.listenerCount('message')).toBe(0)
    expect(ws.listenerCount('message')).toBe(1)
    expect(ws.listenerCount('close')).toBe(1)

    // @ts-ignore
    wss.handleMessage('null')
    // @ts-ignore
    wss.handleMessage('{"__t": "Undefined", "__v": "undefined"}')
    // @ts-ignore
    wss.handleMessage('{"__t": "Unknown"}')

    ws.once('open', () => {
      wss.on('message', () => {})
      expect(wss.listenerCount('message')).toBe(1)
      expect(ws.listenerCount('message')).toBe(1)
      expect(ws.listenerCount('close')).toBe(2)
      ws.close()
    })

    ws.once('close', () => {
      setTimeout(() => {
        expect(wss.listenerCount('message')).toBe(0)
        expect(ws.listenerCount('message')).toBe(0)
        expect(ws.listenerCount('close')).toBe(0)

        const cwss = sendify(ws)
        expect(cwss.listenerCount('message')).toBe(0)
        expect(ws.listenerCount('message')).toBe(0)
        expect(ws.listenerCount('close')).toBe(0)
        done()
      }, 30)
    })

  })

})
