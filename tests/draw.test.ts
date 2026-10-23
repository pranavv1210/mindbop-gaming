import test from "node:test";
import assert from "node:assert/strict";
import { mindbopDraw, addDrawPoint } from "../server/games/draw/module";

test("draw keeps choices private, validates the artist, scores guesses and syncs strokes",()=>{
  let now=1_000;
  const state=mindbopDraw.create(["artist","guesser"],now,{rounds:1,drawTime:60,chooseTime:15,maxPlayers:8});
  assert.equal(mindbopDraw.project(state,"guesser").choices,undefined);
  assert.equal(mindbopDraw.project(state,"artist").choices?.length,3);
  assert.throws(()=>mindbopDraw.act(state,"guesser",{type:"choose-word",index:0},now));
  mindbopDraw.act(state,"artist",{type:"choose-word",index:0},now);
  const word=mindbopDraw.project(state,"artist").word;
  assert.equal(mindbopDraw.project(state,"guesser").word,"");
  addDrawPoint(state,"guesser",{id:"a",x:.1,y:.1,color:"#000000",size:8,erase:false,start:true});
  assert.equal(state.strokes.length,0);
  addDrawPoint(state,"artist",{id:"a",x:.1,y:.1,color:"#000000",size:8,erase:false,start:true});
  assert.equal(state.strokes.length,1);
  now+=5_000;
  mindbopDraw.act(state,"guesser",{type:"guess",text:word.toUpperCase()},now);
  assert.ok(state.scores.guesser>=100);
  assert.equal(state.phase,"round-end");
});

test("draw auto-selects and rotates through every player",()=>{
  let now=10_000;
  const state=mindbopDraw.create(["a","b"],now,{rounds:1,drawTime:30,chooseTime:10,maxPlayers:8});
  now+=10_001;mindbopDraw.tick(state,["a","b"],now);assert.equal(state.phase,"drawing");assert.ok(state.secret);
  now+=30_001;mindbopDraw.tick(state,["a","b"],now);assert.equal(state.phase,"round-end");
  now+=4_501;mindbopDraw.tick(state,["a","b"],now);assert.equal(state.drawerId,"b");
  mindbopDraw.act(state,"b",{type:"choose-word",index:0},now);
  now+=30_001;mindbopDraw.tick(state,["a","b"],now);now+=4_501;mindbopDraw.tick(state,["a","b"],now);
  assert.equal(state.finished,true);
});
