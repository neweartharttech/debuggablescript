
export async function waitWithHeartBeat(procName:string){
  for(let beat =1; true; beat++){
    await new Promise(r=>setTimeout(r,1000*(Number.parseInt( process.env.HEART_BEAT_DURATION || '10' ))));
    console.log(`${procName}: heartbeat is On beat `, beat);
  }
}

export async function taskStarter(taskMethods: Record<string,()=>Promise<void>>){

  const [_arg1,_arg2,...tasks] = process.argv;

  if(tasks.length === 0){
    console.error("no Tasks found");
  }else{

    console.log("taskStarter started for ", tasks.join(", "));

    await Promise.all(tasks.map(t => (async ()=>{
      if(!taskMethods[t]){
          throw new Error(`task ${t} not listed`);
      }

      console.log(`starting task ${t}`);

      await taskMethods[t]();

    })()));
  }

}