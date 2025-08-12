import { sleep } from '../utils/utils'

interface Job {
  id: string
  data?: any
}

export class JobQueueInOrder<CurrentJob extends Job = Job> {
  queue: CurrentJob[]
  isProcessing: boolean
  uniqueJobId: boolean
  lastProcessedId?: string
  lastAddedId?: string
  processJob: (job: CurrentJob) => Promise<void>
  processedJobs: Set<string>
  processedJobsTimestamps: Map<string, number>
  jobRetentionDuration?: number
  isWaitingToClean: boolean
  //
  numberOfConcurrentJobs: number
  currentConcurrentJobs = 0
  constructor(
    uniqueJobId = false,
    processJob: (job: CurrentJob) => Promise<void>,
    numberOfConcurrentJobs = 1,
    jobRetentionDuration?: number
  ) {
    this.uniqueJobId = uniqueJobId
    this.queue = []
    this.isProcessing = false
    this.processJob = processJob
    this.processedJobs = new Set()
    this.processedJobsTimestamps = new Map()
    // jobRetentionDuration is the duration in milliseconds after which a job is removed from the finished jobs queue
    // if not set, the jobs will net be kept and will be removed from the queue after the job is processed
    this.jobRetentionDuration = jobRetentionDuration
    this.isWaitingToClean = false
    //
    this.numberOfConcurrentJobs = numberOfConcurrentJobs
  }

  public addJob(job: CurrentJob): void {
    this.cleanupExpiredJobs()

    // Check if job ID already exists in the queue or processed jobs
    const jobExists = this.uniqueJobId
      ? this.queue.some((existingJob) => existingJob.id === job.id) ||
        this.processedJobs.has(job.id)
      : false

    if (!jobExists) {
      this.queue.push(job)
      this.lastAddedId = job.id
      this.processQueue()
    } else {
      console.log(
        `Job with ID ${job.id} already exists in the queue or has been processed recently and will not be added again.`
      )
    }
  }

  async processQueue(): Promise<void> {
    while (this.currentConcurrentJobs < this.numberOfConcurrentJobs && this.queue.length > 0) {
      const job = this.queue.shift()
      if (job) {
        this.currentConcurrentJobs++
        this.trackProcessedJob(job.id)
        this.processJob(job)
          .catch((e) => console.log(`Error happened: ${e.message}`))
          .finally(() => {
            this.currentConcurrentJobs--
            this.processQueue() // Process the next job in the queue
          })
        this.lastProcessedId = job.id
      }
    }
  }

  private trackProcessedJob(jobId: string): void {
    if (this.jobRetentionDuration) {
      const currentTime = Date.now()
      this.processedJobs.add(jobId)
      this.processedJobsTimestamps.set(jobId, currentTime)
      this.waitToCleanJobs()
    }
  }

  private cleanupExpiredJobs(): void {
    if (this.jobRetentionDuration) {
      const currentTime = Date.now()
      for (const [jobId, timestamp] of this.processedJobsTimestamps.entries()) {
        if (currentTime - timestamp > this.jobRetentionDuration) {
          this.processedJobs.delete(jobId)
          this.processedJobsTimestamps.delete(jobId)
        }
      }
    }
  }

  private async waitToCleanJobs() {
    if (!this.jobRetentionDuration) return
    if (this.isWaitingToClean) return
    this.isWaitingToClean = true
    await sleep(this.jobRetentionDuration)
    this.cleanupExpiredJobs()
    this.isWaitingToClean = false
    if (this.processedJobs.size !== 0) {
      this.waitToCleanJobs()
    }
  }
}
