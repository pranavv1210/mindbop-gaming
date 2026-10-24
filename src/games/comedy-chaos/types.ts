export type ComedySettings={rounds:3|5|7|10;answerTime:20|30|45|60;votingTime:10|15|20|30;doubleDown:boolean;authorGuessing:boolean;performanceMode:boolean;maxPlayers:20};
export type ComedyPhase="prompt"|"answering"|"performance"|"voting"|"vote-results"|"guessing"|"author-reveal"|"round-results"|"finished";
export type ComedyAnswer={id:string;text:string;votes?:number;authorId?:string;points?:number};
export type ComedyView={kind:"comedy-chaos";runId:string;phase:ComedyPhase;round:number;totalRounds:number;deadline:number;prompt:{id:string;text:string;category:string;format:string};answers:ComedyAnswer[];submittedIds:string[];voteLocked:boolean;guessLocked:boolean;doubleDownAvailable:boolean;assignedAnswer?:{id:string;text:string};scores:Record<string,number>;roundGains:Record<string,number>;winnerIds:string[];awards:{title:string;playerId:string}[];finished:boolean};
export type ComedyAction=
 |{type:"comedy-answer";text:string}
 |{type:"comedy-vote";answerId:string;doubleDown:boolean}
 |{type:"comedy-guess";answerId:string;playerId:string}
 |{type:"comedy-skip-phase"};
