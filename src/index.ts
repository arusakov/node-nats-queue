import { NatsConnection } from '@nats-io/nats-core'
import { jetstream, type JetStreamClient, type Consumer, type ConsumerMessages, type JetStreamManager, jetstreamManager } from '@nats-io/jetstream'

export type QueueOpts = {
  connection: NatsConnection
  name: string
}

export class Queue {
  connection: NatsConnection
  client: JetStreamClient

  constructor(opts: QueueOpts) {
    this.connection = opts.connection
    this.connection.isClosed

    this.client = jetstream(this.connection, {})
  }
}