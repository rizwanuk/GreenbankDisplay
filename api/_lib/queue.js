// api/_lib/queue.js
// Naive in-memory queue of { due:number, job:object } and day stamps
const q = [];
const dayStamp = new Set();

async function wasQueuedToday(dayKey) {
  return dayStamp.has(dayKey);
}

async function enqueueDay(entries, dayKey) {
  let count = 0;
  for (const e of entries) {
    if (Number.isFinite(+e.startAt)) {
      q.push({ due: +e.startAt, job: { ...e, type: "start" } });
      count++;
    }
    if (Number.isFinite(+e.jamaahAt)) {
      q.push({ due: +e.jamaahAt, job: { ...e, type: "jamaah" } });
      count++;
    }
  }
  dayStamp.add(dayKey);
  q.sort((a, b) => a.due - b.due);
  return count;
}

async function dequeueDue(cutoffMs) {
  const out = [];
  while (q.length && q[0].due <= cutoffMs) {
    out.push(q.shift().job);
  }
  return out;
}

async function requeueAt(job, atMs) {
  q.push({ due: +atMs, job: { ...job } });
  q.sort((a, b) => a.due - b.due);
}

module.exports = { wasQueuedToday, enqueueDay, dequeueDue, requeueAt };
