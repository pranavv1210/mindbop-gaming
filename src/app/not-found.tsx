import Link from "next/link";
import { ArrowLeft, Gamepad2 } from "lucide-react";
import { Brand } from "@/components/brand";
export default function NotFound(){return <main id="main" className="not-found-page"><nav><Brand/></nav><section><div className="lost-signal" aria-hidden="true"><span>4</span><i><Gamepad2/></i><span>4</span></div><small>Signal lost</small><h1>This room doesn’t exist.</h1><p>The link may be broken, the room may have expired, or the game slipped into another dimension.</p><div><Link href="/play" className="button button-primary"><Gamepad2/>Open game hub</Link><Link href="/" className="button button-outline"><ArrowLeft/>Back home</Link></div></section></main>}
