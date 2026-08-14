import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
const json=(b:any,s=200)=>new Response(JSON.stringify(b),{status:s,headers:cors});

Deno.serve(async(req)=>{
 if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
 if(req.method!=="POST") return json({message:"Method not allowed"},405);
 const url=Deno.env.get("SUPABASE_URL")||"";
 const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 if(!url||!service) return json({code:"AUTH_NOT_CONFIGURED",message:"Recovery service is not configured."},500);
 let body:any; try{body=await req.json()}catch{return json({message:"Invalid JSON."},400)}
 const action=String(body?.action||"");
 const email=String(body?.email||"").trim().toLowerCase();
 const phone=String(body?.phone||"").replace(/\D/g,"");
 const admin=createClient(url,service,{auth:{autoRefreshToken:false,persistSession:false}});
 if(!email||phone.length<10) return json({message:"Registered email and 10-digit mobile number are required."},400);

 const {data:rows,error}=await admin.from("members").select("id,auth_user_id,iois_user_id,email,mobile,status").ilike("email",email);
 if(error) return json({message:"Member lookup failed."},500);
 const member=(rows||[]).find((x:any)=>String(x.mobile||"").replace(/\D/g,"").slice(-10)===phone.slice(-10));
 if(!member) return json({code:"DETAILS_NOT_MATCHED",message:"Registered Email और WhatsApp/Mobile Number match नहीं हुआ।"},404);
 if(["blocked","suspended","rejected","inactive"].includes(String(member.status||"").toLowerCase())) return json({message:"This member account is not active."},403);

 if(action==="find_user_id") return json({member_id:member.iois_user_id});
 if(action==="reset_password"){
   const mid=String(body?.member_id||"").trim().toUpperCase(), np=String(body?.new_password||"");
   if(mid!==String(member.iois_user_id||"").toUpperCase()) return json({message:"Member ID match नहीं हुआ।"},404);
   if(np.length<8) return json({message:"Password must contain at least 8 characters."},400);
   const {error:uerr}=await admin.auth.admin.updateUserById(member.auth_user_id,{password:np});
   if(uerr) return json({message:"Password update नहीं हो पाया।"},500);
   return json({success:true});
 }
 return json({message:"Unknown recovery action."},400);
});
