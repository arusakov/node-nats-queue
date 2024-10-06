import { nanos, NatsConnection, NatsError, type MsgHdrs } from '@nats-io/nats-core'

import type { JetStreamClient } from '@nats-io/jetstream'
import { jetstreamManager } from '@nats-io/jetstream'


export type QueueOpts = {
  client: JetStreamClient
  name: string

  /**
   * ms
   */
  deduplicateWindow?: number
}

export type Job = {
  id?: number | string
  name: string
  data: unknown
}

export type AddOptions = {
  id?: string
  headers?: MsgHdrs
}

export const DEFAULT_DEDUPLICATE_WINDOW = 2_000

export class Queue {
  protected readonly client: JetStreamClient
  protected readonly name: string

  protected readonly deduplicateWindow: number

  constructor(opts: QueueOpts) {
    this.client = opts.client
    this.name = opts.name

    this.deduplicateWindow = opts.deduplicateWindow || DEFAULT_DEDUPLICATE_WINDOW
  }

  async setup() {
    const manager = await this.client.jetstreamManager()
    
    try {
      await manager.streams.add({
        name: this.name,
        subjects: [`${this.name}.*`],
        duplicate_window: nanos(this.deduplicateWindow)
      })
    } catch (e) {
      // TODO smart error handling
      if (!(e instanceof NatsError)) {
        throw e
      }
      await manager.streams.update(
        this.name,
        {
          subjects: [`${this.name}.*`],
          duplicate_window: nanos(this.deduplicateWindow)
        }
      )
    }
    
  }

  async add(name: string, data: unknown, options?: AddOptions) {
    const payload = JSON.stringify(data)
    return this.client.publish(`${this.name}.${name}`, payload, options && {
      msgID: options.id, 
      headers: options.headers
    })
  }
}