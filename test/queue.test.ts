import { equal, deepEqual } from 'assert/strict'
import { describe, it, before, after, afterEach } from 'node:test'

import { nanos, NatsConnection } from '@nats-io/nats-core'
import { connect } from '@nats-io/transport-node'

import { DEFAULT_DEDUPLICATE_WINDOW, Queue } from '../src'
import { jetstream, type JetStreamClient, type JetStreamManager } from '@nats-io/jetstream'

describe('Queue', () => {
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
    await manager.streams.delete(NAME_1)
  })

  after(async () => {
    await connection.close()
  })

  it('create', async () => {
    const queue1 = new Queue({
      client,
      name: NAME_1,
    })

    await queue1.setup()

    const stream = await client.streams.get(NAME_1)

    const { config: { name, subjects, duplicate_window } } = await stream.info()

    equal(name, NAME_1)
    deepEqual(subjects, [`${name}.*`])
    equal(duplicate_window, nanos(DEFAULT_DEDUPLICATE_WINDOW))
  })

  it('update', async () => {
    const queue1 = new Queue({
      client,
      name: NAME_1,
    })
    await queue1.setup()

    const deduplicateWindow = 3_000
    const queue2 = new Queue({
      client,
      name: NAME_1,
      deduplicateWindow,
    })
    await queue2.setup()

    const stream = await client.streams.get(NAME_1)

    const { config: { name, subjects, duplicate_window } } = await stream.info()

    equal(name, NAME_1)
    deepEqual(subjects, [`${name}.*`])
    equal(duplicate_window, nanos(deduplicateWindow))
  })
})