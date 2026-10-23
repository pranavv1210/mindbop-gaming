/** @type {import('next').NextConfig} */
const isDev=process.env.NODE_ENV!=="production";
const csp=["default-src 'self'",`script-src 'self' 'unsafe-inline'${isDev?" 'unsafe-eval'":""}`,"style-src 'self' 'unsafe-inline'","img-src 'self' data: blob:","font-src 'self' data:","connect-src 'self' ws: wss:","media-src 'self' blob:","object-src 'none'","base-uri 'self'","form-action 'self'","frame-ancestors 'none'","worker-src 'self' blob:","manifest-src 'self'"].join("; ");
const securityHeaders=[
 {key:"Content-Security-Policy",value:csp},{key:"Referrer-Policy",value:"strict-origin-when-cross-origin"},
 {key:"X-Content-Type-Options",value:"nosniff"},{key:"X-Frame-Options",value:"DENY"},
 {key:"Permissions-Policy",value:"camera=(), microphone=(), geolocation=(), payment=(), usb=()"},
 {key:"Cross-Origin-Opener-Policy",value:"same-origin"},{key:"X-DNS-Prefetch-Control",value:"off"},
 {key:"Strict-Transport-Security",value:"max-age=63072000; includeSubDomains; preload"},
];
const config={poweredByHeader:false,devIndicators:false,async headers(){return[{source:"/:path*",headers:securityHeaders}]}};
export default config;
