export type GameInfo = { id:string; name:string; category:string; description:string; min:number; max:number; duration:string; status:"playable"|"soon"; color:string; cover:string };
export const games:GameInfo[]=[{ id:"mindbop-draw", name:"MindBop Draw", category:"Creative party", description:"Draw the secret word, race to guess it, and turn every round into colorful chaos.", min:2, max:8, duration:"15–30 min", status:"playable", color:"coral", cover:"/images/games/mindbop-draw.svg" }];
export const categories=["All games",...new Set(games.map(game=>game.category))];
