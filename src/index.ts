import { nanos, NatsError, type MsgHdrs } from '@nats-io/nats-core'

import { type JetStreamClient, type Consumer, type JsMsg, AckPolicy } from '@nats-io/jetstream'
import { timeout } from './utils'


export type QueueOpts
 = {
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

  async add(name: string, data?: unknown, options?: AddOptions) {
    const payload = JSON.stringify(data)
    return this.client.publish(`${this.name}.${name}`, payload, options && {
      msgID: options.id, 
      headers: options.headers
    })
  }
}

export type WorkerOpts = {
  client: JetStreamClient
  name: string
  processor: (job: JsMsg) => Promise<void>
  concurrency?: number
}

export class Worker {
  protected readonly client: JetStreamClient
  protected readonly name: string
  protected readonly processor: (job: JsMsg) => Promise<void>
  protected readonly concurrency: number

  protected running = false
  protected processingNow = 0


  constructor(opts: WorkerOpts) {
    this.client = opts.client
    this.name = opts.name

    this.processor = opts.processor
    this.concurrency = opts.concurrency || 1
  }

  async setup() {
    const manager = await this.client.jetstreamManager()

    await manager.streams.add({
      name: this.name,
      subjects: [`${this.name}.*`], 
    })

    const consumer = await manager.consumers.add(this.name, {
      filter_subject: `${this.name}.*`,
      durable_name: this.name,
      ack_policy: AckPolicy.All,
    })

    console.log(consumer)
  }

  stop() {
    this.running = false
  }

  async start() {
    
    const consumer = await this.client.consumers.get(this.name, this.name)

    this.running = true
    do {
      const jobsForFetch = Math.min(this.concurrency - this.processingNow, this.concurrency)

      const jobs = await this.fetch(consumer, jobsForFetch)

      for await (const j of jobs) {
        this.process(j) // without await
      }

      await timeout(150)

    } while (this.running)
  }

  protected async process(j: JsMsg) {
    this.processingNow += 1
    try {
      this.process(j)
      await j.ackAck()
    } catch (e) {
      await j.term()
    } finally {
      this.processingNow -= 1
    }
  }

  protected async fetch(consumer: Consumer, count: number) {
    try {
      return consumer.fetch({
        max_messages: count,
      })
    } catch (e) {
      // TODO
      return []
    }
  }
}