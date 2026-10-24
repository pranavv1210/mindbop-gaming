export type TwoTruthsPhase="submission"|"reveal"|"discussion"|"voting"|"results"|"finished";
export type TwoTruthsMessage={id:string;playerId:string;text:string;at:number};
export type TwoTruthsReaction={id:string;playerId:string;emoji:string;at:number};
export type TwoTruthsView={kind:"two-truths";runId:string;phase:TwoTruthsPhase;round:number;turn:number;deadline:number;playerIds:string[];activePlayerId:string;statements:string[];ownDraft?:string[];ownLieIndex?:number;voteLocked:boolean;votes?:number[];lieIndex?:number;scores:Record<string,number>;gains:Record<string,number>;messages:TwoTruthsMessage[];reactions:TwoTruthsReaction[];winnerIds:string[];finished:boolean};
export type TwoTruthsAction=
 |{type:"submit-statements";statements:[string,string,string];lieIndex:number}
 |{type:"truth-vote";index:number}
 |{type:"reaction";emoji:string}
 |{type:"party-chat";text:string};
