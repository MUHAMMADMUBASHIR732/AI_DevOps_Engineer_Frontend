import type { JobStreamController, JobStreamHandlers } from '../types'
import { USE_MOCK } from './api'
import { subscribeMockStream } from './mockStream'

/**
 * Subscribe to a job's live event stream. Delegates to the scripted mock in
 * mock mode; the real WebSocket client (WS /ws/jobs/{job_id}?token=…) slots in
 * here behind the same interface when the backend is ready — see API_CONTRACT §4.
 */
export function subscribeToJob(jobId: string, handlers: JobStreamHandlers): JobStreamController {
  if (USE_MOCK) {
    return subscribeMockStream(jobId, handlers)
  }

  // TODO(step 8): connect the real WebSocket here.
  handlers.onError?.(
    new Error('Live stream not connected yet — the real WebSocket client is wired when the backend is ready.'),
  )
  return { close: () => {} }
}
