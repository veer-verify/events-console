// taskQueue.js (NOT a hook)
let queue = [];
let isRunning = false;

export function enqueueTask(taskFn) {
  queue.push(taskFn);
  runQueue();
}

async function runQueue() {
  if (isRunning) return;          // Already running → don't start again
  isRunning = true;

  while (queue.length > 0) {
    const task = queue.shift();   // FIFO → old tasks always run first

    try {
      await task();               // Fully execute the async function
    } catch (err) {
      console.error("Task failed:", err);
    }
  }

  isRunning = false;              // Queue empty → unlock
}
