export type GameInfo={id:string;name:string;category:string;description:string;min:number;max:number;duration:string;status:"playable"|"soon";color:string;cover:string;mode:"solo"|"multiplayer";route?:string};
export const games:GameInfo[]=[
 {id:"mindbop-draw",name:"MindBop Draw",category:"Creative party",description:"Draw the secret word, race to guess it, and turn every round into colorful chaos.",min:2,max:8,duration:"15–30 min",status:"playable",color:"coral",cover:"/images/games/mindbop-draw-v2.webp",mode:"multiplayer"},
 {id:"neon-breach",name:"Neon Breach",category:"Solo challenge",description:"Hunt unstable signals through a collapsing cyber grid. Precision builds power; one bad streak breaks the run.",min:1,max:1,duration:"3–8 min",status:"playable",color:"cyan",cover:"/images/games/neon-breach.svg",mode:"solo",route:"/play/solo/neon-breach"},
 {id:"echo-grid",name:"Echo Grid",category:"Solo challenge",description:"Memorize the machine’s increasingly brutal pulse sequence, then reproduce it before your focus fractures.",min:1,max:1,duration:"5–10 min",status:"playable",color:"violet",cover:"/images/games/echo-grid.svg",mode:"solo",route:"/play/solo/echo-grid"},
];
export const categories=["All games",...new Set(games.map(game=>game.category))];
