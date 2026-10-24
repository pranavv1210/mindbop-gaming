export type MafiaRole="citizen"|"mafia"|"boss"|"detective"|"doctor"|"vigilante";
export type MafiaPhase="role-reveal"|"night"|"day-reveal"|"discussion"|"voting"|"elimination"|"finished";
export type MafiaMessage={id:string;playerId?:string;text:string;channel:"public"|"mafia"|"system";at:number};
export type MafiaEvent={id:string;text:string;at:number};
export type MafiaView={kind:"mafia";runId:string;phase:MafiaPhase;round:number;deadline:number;playerIds:string[];aliveIds:string[];role:MafiaRole;team:"town"|"mafia";allies:string[];investigation?:{targetId:string;mafia:boolean};actionSubmitted:boolean;votesLocked:boolean;messages:MafiaMessage[];events:MafiaEvent[];eliminatedId?:string;eliminatedRole?:MafiaRole;winner?:"town"|"mafia";winnerIds:string[];finished:boolean};
export type MafiaAction=
 |{type:"night-action";targetId:string}
 |{type:"vote";targetId:string|"skip"}
 |{type:"chat";text:string};
