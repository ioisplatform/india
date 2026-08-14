/* IOIS PAYMENT — authenticated member payment submission */
(function(){
"use strict";
const client=window.supabaseClient;
const $=id=>document.getElementById(id);
let currentUser=null;
let profile=null;

async function init(){
  if(!client){$('message').textContent='Supabase connection unavailable.';return;}
  const {data:{user},error}=await client.auth.getUser();
  if(error||!user){location.href='login.html?redirect=payment.html';return;}
  currentUser=user; window.__ioisCurrentAuthUser=user;
  profile=await window.IOISProfile?.load(user.id,client);
  if(!profile){$('message').textContent='Member profile अभी उपलब्ध नहीं है।';return;}
  $('amount').value=profile.amount!=null?`₹${Number(profile.amount).toLocaleString('en-IN')}`:(profile.membership_plan||'—');
  const upi=document.getElementById('ioisUpi');
  if(upi) upi.textContent=window.IOIS_CONFIG?.paymentUPI||'8877490845@spicepay';
}

$('paymentForm').addEventListener('submit',async e=>{
  e.preventDefault();
  if(!currentUser||!profile){return;}
  const button=e.submitter||e.target.querySelector('button[type="submit"]');
  if(button) button.disabled=true;
  try{
    const {data:member,error:memberError}=await client.from('members').select('id,plan_amount').eq('auth_user_id',currentUser.id).maybeSingle();
    if(memberError) console.warn('Member lookup for payment:',memberError.message);
    if(!member?.id) throw new Error('Payment member record अभी उपलब्ध नहीं है।');
    const result=await client.from('payments').insert({
      member_id:member.id,
      amount:member.plan_amount ?? profile.amount ?? null,
      payment_method:$('method').value,
      payment_status:'pending',
      submitted_at:new Date().toISOString()
    });
    if(result.error) throw result.error;
    $('message').textContent='Payment submitted successfully. Admin verification pending.';
    $('paymentForm').reset();
    $('amount').value=profile.amount?`₹${Number(profile.amount).toLocaleString('en-IN')}`:'';
  }catch(err){
    console.error(err);
    $('message').textContent=err.message||'Payment submission failed.';
  }finally{if(button) button.disabled=false;}
});

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();
