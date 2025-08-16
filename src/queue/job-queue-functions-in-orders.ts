type JobFunction = () => Promise<any>
export class JobQueueFunctionInOrder {
  private queue: JobFunction[] = []
  private isProcessing = false

  async addJob<InputFunction extends JobFunction>(
    job: InputFunction
  ): Promise<ReturnType<InputFunction>> {
    return new Promise<ReturnType<InputFunction>>((resolve, reject) => {
      const wrappedJob = async () => {
        try {
          const response = await job()
          resolve(response)
        } catch (error) {
          reject(error)
        }
      }
      this.queue.push(wrappedJob)
      this.processQueue()
    })
  }

  async addJobNoWait<InputFunction extends JobFunction>(job: InputFunction) {
    this.queue.push(job)
    this.processQueue()
  }

  private async processQueue() {
    if (this.isProcessing) return
    const job = this.queue.shift()
    if (!job) return
    this.isProcessing = true
    try {
      await job()
    } catch (error) {
      console.error('Job failed:', error)
    } finally {
      this.isProcessing = false
      this.processQueue()
    }
  }
}
