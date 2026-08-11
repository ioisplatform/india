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
  currentUser=user;

  let result=await client.from('profiles').select('id,user_id,membership_plan,plan_code,amount,status,approval_status').eq('id',user.id).maybeSingle();
  if(!result.data){
    result=await client.from('profiles').select('*').eq('user_id',user.id).maybeSingle();
  }
  if(!result.data){
    $('message').textContent='Member profile नहीं मिला। पहले registration complete करें।';
    return;
  }
  profile=result.data;
  $('amount').value=profile.amount?`₹${Number(profile.amount).toLocaleString('en-IN')}`:(profile.membership_plan||'—');
  const upi=document.getElementById('ioisUpi');
  if(upi) upi.textContent=window.IOIS_CONFIG?.paymentUPI||'8877490845@spicepay';
}

$('paymentForm').addEventListener('submit',async e=>{
  e.preventDefault();
  if(!currentUser||!profile){return;}
  const button=e.submitter||e.target.querySelector('button[type="submit"]');
  if(button) button.disabled=true;
  try{
    const payload={
      user_id:currentUser.id,
      profile_id:profile.id,
      member_id:profile.id,
      amount:profile.amount||null,
      payment_method:$('method').value,
      upi_id:$('upiId').value.trim(),
      transaction_reference:$('transactionReference').value.trim(),
      payment_status:'PENDING'
    };
    let result=await client.from('payments').insert(payload);
    if(result.error){
      const fallback={
        user_id:currentUser.id,
        amount:profile.amount||null,
        payment_method:$('method').value,
        upi_id:$('upiId').value.trim(),
        transaction_reference:$('transactionReference').value.trim(),
        status:'pending'
      };
      result=await client.from('payments').insert(fallback);
    }
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
