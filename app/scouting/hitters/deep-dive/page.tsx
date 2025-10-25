import dynamic from "next/dynamic";
const HittersDeepDiveSearch = dynamic(()=>import("@/components/deep-dive/HittersDeepDiveSearch"),{ ssr:false });
export default function Page(){ return <HittersDeepDiveSearch/>; }
