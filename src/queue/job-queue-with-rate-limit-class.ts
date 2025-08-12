/* eslint-disable import/prefer-default-export */
import { Logger } from '../logger'
import { sleep } from '../utils/utils'

interface Job {
  id: string
  data?: any
}

export class JobQueueWithRateLimit {
  queue: Job[]
  isProcessing: boolean
  uniqueJobId: boolean
  intervalMs: number
  maximumQueueLength: number | undefined
  private logger = new Logger('INTERNAL', undefined, [], undefined, 'console', 'info')

  constructor(
    rateLimitPerSecond = 1,
    uniqueJobId = false,
    maximumQueueLength: number | undefined = undefined
  ) {
    this.maximumQueueLength = maximumQueueLength
    this.uniqueJobId = uniqueJobId
    this.intervalMs = +(1000 / rateLimitPerSecond).toFixed(0)
    this.queue = []
    this.isProcessing = false
  }

  public addJob(job: Job): void {
    // Check if job ID already exists in the queue
    const jobExists = this.uniqueJobId
      ? this.queue.some((existingJob) => existingJob.id === job.id)
      : false

    if (this.maximumQueueLength && this.queue.length >= this.maximumQueueLength) {
      throw new Error(`The queue is full, length: ${this.queue.length}.`)
    }

    if (jobExists) {
      throw new Error(
        `Job with ID ${job.id} already exists in the queue and will not be added again.`
      )
    }

    this.logger.debug(`new job added to queue: ${this.queue.length}.`)
    this.queue.push(job)
    this.processQueue()
  }

  async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return
    }
    this.isProcessing = true
    while (this.queue.length > 0) {
      const job = this.queue.shift()
      if (job) {
        await sleep(this.intervalMs)
        this.processJob(job)
      }
    }
    this.isProcessing = false
  }

  async processJob(job: Job): Promise<void> {
    console.log(`Processing job: ${job.id}`)
    console.log(`Processing job: ${job.data}`)
  }
}
