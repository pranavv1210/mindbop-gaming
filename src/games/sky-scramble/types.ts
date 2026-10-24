export type SkyPhase="countdown"|"racing"|"round-results"|"finished";
export type SkyPlayer={id:string;x:number;y:number;z:number;rotation:number;checkpoint:number;qualified:boolean;eliminated:boolean;emote?:string};
export type SkyView={kind:"sky-scramble";runId:string;phase:SkyPhase;round:number;totalRounds:number;deadline:number;playerIds:string[];activeIds:string[];players:Record<string,SkyPlayer>;qualifiedIds:string[];qualifyTarget:number;winnerIds:string[];finished:boolean};
export type SkyAction={type:"sky-emote";emoji:"👋"|"😂"|"🎉"|"😎"|"😱"};
