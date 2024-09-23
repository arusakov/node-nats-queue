import { describe, it, before } from 'node:test'

import { NatsConnection } from '@nats-io/nats-core'
import { connect} from '@nats-io/transport-node'

describe('Queue', () => {
  let conn: NatsConnection

  before(async () => {
    conn = await connect({
      servers: '127.0.0.1:4222',
    })
  })

  it('creating', () => {

  })
})