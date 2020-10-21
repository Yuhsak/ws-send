# ws-send

Send any types of data through WebSocket by ws.

## Install

`npm install ws-send`

## Usage

### Server

```ts
import http from 'http'

import WS from 'ws'

import {sendify} from 'ws-send'

const httpServer = http.createServer()

const wsServer = new WS.Server({server: httpServer})

wsServer.on('connection', ws => {

  const wss = sendify(ws)

  wss.on('message', data => {
    console.log('data from client,' data)
  })

  wss.send({
    message: 'from server',
    payload: {
      array: [0, 1, 2],
      map: new Map([['a', 0], ['b', 1]]),
      bigint: BigInt(2),
      int32array: new Int32Array([0, 1])
    }
  })

  ws.on('close', () => {
    // wss will be cleaned up automatically when its corresponding socket closes
  })

})

httpServer.listen(8000)
```

### Client

```ts
import WS from 'ws'

const ws = new WS('ws://localhost:8000')

ws.on('open', () => {

  const wss = sendify(ws)

  wss.on('message', data => {
    console.log('data from server,' data)
  })

  wss.send({
    message: 'from client',
    payload: {
      object: {
        boolean: true
      },
      date: new Date(),
      regexp: new RegExp('.*')
    }
  })

})
```

### Available data types

The types below are currently supported.

- `string`
- `number`
- `boolean`
- `null`
- `undefined`
- `symbol`
- `bigint`
- `NaN`
- `Infinity`
- `RegExp`
- `Date`
- `Array`
- `Object`
- `Set`
- `Map`
- `URL`
- `URLSearchParams`
- `Buffer`
- `DataView`
- `ArrayBuffer`
- `SharedArrayBuffer`
- `Int8Array`
- `Uint8Array`
- `Uint8ClampedArray`
- `Int16Array`
- `Uint16Array`
- `Int32Array`
- `Uint32Array`
- `Float32Array`
- `Float64Array`
- `BigInt64Array`
- `BigUint64Array`

### Typings

For TypeScript, `sendify()` accepts type arguments for sending & receiving data.

```ts
// sendify<SendingDataType, ReceivingDataType>
const wss = sendify<string, number>(ws)

// send() only accepts string
wss.send('test')

wss.on('message', data => {
  // data will be typed as number
  console.log(data)
})
```
