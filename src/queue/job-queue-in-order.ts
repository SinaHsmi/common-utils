import { generateRandomInt, sleep } from '../utils/utils'

type Job = {
  id?: string
  [key: string]: any
}

// this class is used to process jobs in order
// job can be unique or not, if uniqueJobId is true, the job will be processed only once
// we can set the number of concurrent jobs
// we can set the jobRetentionDuration
// the processJob is a function that will be called to process the job
export class JobQueueInOrder<CurrentJob extends Job = Job, JobResponse = void> {
  processJob: (job: CurrentJob) => Promise<JobResponse>
  queue: {
    job: () => Promise<JobResponse>
    id: string
  }[] = []
  uniqueJobId: boolean
  lastProcessedId?: string
  lastAddedId?: string
  private processedJobs: Set<string> = new Set()
  // configuration
  // if jobRetentionDuration is set, the jobId will be removed after the jobRetentionDuration
  // if jobRetentionDuration is not set, the jobId will not be removed
  // this useful for job that only need to process once, and we want to keep the jobId for a duration
  jobRetentionDuration?: number
  private processedJobsTimestamps: {
    jobId: string
    timestamp: number
  }[] = []
  private cleanupTimer?: NodeJS.Timeout
  //
  numberOfConcurrentJobs: number
  currentConcurrentJobs = 0
  rateLimitInterval = 0
  maximumQueueLength: number | undefined

  constructor(
    uniqueJobId = false,
    processJob: (job: CurrentJob) => Promise<JobResponse>,
    options?: {
      // if numberOfConcurrentJobs is set, the job will be processed with the number of concurrent jobs
      numberOfConcurrentJobs?: number
      // if rateLimitPerSecond is set, the job will be processed with the rate limit
      rateLimitPerSecond?: number
      // if jobRetentionDuration is set, the jobId will be kept for the duration
      jobRetentionMs?: number
      // if maximumQueueLength is set, the job will be processed with the maximum queue length
      maximumQueueLength?: number
    }
  ) {
    const {
      numberOfConcurrentJobs = 1,
      rateLimitPerSecond,
      jobRetentionMs,
      maximumQueueLength,
    } = options || {}

    // Validate configuration values
    if (numberOfConcurrentJobs < 1) {
      throw new Error('numberOfConcurrentJobs must be at least 1')
    }
    if (rateLimitPerSecond !== undefined && rateLimitPerSecond <= 0) {
      throw new Error('rateLimitPerSecond must be positive')
    }
    if (jobRetentionMs !== undefined && jobRetentionMs <= 500) {
      throw new Error('jobRetentionMs must be at least 500ms')
    }
    if (maximumQueueLength !== undefined && maximumQueueLength < 1) {
      throw new Error('maximumQueueLength must be at least 1')
    }

    // set the uniqueJobId
    this.uniqueJobId = uniqueJobId
    // set the processJob
    this.processJob = processJob
    // set the jobRetentionDuration
    this.jobRetentionDuration = jobRetentionMs
    this.clearCleanupTimer()
    this.maximumQueueLength = maximumQueueLength
    // set the numberOfConcurrentJobs
    this.numberOfConcurrentJobs = numberOfConcurrentJobs
    // set the intervalMs
    if (rateLimitPerSecond) {
      this.rateLimitInterval = +(1000 / rateLimitPerSecond).toFixed(0)
    }
  }

  clearCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer)
      this.cleanupTimer = undefined
    }
  }

  private checkIfJobExists(job: CurrentJob): string {
    const jobId = job.id || generateRandomInt(1000000, 9999999).toString()
    const jobExists =
      this.uniqueJobId && job.id
        ? this.queue.some((existingJob) => existingJob.id === jobId) ||
          this.processedJobs.has(jobId)
        : false

    if (this.maximumQueueLength && this.queue.length >= this.maximumQueueLength) {
      throw new Error(`The queue is full, length: ${this.queue.length}.`)
    }

    if (jobExists) {
      throw new Error(
        `Job with ID ${job.id} already exists in the queue and will not be added again.`
      )
    }
    return jobId
  }

  public addJob(job: CurrentJob): string {
    this.cleanupExpiredJobs()
    const jobId = this.checkIfJobExists(job)

    this.queue.push({
      job: () => this.processJob(job),
      id: jobId,
    })
    this.lastAddedId = jobId
    this.processQueue()

    return jobId
  }

  async addJobWaitForResponse(job: CurrentJob): Promise<JobResponse> {
    this.cleanupExpiredJobs()
    const jobId = this.checkIfJobExists(job)
    return new Promise<JobResponse>((resolve, reject) => {
      const wrappedJob = async () => {
        try {
          const response = await this.processJob(job)
          resolve(response)
          return response
        } catch (error) {
          reject(error)
          throw error
        }
      }
      this.queue.push({
        job: wrappedJob,
        id: jobId,
      })
      this.processQueue()
    })
  }

  // -- internal functions -- processQueue
  async processQueue(): Promise<void> {
    while (this.currentConcurrentJobs < this.numberOfConcurrentJobs && this.queue.length > 0) {
      const job = this.queue.shift()
      if (job) {
        this.currentConcurrentJobs += 1
        this.trackProcessedJob(job.id)
        // apply rate limit
        if (this.rateLimitInterval) {
          await sleep(this.rateLimitInterval)
        }
        job
          .job()
          .catch((e) => console.error(`Error happened: ${e.message}`))
          .finally(() => {
            this.currentConcurrentJobs -= 1
            this.processQueue() // Process the next job in the queue
          })
        this.lastProcessedId = job.id
      }
    }
  }

  // -- internal functions -- used for job retention --
  private trackProcessedJob(jobId: string): void {
    if (this.jobRetentionDuration) {
      this.processedJobs.add(jobId)
      this.processedJobsTimestamps.push({ jobId, timestamp: Date.now() })
      this.scheduleCleanup()
    }
  }

  private cleanupExpiredJobs(): void {
    if (this.jobRetentionDuration) {
      const currentTime = Date.now()
      for (const { jobId, timestamp } of this.processedJobsTimestamps) {
        if (currentTime - timestamp > this.jobRetentionDuration) {
          this.processedJobs.delete(jobId)
          this.processedJobsTimestamps = this.processedJobsTimestamps.filter(
            (job) => job.jobId !== jobId
          )
        }
        break
      }
    }
  }

  private scheduleCleanup(): void {
    if (!this.jobRetentionDuration || this.cleanupTimer) {
      return
    }
    this.cleanupTimer = setTimeout(() => {
      this.cleanupExpiredJobs()
      this.clearCleanupTimer()
      if (this.processedJobs.size > 0) {
        this.scheduleCleanup()
      }
    }, this.jobRetentionDuration)
  }

  // -- public utility methods --

  // Get current queue statistics
  getQueueStats() {
    return {
      queueLength: this.queue.length,
      currentConcurrentJobs: this.currentConcurrentJobs,
      maxConcurrentJobs: this.numberOfConcurrentJobs,
      processedJobsCount: this.processedJobs.size,
      isProcessing: this.currentConcurrentJobs > 0,
      lastProcessedId: this.lastProcessedId,
      lastAddedId: this.lastAddedId,
    }
  }

  // Check if queue is full (if maximumQueueLength is set)
  isFull(): boolean {
    return this.maximumQueueLength ? this.queue.length >= this.maximumQueueLength : false
  }

  // Clear all pending jobs in the queue`
  clearQueue(): void {
    this.queue = []
  }

  destroy(): void {
    this.clearCleanupTimer()
    this.clearQueue()
    this.processedJobs.clear()
    this.processedJobsTimestamps = []
    this.currentConcurrentJobs = 0
  }
}
