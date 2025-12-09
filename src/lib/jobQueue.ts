// Background Job Queue System with Retry Logic and Circuit Breaker

export type JobStatus = "pending" | "running" | "success" | "failed" | "dead-letter";
export type JobType = "upload" | "crawl" | "sync" | "index";

export interface Job {
  id: string;
  type: JobType;
  source: string;
  status: JobStatus;
  retries: number;
  maxRetries: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  error?: string;
  metadata: Record<string, any>;
}

export interface CircuitBreakerState {
  source: string;
  failures: number;
  lastFailure?: Date;
  isOpen: boolean;
}

class JobQueue {
  private jobs: Map<string, Job> = new Map();
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private readonly CIRCUIT_THRESHOLD = 5; // Open circuit after 5 failures
  private readonly CIRCUIT_TIMEOUT = 60000; // 1 minute cooldown

  createJob(type: JobType, source: string, metadata: Record<string, any> = {}): Job {
    const job: Job = {
      id: `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      source,
      status: "pending",
      retries: 0,
      maxRetries: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata,
    };

    this.jobs.set(job.id, job);
    return job;
  }

  async executeJob(jobId: string, executor: () => Promise<void>): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    // Check circuit breaker
    const breaker = this.circuitBreakers.get(job.source);
    if (breaker?.isOpen) {
      const timeSinceLastFailure = Date.now() - (breaker.lastFailure?.getTime() || 0);
      if (timeSinceLastFailure < this.CIRCUIT_TIMEOUT) {
        job.status = "failed";
        job.error = "Circuit breaker open - source temporarily disabled";
        this.updateJob(job);
        return;
      } else {
        // Half-open state - allow one retry
        breaker.isOpen = false;
      }
    }

    job.status = "running";
    job.updatedAt = new Date();
    this.updateJob(job);

    try {
      await executor();
      
      // Success
      job.status = "success";
      job.completedAt = new Date();
      job.updatedAt = new Date();
      this.updateJob(job);
      
      // Reset circuit breaker
      this.resetCircuitBreaker(job.source);
      
    } catch (error) {
      await this.handleJobFailure(job, error);
    }
  }

  private async handleJobFailure(job: Job, error: any): Promise<void> {
    job.retries++;
    job.error = error instanceof Error ? error.message : String(error);
    job.updatedAt = new Date();

    // Record failure in circuit breaker
    this.recordFailure(job.source);

    if (job.retries < job.maxRetries) {
      // Exponential backoff
      const backoffMs = Math.min(1000 * Math.pow(2, job.retries), 30000);
      job.status = "pending";
      
      setTimeout(() => {
        // Retry would be triggered by scheduler
        console.log(`Retrying job ${job.id} after ${backoffMs}ms`);
      }, backoffMs);
      
    } else {
      // Move to dead-letter queue
      job.status = "dead-letter";
      job.completedAt = new Date();
    }

    this.updateJob(job);
  }

  private recordFailure(source: string): void {
    let breaker = this.circuitBreakers.get(source);
    
    if (!breaker) {
      breaker = {
        source,
        failures: 0,
        isOpen: false,
      };
      this.circuitBreakers.set(source, breaker);
    }

    breaker.failures++;
    breaker.lastFailure = new Date();

    if (breaker.failures >= this.CIRCUIT_THRESHOLD) {
      breaker.isOpen = true;
      console.warn(`Circuit breaker opened for source: ${source}`);
    }
  }

  private resetCircuitBreaker(source: string): void {
    const breaker = this.circuitBreakers.get(source);
    if (breaker) {
      breaker.failures = 0;
      breaker.isOpen = false;
    }
  }

  private updateJob(job: Job): void {
    this.jobs.set(job.id, { ...job });
  }

  getJob(jobId: string): Job | undefined {
    return this.jobs.get(jobId);
  }

  getAllJobs(): Job[] {
    return Array.from(this.jobs.values());
  }

  getJobsByStatus(status: JobStatus): Job[] {
    return Array.from(this.jobs.values()).filter(j => j.status === status);
  }

  getDeadLetterJobs(): Job[] {
    return this.getJobsByStatus("dead-letter");
  }

  async retryAllDeadLetterJobs(): Promise<void> {
    const deadJobs = this.getDeadLetterJobs();
    
    for (const job of deadJobs) {
      job.status = "pending";
      job.retries = 0;
      job.error = undefined;
      job.updatedAt = new Date();
      this.updateJob(job);
    }
  }

  getCircuitBreakerStatus(source: string): CircuitBreakerState | undefined {
    return this.circuitBreakers.get(source);
  }

  getAllCircuitBreakers(): CircuitBreakerState[] {
    return Array.from(this.circuitBreakers.values());
  }
}

// Singleton instance
export const jobQueue = new JobQueue();
