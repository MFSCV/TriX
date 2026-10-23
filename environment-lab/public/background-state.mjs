// Queue delivery can fail after a valid runtime result, for example during artifact storage.
export function backgroundState(task){
 const queue=task?.backgroundQueue,failed=['FAILED','BLOCKED'].includes(queue?.status);
 return {failed,pending:task?.background===true&&(queue?['QUEUED','RUNNING'].includes(queue.status):task.status==='RUNNING'),label:queue?.status==='FAILED'?'Background delivery failed':queue?.status==='BLOCKED'?'Background needs review':null,message:failed?(queue.reason||'Background processing needs operator review. Inspect task evidence before retrying.'):null};
}
