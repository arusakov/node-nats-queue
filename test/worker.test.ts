import { equal, deepEqual } from 'assert/strict'
import { describe, it, before, after, afterEach } from 'node:test'

import { connect, nanos } from '@nats-io/transport-node'
import { jetstream } from '@nats-io/jetstream'
import { NatsConnection } from '@nats-io/nats-core'
import type { JetStreamClient, JetStreamManager } from '@nats-io/jetstream'


import { Queue, Worker } from '../src'

describe('Worker', () => {
  let connection: NatsConnection
  let client: JetStreamClient
  let manager: JetStreamManager

  const NAME_1 = 'queue1'

  before(async () => {
    connection = await connect({
      servers: '127.0.0.1:4222',
    })
    client = jetstream(connection)
    manager = await client.jetstreamManager()
  })

  afterEach(async () => {
    await manager.consumers.delete(NAME_1)
    await manager.streams.delete(NAME_1)
  })

  after(async () => {
    await connection.close()
  })

  it('create', async () => {
    const worker1 = new Worker({
      client,
      name: NAME_1,
      processor: async () => {},
    })
    await worker1.setup()

    const consumers = await manager.consumers.list(NAME_1)

    for await (const c of consumers) {
      console.log(c)
    }
  })

  it('create multiple', async () => {
    const worker1 = new Worker({
      client,
      name: NAME_1,
      processor: async () => {},
    })
    await worker1.setup()

    const consumers = await manager.consumers.list(NAME_1)

    for await (const c of consumers) {
      console.log(c)
    }
  })
})