import test from "node:test";
import assert from "node:assert/strict";
import { mafia } from "../server/games/mafia/module";
import { twoTruths } from "../server/games/two-truths/module";
import { skyScramble } from "../server/games/sky-scramble/module";

const ids=(count:number)=>Array.from({length:count},(_,i)=>`00000000-0000-4000-8000-${String(i).padStart(12,"0")}`);

test("Mafia assigns private roles and resolves protected night actions server-side",()=>{
 const players=ids(8);const state=mafia.create(players,1_000);
 const views=players.map(id=>mafia.project(state,id));
 assert.equal(views.filter(v=>v.team==="mafia").length,2);
 assert.ok(views.every(v=>v.team==="mafia"||v.allies.length===0));
 mafia.tick(state,players,8_001);
 const mafiaId=players.find(id=>mafia.project(state,id).team==="mafia")!;
 const townId=players.find(id=>mafia.project(state,id).role==="citizen")!;
 const doctorId=players.find(id=>mafia.project(state,id).role==="doctor")!;
 const detectiveId=players.find(id=>mafia.project(state,id).role==="detective")!;
 mafia.act(state,mafiaId,{type:"night-action",targetId:townId},9_000);
 mafia.act(state,doctorId,{type:"night-action",targetId:townId},9_000);
 mafia.act(state,detectiveId,{type:"night-action",targetId:mafiaId},9_000);
 mafia.tick(state,players,39_000);
 assert.ok(mafia.project(state,townId).aliveIds.includes(townId));
 assert.equal(mafia.project(state,detectiveId).investigation?.targetId,mafiaId);
 assert.equal(mafia.project(state,townId).investigation,undefined);
 assert.throws(()=>mafia.act(state,townId,{type:"vote",targetId:mafiaId},39_001),/closed/);
});

test("2 Truths 1 Lie hides the answer, locks votes, and scores on the server",()=>{
 const players=ids(3);const state=twoTruths.create(players,0);const active=state.activePlayerId;
 const voters=players.filter(id=>id!==active);
 twoTruths.act(state,active,{type:"submit-statements",statements:["I climbed a volcano","I speak five languages","I once met an astronaut"],lieIndex:1},100);
 assert.equal(twoTruths.project(state,voters[0]).lieIndex,undefined);
 twoTruths.tick(state,players,5_101);twoTruths.tick(state,players,40_102);
 twoTruths.act(state,voters[0],{type:"truth-vote",index:1},40_200);
 assert.throws(()=>twoTruths.act(state,voters[0],{type:"truth-vote",index:0},40_201),/locked/);
 twoTruths.act(state,voters[1],{type:"truth-vote",index:0},40_202);
 twoTruths.tick(state,players,40_203);
 const view=twoTruths.project(state,voters[0]);
 assert.equal(view.lieIndex,1);assert.equal(view.scores[voters[0]],100);assert.ok(view.scores[active]>0);
});

test("Sky Scramble validates movement and owns qualification state",()=>{
 const players=ids(2);const state=skyScramble.create(players,0);const first=players[0];
 assert.throws(()=>skyScramble.act(state,first,{type:"finish"},0));
 skyScramble.tick(state,players,4_501);
 skyScramble.input?.(state,first,0,1,4_502,false);
 for(let now=4_550;now<5_550;now+=50)skyScramble.tick(state,players,now);
 assert.ok(state.players[first].z>0&&state.players[first].z<12);
 skyScramble.input?.(state,first,0,0,5_551,true);
 skyScramble.tick(state,players,5_601);
 assert.ok(state.players[first].vy>0);
 assert.equal(state.players[first].qualified,false);
});
